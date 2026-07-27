import sys
# Reconfigure standard streams to prevent Windows console UnicodeEncodeErrors
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

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
import asyncio


# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI App
app = FastAPI(title="Biz Insights Multilingual Translator API", strict_slashes=False)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
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

from routes import auth, users, sessions, upload, contact, admin

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(contact.router, prefix="/api/contact", tags=["contact"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

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
    session_data = await sio.get_session(sid)
    user_id = session_data.get("userId") if session_data else None
    await sio.enter_room(sid, sessionId)
    logger.info(f"User {user_id} joined room: {sessionId}")
    
    if user_id and sessionId:
        try:
            # 1. Update all messages in this session NOT sent by current user to status "seen"
            await messages_collection.update_many(
                {"sessionId": str(sessionId), "senderId": {"$ne": str(user_id)}, "status": {"$ne": "seen"}},
                {"$set": {"status": "seen", "seenAt": datetime.utcnow()}}
            )
            # 2. Emit status update event to the room so sender gets real-time checkmark updates
            await sio.emit('session_messages_seen', {
                "sessionId": str(sessionId),
                "seenBy": str(user_id)
            }, room=str(sessionId))
        except Exception as e:
            logger.error(f"Error marking messages seen on join_session: {e}")

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
        # Fetch original message translations if this is a reply - fulfilling "look in the user's selected language both"
        reply_to_id = data.get("replyTo")
        reply_to_translations = {}
        if reply_to_id:
            try:
                original_msg = await messages_collection.find_one({"_id": ObjectId(reply_to_id)})
                if original_msg:
                    reply_to_translations = original_msg.get("translations", {})
                    # Include the original language text as well
                    orig_lang = original_msg.get("fromLang", "English")
                    reply_to_translations[orig_lang] = original_msg.get("originalText", original_msg.get("text", ""))
            except Exception as e:
                logger.error(f"Error fetching reply-to message: {e}")

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
            "replyTo": reply_to_id,
            "replyToText": data.get("replyToText"),
            "replyToSender": data.get("replyToSender"),
            "replyToTranslations": reply_to_translations,
            "status": "sent",
            "createdAt": datetime.utcnow()
        }
        
        result = await messages_collection.insert_one(new_message)
        message_id = str(result.inserted_id)
        new_message["_id"] = message_id
        
        # Populate senderName and profileImage
        from database import users_collection
        sender_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
        new_message["senderName"] = sender_doc.get("fullName") or sender_doc.get("name") if sender_doc else "Unknown User"
        new_message["senderProfileImage"] = sender_doc.get("profileImage", "") if sender_doc else ""
        
        # 2. Server-Side Auto-Translation for Receivers - fulfilling "store into the user's selected language"
        translations_map = {from_lang: text} # Include sender's language
        
        try:
            from database import users_collection, activity_logs
            session_doc = await sessions_collection.find_one({"_id": ObjectId(session_id)})
            
            if session_doc:
                participants = session_doc.get("participants", [])
                
                # Gather unique target languages for active participants
                unique_target_languages = []
                for p_id_raw in participants:
                    p_id_str = str(p_id_raw)
                    if p_id_str == str(user_id):
                        continue
                    
                    receiver = await users_collection.find_one({"_id": ObjectId(p_id_str)})
                    if receiver:
                        target_lang = receiver.get("preferredLanguage", "English")
                        if target_lang != from_lang:
                            unique_target_languages.append((p_id_str, target_lang))
                
                # Dynamic translation with cache avoidance/sharing
                translations_cache = {}
                for p_id_str, target_lang in unique_target_languages:
                    if target_lang not in translations_cache:
                        res = await translate(text, from_lang, target_lang, domain)
                        if res and "translation" in res:
                            translations_cache[target_lang] = res["translation"]
                            input_tokens = res.get("input_tokens", 0)
                            output_tokens = res.get("output_tokens", 0)
                            
                            # Log translation activity
                            try:
                                await activity_logs.insert_one({
                                    "userId": str(user_id),
                                    "action": "translation",
                                    "metadata": {
                                        "messageId": message_id,
                                        "fromLang": from_lang,
                                        "targetLang": target_lang,
                                        "inputTokens": input_tokens,
                                        "outputTokens": output_tokens
                                    },
                                    "createdAt": datetime.utcnow()
                                })
                            except Exception as log_err:
                                logger.error(f"Failed to log translation: {log_err}")
                    
                    if target_lang in translations_cache:
                        translated_text = translations_cache[target_lang]
                        translations_map[target_lang] = translated_text
                        
                        # Store in Receiver's DB document
                        await users_collection.update_one(
                            {"_id": ObjectId(p_id_str)},
                            {"$set": {f"translations.{message_id}.{target_lang}": translated_text}}
                        )
                        
                        # ALSO store in the Shared Message Cache
                        await messages_collection.update_one(
                            {"_id": ObjectId(message_id)},
                            {"$set": {f"translations.{target_lang}": translated_text}}
                        )
        except Exception as trans_err:
            logger.error(f"Server-side translation failed: {trans_err}")
 
        # 3. Update Session and User-Specific References
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
            is_group_session = bool(session_doc.get("isGroup", False))
            for p_id_raw in session_doc.get("participants", []):
                p_id_str = str(p_id_raw)
                update_fields = {
                    "isDeleted": False,
                    "updatedAt": datetime.utcnow()
                }
                if not is_group_session:
                    other_p_id = next((str(x) for x in session_doc["participants"] if str(x) != p_id_str), p_id_str)
                    update_fields["otherParticipantId"] = other_p_id
                    update_fields["isGroup"] = False
                else:
                    update_fields["isGroup"] = True
                    
                await user_sessions_collection.update_one(
                    {"userId": p_id_str, "sessionId": str(session_id)},
                    {
                        "$set": update_fields,
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
        
        # 5b. Web Push Notifications (Run in background)
        if session_doc:
            session_name = session_doc.get("groupName") or "New Chat"
            is_group = bool(session_doc.get("isGroup", False))
            participants = session_doc.get("participants", [])
            asyncio.create_task(
                trigger_push_notifications(
                    sender_name=new_message.get("senderName", "User"),
                    session_name=session_name,
                    session_id=str(session_id),
                    is_group=is_group,
                    message_text=text,
                    participants=participants,
                    sender_id=str(user_id),
                    translations_map=translations_map
                )
            )
        
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

async def trigger_push_notifications(sender_name: str, session_name: str, session_id: str, is_group: bool, message_text: str, participants: list, sender_id: str, translations_map: dict):
    from database import users_collection
    import json
    from pywebpush import webpush, WebPushException
    
    for p_id in participants:
        p_id_str = str(p_id)
        if p_id_str == str(sender_id):
            continue
            
        user_doc = await users_collection.find_one({"_id": ObjectId(p_id_str)})
        if not user_doc or "pushSubscriptions" not in user_doc:
            continue
            
        subscriptions = user_doc.get("pushSubscriptions", [])
        if not subscriptions:
            continue
            
        pref_lang = user_doc.get("preferredLanguage", "English")
        body_text = translations_map.get(pref_lang, message_text)
        
        title = session_name if (is_group and session_name) else sender_name
        body = f"{sender_name}: {body_text}" if is_group else body_text
        
        payload = {
            "title": title,
            "body": body,
            "icon": f"{settings.FRONTEND_URL.rstrip('/')}/logo192.png",
            "badge": f"{settings.FRONTEND_URL.rstrip('/')}/logo192.png",
            "data": {
                "sessionId": str(session_id),
                "url": f"{settings.FRONTEND_URL.rstrip('/')}/chat/{session_id}"
            }
        }
        
        expired_endpoints = []
        for sub in subscriptions:
            try:
                await asyncio.to_thread(
                    webpush,
                    subscription_info=sub,
                    data=json.dumps(payload),
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims={"sub": settings.VAPID_ADMIN_EMAIL}
                )
            except WebPushException as ex:
                logger.warning(f"WebPush Exception for user {p_id_str}: {ex}")
                if ex.response is not None and ex.response.status_code in [404, 410]:
                    expired_endpoints.append(sub.get("endpoint"))
            except Exception as e:
                logger.error(f"Failed to send push: {e}")
                
        if expired_endpoints:
            await users_collection.update_one(
                {"_id": ObjectId(p_id_str)},
                {"$pull": {"pushSubscriptions": {"endpoint": {"$in": expired_endpoints}}}}
            )

if __name__ == "__main__":
    uvicorn.run("main:socket_app", host="0.0.0.0", port=settings.PORT, reload=True)
