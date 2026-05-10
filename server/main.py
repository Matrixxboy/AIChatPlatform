# pyrefly: ignore [missing-import]
import uvicorn
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import socketio
from config import settings
from routes import auth, users, sessions
from database import messages_collection, sessions_collection
from services.translation import translate
from utils.auth import decode_token
from datetime import datetime
from bson import ObjectId
import logging
import time
from fastapi import Request, Response
from fastapi.responses import JSONResponse

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI App
app = FastAPI(title="Biz Insights Multilingual Translator API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = "{0:.2f}".format(process_time)
    logger.info(f"RID: {request.state.__dict__.get('request_id', 'N/A')} | Method: {request.method} | Path: {request.url.path} | Status: {response.status_code} | Time: {formatted_process_time}ms")
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"GLOBAL ERROR: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "An internal server error occurred.", "detail": str(exc)},
    )

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])

# Socket.io Setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

@sio.on('connect')
async def connect(sid, environ, auth):
    if not auth or 'token' not in auth:
        return False # Refuse connection
    
    token = auth['token']
    payload = decode_token(token)
    if not payload:
        return False
    
    user_id = payload.get("userId")
    await sio.save_session(sid, {"userId": user_id})
    await sio.enter_room(sid, f"user_{user_id}")
    logger.info(f"User connected: {user_id} (sid: {sid}) and joined personal room")

@sio.on('join_session')
async def join_session(sid, sessionId):
    session = await sio.get_session(sid)
    user_id = session.get("userId")
    await sio.enter_room(sid, sessionId)
    logger.info(f"User {user_id} joined room: {sessionId}")

@sio.on('join_user_room')
async def join_user_room(sid, data):
    session_data = await sio.get_session(sid)
    user_id = session_data.get("userId")
    await sio.enter_room(sid, f"user_{user_id}")
    logger.info(f"User {user_id} joined personal dashboard room")

@sio.on('send_message')
async def send_message(sid, data):
    session_data = await sio.get_session(sid)
    user_id = session_data.get("userId")
    
    session_id = data.get("sessionId")
    text = data.get("text")
    from_lang = data.get("fromLang")
    domain = data.get("domain", "general")
    
    logger.info(f"Incoming message: {text} from {from_lang} in session {session_id} (User: {user_id})")

    try:
        # 1. Save to DB (without translating initially)
        new_message = {
            "sessionId": session_id,
            "senderId": user_id,
            "originalText": text,
            "fromLang": from_lang,
            "domain": domain,
            "translations": {from_lang: text},
            "confidence": 100,
            "createdAt": datetime.now()
        }
        result = await messages_collection.insert_one(new_message)
        new_message["_id"] = str(result.inserted_id)
        
        # 2. Update session
        await sessions_collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {
                "lastMessage": text,
                "lastMessageTime": datetime.now()
            }}
        )
        
        # 3. Emit to room
        new_message["createdAt"] = new_message["createdAt"].isoformat()
        await sio.emit('receive_message', new_message, room=session_id)
        logger.info(f"Broadcasted message {new_message['_id']} to room {session_id}")

        # 4. Notify participants for Dashboard updates (wrapped to prevent blocking)
        try:
            session_doc = await sessions_collection.find_one({"_id": ObjectId(session_id)})
            if session_doc:
                for p_id in session_doc.get("participants", []):
                    # Ensure p_id is a string for the room name
                    await sio.emit('session_update', {
                        "sessionId": session_id,
                        "lastMessage": text,
                        "lastMessageTime": new_message["createdAt"]
                    }, room=f"user_{str(p_id)}")
                logger.info(f"Dashboard update sent to participants of {session_id}")
        except Exception as dash_err:
            logger.error(f"Dashboard update failed: {str(dash_err)}")
        
    except Exception as e:
        logger.error(f"SOCKET MESSAGE ERROR [Session: {session_id}]: {str(e)}", exc_info=True)
        await sio.emit('error', {"message": "Neural Link transmission failed", "detail": str(e)}, to=sid)

@sio.on('typing')
async def typing(sid, data):
    session_id = data.get("sessionId")
    user_id = data.get("userId")
    await sio.emit('user_typing', {"userId": user_id, "isTyping": True}, room=session_id, skip_sid=sid)

@sio.on('stop_typing')
async def stop_typing(sid, data):
    session_id = data.get("sessionId")
    user_id = data.get("userId")
    await sio.emit('user_typing', {"userId": user_id, "isTyping": False}, room=session_id, skip_sid=sid)

@sio.on('disconnect')
async def disconnect(sid):
    logger.info(f"User disconnected: {sid}")

if __name__ == "__main__":
    uvicorn.run("main:socket_app", host="0.0.0.0", port=settings.PORT, reload=True)
