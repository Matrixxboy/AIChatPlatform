from fastapi import APIRouter, Depends, HTTPException, Query
from database import users_collection
from utils.auth import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from typing import List

router = APIRouter()
security = HTTPBearer()

async def get_current_user_id(auth: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(auth.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload.get("userId")

async def get_current_admin(auth: HTTPAuthorizationCredentials = Depends(security)):
    user_id = await get_current_user_id(auth)
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized as admin")
    return str(user["_id"])

@router.get("/search")
async def search_users(q: str = Query(...), current_user_id: str = Depends(get_current_user_id)):
    if not q:
        return []
    
    cursor = users_collection.find({
        "username": {"$regex": q, "$options": "i"},
        "_id": {"$ne": ObjectId(current_user_id)}
    }).limit(10)
    
    users = []
    async for user in cursor:
        users.append({
            "_id": str(user["_id"]),
            "username": user["username"],
            "name": user["name"],
            "bio": user.get("bio", ""),
            "profileImage": user.get("profileImage", "")
        })
    
    return users

@router.patch("/profile")
async def update_profile(data: dict, current_user_id: str = Depends(get_current_user_id)):
    allowed_fields = ["name", "preferredLanguage", "bio", "profileImage"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
        
    await users_collection.update_one(
        {"_id": ObjectId(current_user_id)},
        {"$set": update_data}
    )
    return {"message": "Profile updated successfully"}

@router.get("/{user_id}")
async def get_user_profile(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "_id": str(user["_id"]),
        "username": user["username"],
        "name": user["name"],
        "bio": user.get("bio", ""),
        "profileImage": user.get("profileImage", ""),
        "preferredLanguage": user.get("preferredLanguage", "English")
    }
