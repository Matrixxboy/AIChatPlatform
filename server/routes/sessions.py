from database import sessions_collection, messages_collection, users_collection, user_sessions_collection
from routes.users import get_current_user_id
from bson import ObjectId
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from services.translation import translate
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

async def insert_system_message(session_id: str, text: str):
    new_message = {
        "sessionId": str(session_id),
        "senderId": "system",
        "senderName": "System",
        "originalText": text,
        "fromLang": "English",
        "domain": "general",
        "messageType": "system",
        "status": "sent",
        "createdAt": datetime.utcnow(),
        "translations": {}
    }
    res = await messages_collection.insert_one(new_message)
    new_message["_id"] = str(res.inserted_id)
    try:
        from main import sio
        await sio.emit("receive_message", new_message, room=str(session_id))
    except Exception as e:
        logger.error(f"Failed to broadcast system message: {e}")

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(session_data: dict, current_user_id: str = Depends(get_current_user_id)):
    participant_ids = session_data.get("participantIds", [])
    is_group = bool(session_data.get("isGroup", False))
    group_name = session_data.get("groupName", session_data.get("name", "New Group"))
    
    # Ensure current user is in participants
    participants = list(set([str(p) for p in participant_ids] + [str(current_user_id)]))
    
    if not is_group:
        if len(participants) != 2:
            raise HTTPException(status_code=400, detail="Only 1-on-1 sessions are supported in this mode")
            
        # Find or create Global Session
        global_session = await sessions_collection.find_one({
            "participants": {"$all": participants, "$size": 2},
            "isGroup": {"$ne": True}
        })
        
        if not global_session:
            global_session_dict = {
                "participants": participants,
                "createdBy": current_user_id,
                "createdAt": datetime.utcnow(),
                "lastMessage": "",
                "lastMessageTime": datetime.utcnow(),
                "isGroup": False
            }
            res = await sessions_collection.insert_one(global_session_dict)
            global_session = global_session_dict
            global_session["_id"] = res.inserted_id
            
        global_session_id = str(global_session["_id"])
        
        # Ensure BOTH users have an individual UserSession reference
        for p_id in participants:
            other_id = next((pid for pid in participants if pid != p_id), None)
            await user_sessions_collection.update_one(
                {"userId": p_id, "sessionId": global_session_id},
                {
                    "$set": {
                        "otherParticipantId": other_id,
                        "isDeleted": False,
                        "isGroup": False,
                        "updatedAt": datetime.utcnow()
                    },
                    "$setOnInsert": {
                        "createdAt": datetime.utcnow(),
                        "deletedAt": datetime(1970, 1, 1)
                    }
                },
                upsert=True
            )
    else:
        # Create a new Group Session
        global_session_dict = {
            "participants": participants,
            "createdBy": current_user_id,
            "createdAt": datetime.utcnow(),
            "lastMessage": "",
            "lastMessageTime": datetime.utcnow(),
            "isGroup": True,
            "groupName": group_name,
            "admins": [current_user_id]
        }
        res = await sessions_collection.insert_one(global_session_dict)
        global_session_id = str(res.inserted_id)
        
        # Ensure ALL group members have an individual UserSession reference
        for p_id in participants:
            await user_sessions_collection.update_one(
                {"userId": p_id, "sessionId": global_session_id},
                {
                    "$set": {
                        "isDeleted": False,
                        "isGroup": True,
                        "updatedAt": datetime.utcnow()
                    },
                    "$setOnInsert": {
                        "createdAt": datetime.utcnow(),
                        "deletedAt": datetime(1970, 1, 1)
                    }
                },
                upsert=True
            )

        # Insert system message for group creation
        creator_doc = await users_collection.find_one({"_id": ObjectId(current_user_id)})
        creator_name = creator_doc.get("fullName") or creator_doc.get("name") if creator_doc else "User"
        await insert_system_message(global_session_id, f"{creator_name} created the group \"{group_name}\"")
            
    return {
        "_id": global_session_id,
        "participants": participants,
        "isGroup": is_group,
        "admins": [current_user_id] if is_group else [],
        "name": group_name if is_group else None
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
        # Fallback if otherParticipantId is missing - fulfilling "security and maintain both user"
        other_user_id = user_sess.get("otherParticipantId")
        
        # Get actual session details
        global_sess = await sessions_collection.find_one({"_id": ObjectId(sess_id)})
        if not global_sess: continue
        
        # Count unread messages in this session
        unread_count = await messages_collection.count_documents({
            "sessionId": sess_id,
            "senderId": {"$ne": current_user_id},
            "status": {"$ne": "seen"}
        })
        
        # Check if it is a group session
        if global_sess.get("isGroup") or user_sess.get("isGroup"):
            sessions.append({
                "_id": sess_id,
                "isGroup": True,
                "name": global_sess.get("groupName", "Group Chat"),
                "lastMessage": global_sess.get("lastMessage"),
                "lastMessageTime": global_sess.get("lastMessageTime"),
                "participants": [str(p) for p in global_sess.get("participants", [])],
                "admins": [str(a) for a in global_sess.get("admins", [])],
                "unreadCount": unread_count,
                "otherUser": None
            })
            continue

        # Fallback if otherParticipantId is missing - fulfilling "security and maintain both user"
        other_user_id = user_sess.get("otherParticipantId")
        if not other_user_id:
            other_user_id = next((p for p in global_sess.get("participants", []) if str(p) != str(current_user_id)), None)
        
        if not other_user_id: continue

        # Get other user details for UI
        other_user = await users_collection.find_one({"_id": ObjectId(other_user_id)})
        
        sessions.append({
            "_id": sess_id,
            "isGroup": False,
            "name": other_user.get("fullName") or other_user.get("name") if other_user else "Unknown User",
            "lastMessage": global_sess.get("lastMessage"),
            "lastMessageTime": global_sess.get("lastMessageTime"),
            "unreadCount": unread_count,
            "otherUser": {
                "_id": str(other_user_id),
                "name": other_user.get("fullName") or other_user.get("name") if other_user else "Unknown",
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
    
    # Check if user is in the session even without a user_session reference (group or old sessions)
    global_sess = await sessions_collection.find_one({"_id": ObjectId(session_id)})
    
    if user_sess and user_sess.get("isDeleted"):
        # User explicitly deleted their copy - show nothing
        delete_timestamp = datetime.utcnow()
    elif user_sess:
        delete_timestamp = user_sess.get("deletedAt", datetime(1970, 1, 1))
    elif global_sess:
        # No user_sess record yet but session exists - check if user is a participant
        participants = [str(p) for p in global_sess.get("participants", [])]
        if current_user_id in participants:
            delete_timestamp = datetime(1970, 1, 1)  # Show all messages
        else:
            delete_timestamp = datetime.utcnow()  # Not a participant - show nothing
    else:
        delete_timestamp = datetime.utcnow()  # Session doesn't exist

    # 2. Fetch messages created AFTER the user's individual delete timestamp
    cursor = messages_collection.find({
        "sessionId": session_id,
        "createdAt": {"$gt": delete_timestamp}
    }).sort("createdAt", 1)
    
    # Get current user's translations to merge
    user = await users_collection.find_one({"_id": ObjectId(current_user_id)})
    user_translations = user.get("translations", {}) if user else {}

    messages = []
    async for msg in cursor:
        msg_id = str(msg["_id"])
        msg["_id"] = msg_id
        
        sender_id_str = str(msg.get("senderId", ""))
        msg["senderId"] = sender_id_str
        msg["sessionId"] = str(msg.get("sessionId", ""))
        
        # Populate senderName and profileImage safely
        if sender_id_str == "system" or not ObjectId.is_valid(sender_id_str):
            msg["senderName"] = "System"
            msg["senderProfileImage"] = ""
        else:
            sender_doc = await users_collection.find_one({"_id": ObjectId(sender_id_str)})
            msg["senderName"] = sender_doc.get("fullName") or sender_doc.get("name") if sender_doc else "Unknown User"
            msg["senderProfileImage"] = sender_doc.get("profileImage", "") if sender_doc else ""
        
        # Merge translations (shared + private cache)
        shared_translations = msg.get("translations", {})
        user_specific_translations = user_translations.get(msg_id, {}) if user_translations else {}
        msg["translations"] = {**shared_translations, **user_specific_translations}
        
        if sender_id_str == str(current_user_id):
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
            batch_res = await batch_translate(chunk, to_lang, domain)
            results = batch_res.get("translations", [])
            input_tokens = batch_res.get("input_tokens", 0)
            output_tokens = batch_res.get("output_tokens", 0)
            
            # Log translation activity for batch
            try:
                from database import activity_logs
                await activity_logs.insert_one({
                    "userId": str(current_user_id),
                    "action": "translation",
                    "metadata": {
                        "batchSize": len(chunk),
                        "targetLang": to_lang,
                        "inputTokens": input_tokens,
                        "outputTokens": output_tokens,
                        "isBatch": True
                    },
                    "createdAt": datetime.utcnow()
                })
            except Exception as log_err:
                logger.error(f"Failed to log batch translation activity: {log_err}")

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

@router.get("/{session_id}/members")
async def get_session_members(session_id: str, current_user_id: str = Depends(get_current_user_id)):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")
    session = await sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    participants = [str(p) for p in session.get("participants", [])]
    if current_user_id not in participants:
        raise HTTPException(status_code=403, detail="Not a participant in this group")
        
    members = []
    for p_id in participants:
        user = await users_collection.find_one({"_id": ObjectId(p_id)})
        if user:
            members.append({
                "_id": str(user["_id"]),
                "name": user.get("fullName") or user.get("name") or "User",
                "email": user.get("email"),
                "preferredLanguage": user.get("preferredLanguage", "English"),
                "isAdmin": p_id in session.get("admins", [])
            })
    return members

@router.post("/{session_id}/members")
async def add_session_members(session_id: str, data: dict, current_user_id: str = Depends(get_current_user_id)):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")
    session = await sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Restrict to admins only
    admins = [str(a) for a in session.get("admins", [])]
    if current_user_id not in admins:
        raise HTTPException(status_code=403, detail="Only group admins can add members to this group")
        
    participants = [str(p) for p in session.get("participants", [])]
    new_member_ids = data.get("userIds", [])
    if not new_member_ids:
        raise HTTPException(status_code=400, detail="userIds list is required")
        
    # Ensure we append new members
    updated_participants = list(set(participants + [str(u) for u in new_member_ids]))
    
    await sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"participants": updated_participants}}
    )
    
    # Upsert user_sessions references for new participants
    for p_id in new_member_ids:
        await user_sessions_collection.update_one(
            {"userId": str(p_id), "sessionId": session_id},
            {
                "$set": {
                   "isDeleted": False,
                   "isGroup": True,
                   "updatedAt": datetime.utcnow()
                },
                "$setOnInsert": {
                    "createdAt": datetime.utcnow(),
                    "deletedAt": datetime(1970, 1, 1)
                }
            },
            upsert=True
        )

    # Insert system messages for added members
    admin_doc = await users_collection.find_one({"_id": ObjectId(current_user_id)})
    admin_name = admin_doc.get("fullName") or admin_doc.get("name") if admin_doc else "Admin"
    for p_id in new_member_ids:
        user_doc = await users_collection.find_one({"_id": ObjectId(p_id)})
        user_name = user_doc.get("fullName") or user_doc.get("name") if user_doc else "User"
        await insert_system_message(session_id, f"{admin_name} added {user_name} to the group")
        
    return {"message": "Members added successfully", "participants": updated_participants}

@router.delete("/{session_id}/members/{user_id}")
async def remove_session_member(session_id: str, user_id: str, current_user_id: str = Depends(get_current_user_id)):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID")
    session = await sessions_collection.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    participants = [str(p) for p in session.get("participants", [])]
    if current_user_id not in participants:
        raise HTTPException(status_code=403, detail="Not a participant in this group")
        
    # Allow user to leave group, OR if admin, remove other user
    if current_user_id != user_id and current_user_id not in session.get("admins", []):
        raise HTTPException(status_code=403, detail="Only admins can remove other members")
        
    if user_id not in participants:
        raise HTTPException(status_code=404, detail="Member not in group")
        
    # Remove participant
    participants.remove(user_id)
    
    # Update session
    await sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"participants": participants}}
    )
    
    # Soft delete this user's user_session
    await user_sessions_collection.update_one(
        {"userId": user_id, "sessionId": session_id},
        {
            "$set": {
                "isDeleted": True,
                "deletedAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
        }
    )

    # Insert system message for removing/leaving member
    remover_doc = await users_collection.find_one({"_id": ObjectId(current_user_id)})
    remover_name = remover_doc.get("fullName") or remover_doc.get("name") if remover_doc else "User"
    removed_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    removed_name = removed_doc.get("fullName") or removed_doc.get("name") if removed_doc else "User"
    
    if current_user_id == user_id:
        await insert_system_message(session_id, f"{removed_name} left the group")
    else:
        await insert_system_message(session_id, f"{remover_name} removed {removed_name} from the group")
        
    return {"message": "Member removed successfully", "participants": participants}

