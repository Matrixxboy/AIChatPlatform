from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import os
import uuid
import logging
from pathlib import Path
from dotenv import load_dotenv

from routes.users import get_current_user_id

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()

BASE_URI = os.getenv("BASE_URI", "")

# Base directory (Local File System Path)
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "public" / "uploads"

# Create upload directory on the local disk if it doesn't exist
# UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id)
):
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    file_size = 0

    # Validate filename
    filename = file.filename

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided"
        )

    # Generate unique filename
    file_ext = Path(filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    file_path = UPLOAD_DIR / unique_filename

    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunk
                if not chunk:
                    break
                file_size += len(chunk)

                # File size validation
                if file_size > MAX_SIZE:
                    buffer.close()
                    if file_path.exists():
                        file_path.unlink()

                    raise HTTPException(
                        status_code=413,
                        detail="File too large (Max 10MB)"
                    )

                buffer.write(chunk)

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Upload Save Error: {str(e)}")

        # Cleanup if partially uploaded
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Could not save file to server: {str(e)}"
        )

    finally:
        await file.close()

    # Return file metadata - matching your production structure
    file_url = f"{BASE_URI}/ai-chat-platform/public/uploads/{unique_filename}"

    return {
        "url": file_url,
        "filename": filename,
        "stored_filename": unique_filename,
        "type": file.content_type,
        "size": file_size
    }