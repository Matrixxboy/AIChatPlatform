import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT", 5000))
    MONGODB_URI: str = os.getenv("MONGODB_URI")
    JWT_SECRET: str = os.getenv("JWT_SECRET")
    REFRESH_TOKEN_SECRET: str = os.getenv("REFRESH_TOKEN_SECRET", os.getenv("JWT_SECRET"))
    GOOGLE_TRANSLATE_KEY: str = os.getenv("GOOGLE_TRANSLATE_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")

settings = Settings()
