from database import sessions_collection, messages_collection, users_collection, user_sessions_collection
from routes.users import get_current_user_id
from bson import ObjectId
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from services.translation import translate
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(session_data: dict, current_user_id: str = Depends(get_current_user_id)):
    participant_ids = session_data.get("participantIds", [])
    
    # Ensure current user is in participants
    participants = list(set([str(p) for p in participant_ids] + [str(current_user_id)]))
    
    if len(participants) != 2:
        raise HTTPException(status_code=400, detail="Only 1-on-1 sessions are supported in this architecture currently")

    # 1. Find or create Global Session
    global_session = await sessions_collection.find_one({
        "participants": {"$all": participants, "$size": 2}
    })
    
    if not global_session:
        global_session_dict = {
            "participants": participants,
            "createdBy": current_user_id,
            "createdAt": datetime.utcnow(),
            "lastMessage": "",
            "lastMessageTime": datetime.utcnow()
        }
        res = await sessions_collection.insert_one(global_session_dict)
        global_session = global_session_dict
        global_session["_id"] = res.inserted_id

    global_session_id = str(global_session["_id"])

    # 2. Ensure BOTH users have an individual UserSession reference - fulfilling "Store chat data individually"
    for p_id in participants:
        other_id = next((pid for pid in participants if pid != p_id), None)
        await user_sessions_collection.update_one(
            {"userId": p_id, "sessionId": global_session_id},
            {
                "$set": {
                    "otherParticipantId": other_id,
                    "isDeleted": False,
                    "updatedAt": datetime.utcnow()
                },
                "$setOnInsert": {
                    "createdAt": datetime.utcnow(),
                    "deletedAt": datetime(1970, 1, 1)
                }
            },
            upsert=True
        )

    # Return the user's view of the session
    return {
        "_id": global_session_id,
        "participants": participants,
        "name": session_data.get("name") # Temporary, will be dynamic in get_sessions
    }

@router.get("")
async def get_sessions(current_user_id: str = Depends(get_current_user_id)):
    # Fetch from user_sessions - fulfilling "independent chat storage/reference"
    cursor = user_sessions_collection.find({
        "userId": current_user_id,
        "isDeleted": False
    }).sort("updatedAt", -1)
    
    sessions = []
    async for user_sess in cursor:
        sess_id = user_sess["sessionId"]
        other_user_id = user_sess["otherParticipantId"]
        
        # Get actual session details for last message
        global_sess = await sessions_collection.find_one({"_id": ObjectId(sess_id)})
        if not global_sess: continue
        
        # Get other user details for UI
        other_user = await users_collection.find_one({"_id": ObjectId(other_user_id)})
        
        sessions.append({
            "_id": sess_id,
            "name": other_user.get("name") if other_user else "Unknown User",
            "lastMessage": global_sess.get("lastMessage"),
            "lastMessageTime": global_sess.get("lastMessageTime"),
            "otherUser": {
                "_id": other_user_id,
                "name": other_user.get("name") if other_user else "Unknown",
                "profileImage": other_user.get("profileImage") if other_user else ""
            }
        })
    
    return sessions

@router.get("/{session_id}/messages")
async def get_messages(session_id: str, current_user_id: str = Depends(get_current_user_id)):
    # 1. Get the user's specific reference to this session
    user_sess = await user_sessions_collection.find_one({
        "userId": current_user_id,
        "sessionId": session_id
    })
    
    # If no reference, user has no access - fulfilling "independent ownership"
    if not user_sess or user_sess.get("isDeleted"):
        # We don't raise 404 here to allow "empty" view if they just deleted it but session exists
        delete_timestamp = datetime.utcnow() # Treat as fully deleted
    else:
        delete_timestamp = user_sess.get("deletedAt", datetime(1970, 1, 1))

    # 2. Fetch messages created AFTER the user's individual delete timestamp
    cursor = messages_collection.find({
        "sessionId": session_id,
        "createdAt": {"$gt": delete_timestamp}
    }).sort("createdAt", 1)
    
    # Get current user's translations to merge
    user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
    user_translations = user.get("translations", {})

    messages = []
    async for msg in cursor:
        msg_id = str(msg["_id"])
        msg["_id"] = msg_id
        msg["senderId"] = str(msg["senderId"])
        msg["sessionId"] = str(msg["sessionId"])
        
        # Merge translations (shared + private cache)
        shared_translations = msg.get("translations", {})
        user_specific_translations = user_translations.get(msg_id, {})
        msg["translations"] = {**shared_translations, **user_specific_translations}
        
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
        
    # 1. Check for cached translation in Message document (Shared Cache) - fulfilling "Optimize translation costs"
    shared_translations = msg.get("translations", {})
    if to_lang in shared_translations:
        return {"translation": shared_translations[to_lang], "confidence": 100, "cached": True}
        
    # 2. Check for cached translation in User document (User Cache)
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
        
        # Store in both for maximum persistence and future sharing
        await messages_collection.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {f"translations.{to_lang}": translated_text}}
        )
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
        {"_id": ObjectId(message_id)},
        {"$set": {"status": "seen"}}
    )
    return {"message": "Status updated to seen"}

@router.delete("/{session_id}/permanent")
async def delete_session_permanently(session_id: str, current_user_id: str = Depends(get_current_user_id)):
    # 1. Check if session exists and user is part of it
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")
        
    session = await sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if current_user_id is in participants list
    participants = [str(p) for p in session.get("participants", [])]
    if current_user_id not in participants:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")
        
    # 2. Delete all messages associated with this session
    await messages_collection.delete_many({
        "$or": [
            {"sessionId": session_id},
            {"sessionId": ObjectId(session_id)}
        ]
    })
    
    # 3. Delete the session itself
    await sessions_collection.delete_one({"_id": ObjectId(session_id)})
    
    return {"message": "Conversation and all associated messages deleted permanently from the database"}

@router.post("/{session_id}/translate-all")
async def translate_all_messages(session_id: str, data: dict, current_user_id: str = Depends(get_current_user_id)):
    to_lang = data.get("toLang")
    domain = data.get("domain", "general")
    
    if not to_lang:
        raise HTTPException(status_code=400, detail="toLang is required")
        
    # 1. Fetch all messages for this session
    cursor = messages_collection.find({
        "$or": [
            {"sessionId": session_id},
            {"sessionId": ObjectId(session_id) if ObjectId.is_valid(session_id) else None}
        ]
    })
    
    # 2. Get current user's existing translations
    user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
    user_translations = user.get("translations", {})
    
    missing_messages = []
    async for msg in cursor:
        msg_id = str(msg["_id"])
        
        # Check both shared and user cache
        shared_trans = msg.get("translations", {})
        user_trans = user_translations.get(msg_id, {})
        
        if to_lang not in shared_trans and to_lang not in user_trans:
            missing_messages.append({
                "id": msg_id,
                "text": msg.get("originalText") or msg.get("text", "")
            })
            
    if not missing_messages:
        return {"message": "All messages already translated", "count": 0}
        
    # 3. Translate missing messages in batches of 15 - fulfilling "utilise the api call"
    from services.translation import batch_translate
    
    new_translations_map = {}
    chunk_size = 15
    for i in range(0, len(missing_messages), chunk_size):
        chunk = missing_messages[i : i + chunk_size]
        try:
            results = await batch_translate(chunk, to_lang, domain)
            for res in results:
                msg_id = res.get("id")
                trans_text = res.get("translation")
                if msg_id and trans_text:
                    new_translations_map[f"translations.{msg_id}.{to_lang}"] = trans_text
        except Exception as e:
            logger.error(f"Chunk Translation Error: {e}")

    # 4. Update Both Collections in batch
    if new_translations_map:
        # Update User Document
        await users_collection.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": new_translations_map}
        )
        
        # Update Message Documents individually (or in batch if possible)
        for key, text in new_translations_map.items():
            # key is like "translations.MSG_ID.LANG"
            parts = key.split('.')
            m_id = parts[1]
            l_code = parts[2]
            await messages_collection.update_one(
                {"_id": ObjectId(m_id)},
                {"$set": {f"translations.{l_code}": text}}
            )
        
    return {"message": "Batch translation complete", "count": len(new_translations_map)}

@router.delete("/{session_id}")
async def delete_session(session_id: str, current_user_id: str = Depends(get_current_user_id)):
    # Individual Delete Logic - fulfilling "independent chat storage/reference"
    # We mark the UserSession as deleted for THIS user specifically
    now = datetime.utcnow()
    await user_sessions_collection.update_one(
        {"userId": current_user_id, "sessionId": session_id},
        {
            "$set": {
                "isDeleted": True,
                "deletedAt": now,
                "updatedAt": now
            }
        }
    )
    
    # 2. Clear this user's personal translations for this session
    messages_cursor = messages_collection.find({"sessionId": session_id})
    message_ids = []
    async for m in messages_cursor:
        message_ids.append(str(m["_id"]))
        
    if message_ids:
        unset_map = {f"translations.{m_id}": "" for m_id in message_ids}
        await users_collection.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$unset": unset_map}
        )
        
    return {"message": "Chat removed from your dashboard. Other participants still have access to their copies."}

