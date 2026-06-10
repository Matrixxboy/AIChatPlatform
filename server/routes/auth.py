from fastapi import APIRouter, HTTPException, Depends, status
from models import UserCreate, UserResponse
from database import users_collection
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
    
    result = await users_collection.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
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
    
    if not verify_password(password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    token = create_access_token(data={"userId": user_id})
    refresh_token = create_refresh_token(data={"userId": user_id})
    
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
