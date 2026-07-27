from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from database import db, users_collection, sessions_collection, messages_collection, contacts_collection, activity_logs
from utils.auth import get_password_hash, decode_token
from routes.users import get_current_admin
from bson import ObjectId
from datetime import datetime, timedelta
import io
import csv
from typing import List, Optional

router = APIRouter()

# Collection declarations
admin_logs = db.get_collection("admin_logs")
login_history = db.get_collection("login_history")

# Helpers for logging
async def log_activity(user_id: str, action: str, metadata: dict = None, ip: str = None):
    try:
        await activity_logs.insert_one({
            "userId": user_id,
            "action": action,
            "metadata": metadata or {},
            "ip": ip,
            "createdAt": datetime.utcnow()
        })
    except Exception as e:
        print(f"Error logging activity: {e}")

async def log_admin_action(admin_id: str, target_user_id: str, action: str, old_data: dict = None, new_data: dict = None):
    try:
        await admin_logs.insert_one({
            "adminId": admin_id,
            "targetUserId": target_user_id,
            "action": action,
            "oldData": old_data,
            "newData": new_data,
            "createdAt": datetime.utcnow()
        })
    except Exception as e:
        print(f"Error logging admin action: {e}")

# 5. Admin Dashboard Stats
@router.get("/dashboard")
async def get_admin_dashboard(current_admin_id: str = Depends(get_current_admin)):
    total_users = await users_collection.count_documents({"isDeleted": {"$ne": True}})
    blocked_users = await users_collection.count_documents({"isBlocked": True, "isDeleted": {"$ne": True}})
    admin_count = await users_collection.count_documents({"role": "admin", "isDeleted": {"$ne": True}})
    
    # Active users: users with activity in last 24 hours
    since_24h = datetime.utcnow() - timedelta(hours=24)
    active_users = await users_collection.count_documents({
        "isDeleted": {"$ne": True},
        "isBlocked": {"$ne": True},
        "$or": [
            {"lastSeen": {"$gte": since_24h}},
            {"lastLogin": {"$gte": since_24h}}
        ]
    })
    
    # New users: registered in the last 7 days
    since_7d = datetime.utcnow() - timedelta(days=7)
    new_users = await users_collection.count_documents({
        "isDeleted": {"$ne": True},
        "_id": {"$gte": ObjectId.from_datetime(since_7d)}
    })
    
    total_sessions = await sessions_collection.count_documents({})
    total_messages = await messages_collection.count_documents({})
    total_contacts = await contacts_collection.count_documents({})
    
    # Calculate overall AI translation token usage and billing
    pipeline = [
        {"$match": {"action": "translation"}},
        {"$group": {
            "_id": None,
            "totalInputTokens": {"$sum": {"$ifNull": ["$metadata.inputTokens", 0]}},
            "totalOutputTokens": {"$sum": {"$ifNull": ["$metadata.outputTokens", 0]}}
        }}
    ]
    cursor = activity_logs.aggregate(pipeline)
    token_stats = {"totalInputTokens": 0, "totalOutputTokens": 0}
    async for doc in cursor:
        token_stats["totalInputTokens"] = doc.get("totalInputTokens", 0)
        token_stats["totalOutputTokens"] = doc.get("totalOutputTokens", 0)
        
    in_cost_usd = (token_stats["totalInputTokens"] * 0.15) / 1000000.0
    out_cost_usd = (token_stats["totalOutputTokens"] * 0.60) / 1000000.0
    total_cost_inr = round((in_cost_usd + out_cost_usd) * 95.86, 4)
    
    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "blockedUsers": blocked_users,
        "adminCount": admin_count,
        "newUsers": new_users,
        "totalSessions": total_sessions,
        "totalMessages": total_messages,
        "totalContacts": total_contacts,
        "totalInputTokens": token_stats["totalInputTokens"],
        "totalOutputTokens": token_stats["totalOutputTokens"],
        "totalCostINR": total_cost_inr
    }

# 6. User Management - List Users
@router.get("/users")
async def list_users(
    page_index: int = Query(1, alias="page_index"),
    page_size: int = Query(10, alias="page_size"),
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None, # "blocked", "active", "deleted"
    language: Optional[str] = None,
    sort: Optional[str] = "username_asc",
    current_admin_id: str = Depends(get_current_admin)
):
    query = {}
    
    # Exclude deleted users unless specifically queried or default
    if status == "deleted":
        query["isDeleted"] = True
    else:
        query["isDeleted"] = {"$ne": True}
        
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}}
        ]
        
    if role:
        query["role"] = role
        
    if status == "blocked":
        query["isBlocked"] = True
    elif status == "active":
        query["isBlocked"] = {"$ne": True}
        
    if language:
        query["preferredLanguage"] = {"$regex": language, "$options": "i"}
        
    # Sort
    sort_fields = []
    if sort == "username_asc":
        sort_fields.append(("username", 1))
    elif sort == "username_desc":
        sort_fields.append(("username", -1))
    elif sort == "lastLogin_desc":
        sort_fields.append(("lastLogin", -1))
    elif sort == "createdAt_desc":
        sort_fields.append(("_id", -1))
    elif sort == "createdAt_asc":
        sort_fields.append(("_id", 1))
    else:
        sort_fields.append(("username", 1))
        
    total = await users_collection.count_documents(query)
    
    cursor = users_collection.find(query).sort(sort_fields).skip((page_index - 1) * page_size).limit(page_size)
    users = []
    async for u in cursor:
        users.append({
            "_id": str(u["_id"]),
            "username": u["username"],
            "name": u["name"],
            "email": u.get("email", ""),
            "role": u.get("role", "user"),
            "preferredLanguage": u.get("preferredLanguage", "English"),
            "isBlocked": u.get("isBlocked", False),
            "lastLogin": u.get("lastLogin"),
            "lastSeen": u.get("lastSeen"),
            "bio": u.get("bio", ""),
            "profileImage": u.get("profileImage", "")
        })
        
    return {
        "users": users,
        "total": total,
        "page_index": page_index,
        "page_size": page_size,
        "totalPages": (total + page_size - 1) // page_size
    }

# 6. User Management - Add User
@router.post("/users")
async def add_user(data: dict, current_admin_id: str = Depends(get_current_admin)):
    username = data.get("username", "").strip().lower()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    name = data.get("name", "").strip()
    role = data.get("role", "user")
    preferredLanguage = data.get("preferredLanguage", "English")
    
    if not username or not password or not name:
        raise HTTPException(status_code=400, detail="Username, password, and name are required")
        
    existing = await users_collection.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
        
    hashed_password = get_password_hash(password)
    
    new_user = {
        "username": username,
        "email": email,
        "password": hashed_password,
        "name": name,
        "role": role,
        "preferredLanguage": preferredLanguage,
        "isBlocked": False,
        "isDeleted": False,
        "failedLoginAttempts": 0,
        "createdAt": datetime.utcnow()
    }
    
    res = await users_collection.insert_one(new_user)
    user_id = str(res.inserted_id)
    
    await log_admin_action(current_admin_id, user_id, "add_user", new_data={"username": username, "role": role})
    
    return {"message": "User created successfully", "userId": user_id}

# 6. User Management - View User Details
@router.get("/users/{user_id}")
async def view_user(user_id: str, current_admin_id: str = Depends(get_current_admin)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "_id": str(user["_id"]),
        "username": user["username"],
        "name": user["name"],
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "preferredLanguage": user.get("preferredLanguage", "English"),
        "bio": user.get("bio", ""),
        "profileImage": user.get("profileImage", ""),
        "isBlocked": user.get("isBlocked", False),
        "blockedAt": user.get("blockedAt"),
        "blockedBy": user.get("blockedBy"),
        "blockReason": user.get("blockReason", ""),
        "isDeleted": user.get("isDeleted", False),
        "deletedAt": user.get("deletedAt"),
        "deletedBy": user.get("deletedBy"),
        "lastLogin": user.get("lastLogin"),
        "lastSeen": user.get("lastSeen"),
        "createdAt": user.get("createdAt", user["_id"].generation_time)
    }

# 6. User Management - Edit User
@router.patch("/users/{user_id}")
async def edit_user(user_id: str, data: dict, current_admin_id: str = Depends(get_current_admin)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    editable_fields = ["name", "username", "email", "bio", "preferredLanguage", "profileImage"]
    update_data = {k: v for k, v in data.items() if k in editable_fields}
    
    if "username" in update_data:
        update_data["username"] = update_data["username"].strip().lower()
        if update_data["username"] != user["username"]:
            dup = await users_collection.find_one({"username": update_data["username"]})
            if dup:
                raise HTTPException(status_code=400, detail="Username already exists")
                
    if not update_data:
        raise HTTPException(status_code=400, detail="No editable fields provided")
        
    update_data["updatedAt"] = datetime.utcnow()
    
    await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    old_data = {k: user.get(k) for k in update_data.keys()}
    await log_admin_action(current_admin_id, user_id, "edit_user", old_data=old_data, new_data=update_data)
    
    return {"message": "User updated successfully"}

# 6. User Management - Soft Delete User
@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_admin_id: str = Depends(get_current_admin)):
    if user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if last admin
    if user.get("role") == "admin":
        admin_count = await users_collection.count_documents({"role": "admin", "isDeleted": {"$ne": True}})
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin")
            
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "isDeleted": True,
            "deletedBy": current_admin_id,
            "deletedAt": datetime.utcnow()
        }}
    )
    
    await log_admin_action(current_admin_id, user_id, "delete_user")
    return {"message": "User soft deleted successfully"}

# 7. Role Management
@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, data: dict, current_admin_id: str = Depends(get_current_admin)):
    new_role = data.get("role")
    if new_role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
        
    if user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
        
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.get("role") == "admin" and new_role == "user":
        # Check if last admin
        admin_count = await users_collection.count_documents({"role": "admin", "isDeleted": {"$ne": True}})
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last admin")
            
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": new_role, "updatedAt": datetime.utcnow()}}
    )
    
    await log_admin_action(current_admin_id, user_id, "role_change", old_data={"role": user.get("role")}, new_data={"role": new_role})
    return {"message": f"Role updated to {new_role} successfully"}

# 8. Block / Unblock User
@router.patch("/users/{user_id}/block")
async def block_user(user_id: str, data: dict, current_admin_id: str = Depends(get_current_admin)):
    reason = data.get("reason", "").strip()
    if user_id == current_admin_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
        
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Admins cannot be blocked")
        
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "isBlocked": True,
            "blockedBy": current_admin_id,
            "blockedAt": datetime.utcnow(),
            "blockReason": reason
        }}
    )
    
    await log_admin_action(current_admin_id, user_id, "block", new_data={"reason": reason})
    return {"message": "User blocked successfully"}

@router.patch("/users/{user_id}/unblock")
async def unblock_user(user_id: str, current_admin_id: str = Depends(get_current_admin)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "isBlocked": False,
            "blockedBy": None,
            "blockedAt": None,
            "blockReason": ""
        }}
    )
    
    await log_admin_action(current_admin_id, user_id, "unblock")
    return {"message": "User unblocked successfully"}

# 9. Password Reset
@router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: str, data: dict, current_admin_id: str = Depends(get_current_admin)):
    new_password = data.get("password")
    if not new_password or len(new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")
        
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    hashed_password = get_password_hash(new_password)
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed_password, "updatedAt": datetime.utcnow()}}
    )
    
    await log_admin_action(current_admin_id, user_id, "reset_password")
    return {"message": "Password reset successfully"}

# 10. User Activity Timeline
@router.get("/users/{user_id}/activity")
async def get_user_activity(user_id: str, current_admin_id: str = Depends(get_current_admin)):
    cursor = activity_logs.find({"userId": user_id}).sort([("createdAt", -1)]).limit(100)
    logs = []
    async for doc in cursor:
        logs.append({
            "action": doc["action"],
            "metadata": doc.get("metadata", {}),
            "ip": doc.get("ip"),
            "createdAt": doc["createdAt"]
        })
    return logs

# 12. User Statistics
@router.get("/users/{user_id}/stats")
async def get_user_stats(user_id: str, current_admin_id: str = Depends(get_current_admin)):
    messages_sent = await messages_collection.count_documents({"senderId": user_id})
    
    sessions_count = await sessions_collection.count_documents({
        "$or": [{"creatorId": user_id}, {"participantIds": user_id}]
    })
    
    translations = await activity_logs.count_documents({"userId": user_id, "action": "translation"})
    uploads = await activity_logs.count_documents({"userId": user_id, "action": "upload"})
    
    # Calculate user's specific token usage and cost
    pipeline = [
        {"$match": {"userId": user_id, "action": "translation"}},
        {"$group": {
            "_id": None,
            "totalInputTokens": {"$sum": {"$ifNull": ["$metadata.inputTokens", 0]}},
            "totalOutputTokens": {"$sum": {"$ifNull": ["$metadata.outputTokens", 0]}}
        }}
    ]
    cursor = activity_logs.aggregate(pipeline)
    token_stats = {"totalInputTokens": 0, "totalOutputTokens": 0}
    async for doc in cursor:
        token_stats["totalInputTokens"] = doc.get("totalInputTokens", 0)
        token_stats["totalOutputTokens"] = doc.get("totalOutputTokens", 0)
        
    in_cost_usd = (token_stats["totalInputTokens"] * 0.15) / 1000000.0
    out_cost_usd = (token_stats["totalOutputTokens"] * 0.60) / 1000000.0
    cost_inr = round((in_cost_usd + out_cost_usd) * 95.86, 4)
    
    return {
        "messagesSent": messages_sent,
        "sessionsCount": sessions_count,
        "translationsCount": translations,
        "uploadsCount": uploads,
        "inputTokens": token_stats["totalInputTokens"],
        "outputTokens": token_stats["totalOutputTokens"],
        "costINR": cost_inr
    }

# 13. Dashboard Analytics
@router.get("/analytics")
async def get_dashboard_analytics(current_admin_id: str = Depends(get_current_admin)):
    today = datetime.utcnow()
    user_growth = []
    messages_growth = []
    
    for i in range(6, -1, -1):
        day_start = datetime(today.year, today.month, today.day) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        
        user_cnt = await users_collection.count_documents({
            "isDeleted": {"$ne": True},
            "createdAt": {
                "$gte": day_start,
                "$lt": day_end
            }
        })
        user_growth.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": user_cnt
        })
        
        msg_cnt = await messages_collection.count_documents({
            "createdAt": {
                "$gte": day_start,
                "$lt": day_end
            }
        })
        messages_growth.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": msg_cnt
        })
        
    pipeline = [
        {"$match": {"isDeleted": {"$ne": True}}},
        {"$group": {"_id": "$preferredLanguage", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_languages = []
    async for doc in users_collection.aggregate(pipeline):
        if doc["_id"]:
            top_languages.append({
                "language": doc["_id"],
                "count": doc["count"]
            })
            
    return {
        "userGrowth": user_growth,
        "messageGrowth": messages_growth,
        "topLanguages": top_languages
    }

# 14. Bulk Operations
@router.post("/users/bulk-block")
async def bulk_block(data: dict, current_admin_id: str = Depends(get_current_admin)):
    user_ids = data.get("userIds", [])
    reason = data.get("reason", "").strip()
    
    object_ids = [ObjectId(uid) for uid in user_ids if uid != current_admin_id]
    
    await users_collection.update_many(
        {"_id": {"$in": object_ids}, "role": {"$ne": "admin"}},
        {"$set": {
            "isBlocked": True,
            "blockedBy": current_admin_id,
            "blockedAt": datetime.utcnow(),
            "blockReason": reason
        }}
    )
    
    for uid in user_ids:
        if uid != current_admin_id:
            await log_admin_action(current_admin_id, uid, "bulk_block", new_data={"reason": reason})
            
    return {"message": "Selected users blocked successfully"}

@router.post("/users/bulk-unblock")
async def bulk_unblock(data: dict, current_admin_id: str = Depends(get_current_admin)):
    user_ids = data.get("userIds", [])
    object_ids = [ObjectId(uid) for uid in user_ids]
    
    await users_collection.update_many(
        {"_id": {"$in": object_ids}},
        {"$set": {
            "isBlocked": False,
            "blockedBy": None,
            "blockedAt": None,
            "blockReason": ""
        }}
    )
    
    for uid in user_ids:
        await log_admin_action(current_admin_id, uid, "bulk_unblock")
        
    return {"message": "Selected users unblocked successfully"}

@router.post("/users/bulk-delete")
async def bulk_delete(data: dict, current_admin_id: str = Depends(get_current_admin)):
    user_ids = data.get("userIds", [])
    object_ids = [ObjectId(uid) for uid in user_ids if uid != current_admin_id]
    
    admins_to_del = await users_collection.count_documents({
        "_id": {"$in": object_ids},
        "role": "admin",
        "isDeleted": {"$ne": True}
    })
    
    if admins_to_del > 0:
        total_admins = await users_collection.count_documents({"role": "admin", "isDeleted": {"$ne": True}})
        if total_admins - admins_to_del < 1:
            raise HTTPException(status_code=400, detail="Cannot delete all/last administrator account")
            
    await users_collection.update_many(
        {"_id": {"$in": object_ids}},
        {"$set": {
            "isDeleted": True,
            "deletedBy": current_admin_id,
            "deletedAt": datetime.utcnow()
        }}
    )
    
    for uid in user_ids:
        if uid != current_admin_id:
            await log_admin_action(current_admin_id, uid, "bulk_delete")
            
    return {"message": "Selected users soft deleted successfully"}

# 15. Export CSV
@router.get("/export/users")
async def export_users_csv(current_admin_id: str = Depends(get_current_admin)):
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["ID", "Username", "Name", "Email", "Role", "Language", "Blocked", "Last Login"])
    
    cursor = users_collection.find({"isDeleted": {"$ne": True}})
    async for u in cursor:
        writer.writerow([
            str(u["_id"]),
            u.get("username", ""),
            u.get("name", ""),
            u.get("email", ""),
            u.get("role", "user"),
            u.get("preferredLanguage", "English"),
            "Yes" if u.get("isBlocked") else "No",
            u.get("lastLogin").strftime("%Y-%m-%d %H:%M:%S") if u.get("lastLogin") else "Never"
        ])
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users_export.csv"}
    )
