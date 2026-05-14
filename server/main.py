import uvicorn
from fastapi import FastAPI, Request, Response, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import socketio
from config import settings
from routes import auth, users, sessions, upload
from database import messages_collection, sessions_collection, user_sessions_collection
from services.translation import translate
from utils.auth import decode_token
from datetime import datetime
from bson import ObjectId
import logging
import time
from fastapi.staticfiles import StaticFiles
import os

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI App
app = FastAPI(title="Biz Insights Multilingual Translator API", strict_slashes=False)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])

# Static Files - Serving the public/uploads directory
if not os.path.exists("public/uploads"):
    os.makedirs("public/uploads")
# We mount both with and without prefix to ensure local and live compatibility
app.mount("/ai-chat-platform/public/uploads", StaticFiles(directory="public/uploads"), name="uploads_prefixed")
app.mount("/public/uploads", StaticFiles(directory="public/uploads"), name="uploads")

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
    from_lang = data.get("fromLang", "English")
    domain = data.get("domain", "general")
    
    # Get user_id from socket session
    session_data = await sio.get_session(sid)
    user_id = session_data.get("userId")
    
    if not user_id:
        user_id = data.get("userId")
        if not user_id:
            return

    if not session_id or not text:
        return

    try:
        # 1. Save to Messages Collection
        new_message = {
            "sessionId": str(session_id),
            "senderId": str(user_id),
            "originalText": text,
            "fromLang": from_lang,
            "domain": domain,
            "messageType": data.get("messageType", "text"),
            "fileUrl": data.get("fileUrl"),
            "fileName": data.get("fileName"),
            "replyTo": data.get("replyTo"),
            "replyToText": data.get("replyToText"),
            "replyToSender": data.get("replyToSender"),
            "status": "sent",
            "createdAt": datetime.utcnow()
        }
        
        result = await messages_collection.insert_one(new_message)
        message_id = str(result.inserted_id)
        new_message["_id"] = message_id
        
        # 2. Server-Side Auto-Translation for Receivers - fulfilling "store into the user's selected language"
        translations_map = {from_lang: text} # Include sender's language
        
        try:
            from database import users_collection
            session_doc = await sessions_collection.find_one({"_id": ObjectId(session_id)})
            
            if session_doc:
                participants = session_doc.get("participants", [])
                for p_id_raw in participants:
                    p_id_str = str(p_id_raw)
                    if p_id_str == str(user_id):
                        continue # Skip sender
                    
                    # Get receiver's preferred language
                    receiver = await users_collection.find_one({"_id": ObjectId(p_id_str)})
                    if not receiver:
                        continue
                        
                    target_lang = receiver.get("preferredLanguage", "English")
                    
                    # Only translate if different language
                    if target_lang != from_lang:
                        res = await translate(text, from_lang, target_lang, domain)
                        if res and "translation" in res:
                            translated_text = res["translation"]
                            translations_map[target_lang] = translated_text
                            
                            # Store in Receiver's DB document
                            await users_collection.update_one(
                                {"_id": ObjectId(p_id_str)},
                                {"$set": {f"translations.{message_id}.{target_lang}": translated_text}}
                            )
                            
                            # ALSO store in the Shared Message Cache - fulfilling "Optimize translation costs"
                            await messages_collection.update_one(
                                {"_id": ObjectId(message_id)},
                                {"$set": {f"translations.{target_lang}": translated_text}}
                            )
        except Exception as trans_err:
            logger.error(f"Server-side translation failed: {trans_err}")

        # 3. Update Session and User-Specific References - fulfilling "independent ownership"
        await sessions_collection.update_one(
            {"_id": ObjectId(session_id)},
            {
                "$set": {
                    "lastMessage": text,
                    "lastMessageTime": new_message["createdAt"]
                }
            }
        )
        
        # Ensure all participants have an ACTIVE user_session reference
        if session_doc:
            for p_id_raw in session_doc.get("participants", []):
                p_id_str = str(p_id_raw)
                # Determine who the 'other' person is for this specific participant
                other_p_id = next((str(x) for x in session_doc["participants"] if str(x) != p_id_str), p_id_str)
                
                await user_sessions_collection.update_one(
                    {"userId": p_id_str, "sessionId": str(session_id)},
                    {
                        "$set": {
                            "isDeleted": False, # Re-activate for everyone on new message
                            "otherParticipantId": other_p_id,
                            "updatedAt": datetime.utcnow()
                        },
                        "$setOnInsert": {
                            "createdAt": datetime.utcnow(),
                            "deletedAt": datetime(1970, 1, 1)
                        }
                    },
                    upsert=True
                )
        
        # 4. Prepare for Emit
        new_message["createdAt"] = new_message["createdAt"].isoformat()
        new_message["translations"] = translations_map # Pass all translations to the room
        
        # 5. Broadcast
        await sio.emit('receive_message', new_message, room=session_id)
        
        # 6. Dashboard Updates
        if session_doc:
            for p_id in session_doc.get("participants", []):
                await sio.emit('session_update', {
                    "sessionId": session_id,
                    "lastMessage": text,
                    "lastMessageTime": new_message["createdAt"]
                }, room=f"user_{str(p_id)}")

    except Exception as e:
        logger.error(f"CRITICAL ERROR in send_message: {str(e)}", exc_info=True)
        await sio.emit('error', {"message": "Failed to save message"}, room=sid)

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
