import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from utils.auth import get_password_hash

async def create_admin():
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.get_default_database()
    users_collection = db.get_collection("users")
    
    admin_username = "superadmin"
    admin_password = "123456"
    
    existing = await users_collection.find_one({"username": admin_username})
    if existing:
        print("Admin user already exists. Updating role to admin...")
        await users_collection.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin"}})
        print("Role updated successfully.")
        return
        
    hashed_password = get_password_hash(admin_password)
    
    admin_user = {
        "username": admin_username,
        "name": "Super Admin",
        "preferredLanguage": "English",
        "role": "admin",
        "password": hashed_password
    }
    
    await users_collection.insert_one(admin_user)
    print(f"Admin user created successfully!\nUsername: {admin_username}\nPassword: {admin_password}")

if __name__ == "__main__":
    asyncio.run(create_admin())
