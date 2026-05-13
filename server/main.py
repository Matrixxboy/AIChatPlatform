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
app = FastAPI(title="Biz Insights Multilingual Translator API", strict_slashes=False)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path="socket.io"
)

@sio.on('connect')
async def connect(sid, environ, auth):
    logger.info(f"Socket connection attempt: {sid}")
    if not auth or 'token' not in auth:
        logger.warning(f"Socket connection refused: Missing token in auth (sid: {sid})")
        return False # Refuse connection
    
    token = auth['token']
    payload = decode_token(token)
    if not payload:
        logger.warning(f"Socket connection refused: Invalid token (sid: {sid})")
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
    session_id = data.get("sessionId")
    text = data.get("text")
    from_lang = data.get("fromLang")
    domain = data.get("domain", "general")
    
    # Get user_id from session
    session_data = await sio.get_session(sid)
    user_id = session_data.get("userId")
    
    if not user_id:
        logger.warning(f"send_message: No user_id in socket session for sid {sid}. Attempting recovery...")
        # Fallback: the frontend can pass userId in data for extra safety in multi-worker environments
        user_id = data.get("userId")
        if not user_id:
            logger.error(f"send_message aborted: Could not identify user for sid {sid}")
            await sio.emit('error', {"message": "Session expired. Please refresh."}, room=sid)
            return

    if not session_id or not text:
        logger.error(f"send_message aborted: Missing session_id or text. Data: {data}")
        return

    logger.info(f"Attempting to save message in session {session_id} from user {user_id}")

    try:
        # 1. Save to Messages Collection
        new_message = {
            "sessionId": str(session_id),
            "senderId": str(user_id),
            "originalText": text,
            "fromLang": from_lang,
            "domain": domain,
            # No translations field here - fulfilling "not the sender sends"
            "status": "sent",
            "createdAt": datetime.utcnow()
        }
        
        result = await messages_collection.insert_one(new_message)
        message_id = str(result.inserted_id)
        new_message["_id"] = message_id
        
        # 2. Update Session (Last Message, Time, and Unhide)
        await sessions_collection.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$set": {
                    "lastMessage": text,
                    "lastMessageTime": new_message["createdAt"],
                    "hiddenFor": [] # Reset hiddenFor so chat reappears for everyone
                }
            }
        )
        
        # 3. Prepare for Emit
        new_message["createdAt"] = new_message["createdAt"].isoformat()
        
        # 4. Broadcast to the room
        await sio.emit('receive_message', new_message, room=session_id)
        logger.info(f"Message {message_id} saved and broadcasted to {session_id}")

        # 5. Notify all participants for Dashboard updates
        try:
            session_doc = await sessions_collection.find_one({"_id": ObjectId(session_id)})
            if session_doc:
                for p_id in session_doc.get("participants", []):
                    await sio.emit('session_update', {
                        "sessionId": session_id,
                        "lastMessage": text,
                        "lastMessageTime": new_message["createdAt"]
                    }, room=f"user_{str(p_id)}")
        except Exception as dash_err:
            logger.error(f"Dashboard update notification failed: {dash_err}")

    except Exception as e:
        logger.error(f"CRITICAL ERROR in send_message: {str(e)}", exc_info=True)
        await sio.emit('error', {"message": "Failed to save message", "detail": str(e)}, room=sid)

@sio.on('typing')
async def typing(sid, data):
    session_id = data.get("sessionId")
    user_id = data.get("userId")
    await sio.emit('user_typing', {"userId": user_id, "isTyping": True}, room=session_id, skip_sid=sid)

@sio.on('mark_seen')
async def mark_seen(sid, data):
    session_id = data.get("sessionId")
    message_id = data.get("messageId")
    user_id = data.get("userId") # The one who SEEN it
    
    logger.info(f"Message {message_id} marked as seen by {user_id}")
    
    try:
        # Update DB
        await messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"status": "seen", "seenAt": datetime.now()}}
        )
        # Broadcast to room
        await sio.emit('message_status_update', {
            "messageId": message_id,
            "status": "seen",
            "sessionId": session_id
        }, room=session_id)
    except Exception as e:
        logger.error(f"Error marking message as seen: {e}")

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
