from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client.get_default_database()

# Collections
users_collection = db.get_collection("users")
sessions_collection = db.get_collection("sessions")
user_sessions_collection = db.get_collection("user_sessions")
messages_collection = db.get_collection("messages")
contacts_collection = db.get_collection("contacts")
activity_logs = db.get_collection("activity_logs")

async def get_db():
    return db
