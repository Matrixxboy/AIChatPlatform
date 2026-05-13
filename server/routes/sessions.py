from fastapi import APIRouter, Depends, HTTPException, status
from database import sessions_collection, messages_collection, users_collection
from models import SessionBase, SessionResponse, MessageResponse
from routes.users import get_current_user_id
from bson import ObjectId
from datetime import datetime
from typing import List
from services.translation import translate
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(session_data: dict, current_user_id: str = Depends(get_current_user_id)):
    name = session_data.get("name")
    participant_ids = session_data.get("participantIds", [])
    
    # Ensure current user is in participants
    participants = list(set(participant_ids + [current_user_id]))
    
    # Check for existing 1-on-1 session
    if len(participants) == 2:
        existing = await sessions_collection.find_one({
            "participants": {"$all": participants, "$size": 2}
        })
        if existing:
            # Unhide for the current user
            await sessions_collection.update_one(
                {"_id": existing["_id"]},
                {"$pull": {"hiddenFor": current_user_id}}
            )
            existing["_id"] = str(existing["_id"])
            return existing

    session_dict = {
        "name": name,
        "participants": participants,
        "createdBy": current_user_id,
        "lastMessage": "",
        "lastMessageTime": datetime.utcnow(),
        "createdAt": datetime.utcnow(),
        "hiddenFor": []
    }
    
    result = await sessions_collection.insert_one(session_dict)
    session_dict["_id"] = str(result.inserted_id)
    
    return session_dict

@router.get("")
async def get_sessions(current_user_id: str = Depends(get_current_user_id)):
    # Filter sessions where user is a participant AND has not hidden the session
    # We check for both string and ObjectId to be safe in live environments
    cursor = sessions_collection.find({
        "$or": [
            {"participants": current_user_id},
            {"participants": ObjectId(current_user_id) if ObjectId.is_valid(current_user_id) else None}
        ],
        "hiddenFor": {"$ne": current_user_id}
    }).sort("lastMessageTime", -1)
    
    sessions = []
    async for session in cursor:
        session["_id"] = str(session["_id"])
        
        # WhatsApp-style dynamic naming: Use the other participant's name for 1-on-1 chats
        participants = session.get("participants", [])
        if len(participants) == 2:
            # Ensure we compare as strings to avoid ObjectId vs String mismatches
            other_user_id = next((p for p in participants if str(p) != str(current_user_id)), None)
            if other_user_id:
                other_user = await users_collection.find_one({"_id": ObjectId(other_user_id)})
                if other_user:
                    session["name"] = other_user.get("name")
                    session["otherUser"] = {
                        "_id": str(other_user["_id"]),
                        "name": other_user.get("name"),
                        "username": other_user.get("username"),
                        "bio": other_user.get("bio", ""),
                        "profileImage": other_user.get("profileImage", "")
                    }
        
        sessions.append(session)
    
    return sessions

@router.get("/{session_id}/messages")
async def get_messages(session_id: str, current_user_id: str = Depends(get_current_user_id)):
    # Verify participation (check both string and ObjectId formats)
    session = await sessions_collection.find_one({
        "_id": ObjectId(session_id),
        "$or": [
            {"participants": current_user_id},
            {"participants": ObjectId(current_user_id) if ObjectId.is_valid(current_user_id) else None}
        ]
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Search messages by sessionId (handle both string and ObjectId if necessary)
    cursor = messages_collection.find({
        "$or": [
            {"sessionId": session_id},
            {"sessionId": ObjectId(session_id) if ObjectId.is_valid(session_id) else None}
        ]
    }).sort("createdAt", 1)
    
    # Get current user's translations to merge
    user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
    user_translations = user.get("translations", {})

    messages = []
    async for msg in cursor:
        msg_id = str(msg["_id"])
        msg["_id"] = msg_id
        # Ensure all IDs are strings for the frontend
        if "senderId" in msg:
            msg["senderId"] = str(msg["senderId"])
        if "sessionId" in msg:
            msg["sessionId"] = str(msg["sessionId"])
        
        # Ensure status field exists
        if "status" not in msg:
            msg["status"] = "sent"
            
        # Merge user-specific translations - fulfilling "store in the user"
        msg["translations"] = user_translations.get(msg_id, {})
        
        # Also include the original language if it's the sender's own message
        if str(msg.get("senderId")) == str(current_user_id):
            msg["translations"][msg.get("fromLang", "English")] = msg.get("originalText")

        messages.append(msg)
    
    return messages

@router.post("/messages/{message_id}/translate")
async def translate_message(message_id: str, data: dict, current_user_id: str = Depends(get_current_user_id)):
    to_lang = data.get("toLang")
    domain = data.get("domain", "general")
    
    if not to_lang:
        raise HTTPException(status_code=400, detail="toLang is required")
        
    if not ObjectId.is_valid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message ID format")
        
    msg = await messages_collection.find_one({"_id": ObjectId(message_id)})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    # Get user document to check for cached translation - fulfilling "store in the user"
    user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
    user_translations = user.get("translations", {})
    
    if message_id in user_translations and to_lang in user_translations[message_id]:
        return {"translation": user_translations[message_id][to_lang], "confidence": 100, "cached": True}
        
    # Translate using the existing service
    original_text = msg.get("originalText")
    from_lang = msg.get("fromLang", "English")
    
    try:
        result = await translate(original_text, from_lang, to_lang, domain)
        if not result or "translation" not in result:
            return {"translation": original_text, "confidence": 0, "cached": False, "error": "Translation failed"}
            
        translated_text = result["translation"]
        
        # Store in User's document - fulfilling "store in the user"
        await users_collection.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {f"translations.{message_id}.{to_lang}": translated_text}}
        )
        
        return {"translation": translated_text, "confidence": result.get("confidence", 90), "cached": False}
    except Exception as e:
        logger.error(f"Translation Endpoint Error: {str(e)}", exc_info=True)
        return {"translation": original_text, "confidence": 0, "cached": False, "error": str(e)}

@router.post("/messages/{message_id}/seen")
async def mark_message_seen(message_id: str, current_user_id: str = Depends(get_current_user_id)):
    await messages_collection.update_one(
        {"_id": ObjectId(message_id), "senderId": {"$ne": current_user_id}},
        {"$set": {"status": "seen", "seenAt": datetime.now()}}
    )
    return {"message": "Status updated to seen"}

@router.delete("/{session_id}")
async def delete_session(session_id: str, current_user_id: str = Depends(get_current_user_id)):
    # Instead of deleting, we add the user to 'hiddenFor' array
    result = await sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$addToSet": {"hiddenFor": current_user_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {"message": "Chat deleted successfully for you"}

