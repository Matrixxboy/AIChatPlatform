from fastapi import APIRouter, Depends, Query, HTTPException
from models import ContactCreate
from database import contacts_collection
from routes.users import get_current_admin
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.post("")
async def submit_contact(contact: ContactCreate):
    contact_data = contact.dict()
    contact_data["createdAt"] = datetime.utcnow()
    
    result = await contacts_collection.insert_one(contact_data)
    
    return {"message": "Contact request submitted successfully", "id": str(result.inserted_id)}

@router.get("")
async def get_contacts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_admin_id: str = Depends(get_current_admin)
):
    skip = (page - 1) * limit
    
    # Get total count
    total_count = await contacts_collection.count_documents({})
    
    # Fetch paginated contacts, sorted by newest first
    cursor = contacts_collection.find({}).sort("createdAt", -1).skip(skip).limit(limit)
    
    contacts = []
    async for doc in cursor:
        contacts.append({
            "_id": str(doc["_id"]),
            "name": doc["name"],
            "email": doc["email"],
            "message": doc["message"],
            "createdAt": doc["createdAt"]
        })
        
    return {
        "contacts": contacts,
        "total": total_count,
        "page": page,
        "limit": limit,
        "totalPages": (total_count + limit - 1) // limit
    }
