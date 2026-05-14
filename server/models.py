from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class UserBase(BaseModel):
    username: str
    name: str
    preferredLanguage: str = "English"
    preferredLanguage: str = "English"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class SessionBase(BaseModel):
    name: str
    participants: List[str] # List of User IDs
    createdBy: str

class SessionResponse(SessionBase):
    id: str = Field(alias="_id")
    lastMessage: str = ""
    lastMessageTime: datetime = Field(default_factory=datetime.now)
    createdAt: datetime = Field(default_factory=datetime.now)
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class MessageBase(BaseModel):
    sessionId: str
    senderId: str
    originalText: str
    translatedText: str = ""
    fromLang: str
    toLang: str = ""
    confidence: float = 100.0
    replyTo: Optional[str] = None
    replyToText: Optional[str] = None
    replyToSender: Optional[str] = None

class MessageResponse(MessageBase):
    id: str = Field(alias="_id")
    createdAt: datetime = Field(default_factory=datetime.now)
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
