from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from models import UserCreate, UserResponse
from database import users_collection, activity_logs
from utils.auth import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_refresh_token
from bson import ObjectId

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await users_collection.find_one({"username": user_data.username.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user document
    user_dict = user_data.dict()
    user_dict["username"] = user_dict["username"].lower()
    user_dict["password"] = hashed_password
    user_dict["isBlocked"] = False
    user_dict["isDeleted"] = False
    user_dict["createdAt"] = datetime.utcnow()
    
    result = await users_collection.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Log registration activity
    await activity_logs.insert_one({
        "userId": user_id,
        "action": "register",
        "metadata": {},
        "createdAt": datetime.utcnow()
    })
    
    # Generate tokens
    token = create_access_token(data={"userId": user_id})
    refresh_token = create_refresh_token(data={"userId": user_id})
    
    return {
        "token": token,
        "refreshToken": refresh_token,
        "user": {
            "id": user_id,
            "username": user_data.username.lower(),
            "name": user_data.name,
            "preferredLanguage": user_dict.get("preferredLanguage", "English"),
            "role": user_dict.get("role", "user"),
            "bio": user_dict.get("bio", ""),
            "profileImage": user_dict.get("profileImage", "")
        }
    }

@router.post("/login")
async def login(user_data: dict):
    username = user_data.get("username", "").lower()
    password = user_data.get("password", "")
    
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    if user.get("isDeleted"):
        raise HTTPException(status_code=400, detail="Invalid credentials")
        
    if user.get("isBlocked"):
        reason = user.get("blockReason", "No reason provided")
        raise HTTPException(
            status_code=403,
            detail=f"Your account is blocked. Reason: {reason}"
        )
        
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    
    # Update last login details
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "lastLogin": datetime.utcnow(),
            "lastSeen": datetime.utcnow()
        }}
    )
    
    token = create_access_token(data={"userId": user_id})
    refresh_token = create_refresh_token(data={"userId": user_id})
    
    # Log login activity
    await activity_logs.insert_one({
        "userId": user_id,
        "action": "login",
        "metadata": {},
        "createdAt": datetime.utcnow()
    })
    
    return {
        "token": token,
        "refreshToken": refresh_token,
        "user": {
            "id": user_id,
            "username": user["username"],
            "name": user["name"],
            "preferredLanguage": user.get("preferredLanguage", "English"),
            "role": user.get("role", "user"),
            "bio": user.get("bio", ""),
            "profileImage": user.get("profileImage", "")
        }
    }

@router.post("/refresh")
async def refresh(data: dict):
    refresh_token = data.get("refreshToken")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token required")
    
    payload = decode_refresh_token(refresh_token)
    if not payload or not payload.get("userId"):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    user_id = payload.get("userId")
    # You could optionally check if the user still exists in the DB here
    
    new_token = create_access_token(data={"userId": user_id})
    
    return {
        "token": new_token
    }
