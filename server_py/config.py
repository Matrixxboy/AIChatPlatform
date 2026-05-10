import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT"))
    MONGODB_URI: str = os.getenv("MONGODB_URI")
    JWT_SECRET: str = os.getenv("JWT_SECRET")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY")
    GOOGLE_TRANSLATE_KEY: str = os.getenv("GOOGLE_TRANSLATE_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7

settings = Settings()
