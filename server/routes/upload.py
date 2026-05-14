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

BASE_URI = os.getenv("BASE_URI", "").strip().strip('"').strip("'")

# Base directory (Local File System Path)
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "public" / "uploads"

# CRITICAL: Diagnostic Logging for Live Server
logger.info(f"UPLOAD SYSTEM: Base Directory resolved to: {BASE_DIR}")
logger.info(f"UPLOAD SYSTEM: Files will be saved to: {UPLOAD_DIR}")

# Create upload directory on the local disk if it doesn't exist
try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    # Check if we can actually write to it
    test_file = UPLOAD_DIR / ".write_test"
    test_file.touch()
    test_file.unlink()
    logger.info("UPLOAD SYSTEM: Directory is WRITABLE")
except Exception as e:
    logger.error(f"UPLOAD SYSTEM ERROR: Cannot prepare directory {UPLOAD_DIR}: {str(e)}")


@router.post("")
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

@router.delete("/{filename}")
async def delete_file(
    filename: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Delete an uploaded file from the server.
    """
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )
    
    # Ensure it's within UPLOAD_DIR to prevent path traversal
    if not str(file_path.resolve()).startswith(str(UPLOAD_DIR.resolve())):
        raise HTTPException(
            status_code=403,
            detail="Unauthorized access"
        )

    try:
        file_path.unlink()
        logger.info(f"UPLOAD SYSTEM: File {filename} deleted by user {current_user_id}")
        return {"message": "File deleted successfully"}
    except Exception as e:
        logger.error(f"UPLOAD SYSTEM ERROR: Could not delete file {filename}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete file: {str(e)}"
        )