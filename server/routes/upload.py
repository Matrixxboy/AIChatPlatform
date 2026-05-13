from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import shutil
import os
import uuid
from routes.users import get_current_user_id

router = APIRouter()

UPLOAD_DIR = "public/uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("")
async def upload_file(file: UploadFile = File(...), current_user_id: str = Depends(get_current_user_id)):
    # 1. Security & Limits: Check file size (10MB)
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    file_size = 0
    
    # Basic Security: Validate file name
    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided")
        
    # 2. Generate unique filename
    file_ext = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # 3. Save file and track size
    try:
        with open(file_path, "wb") as buffer:
            # We copy in chunks to check size
            while True:
                chunk = await file.read(1024 * 1024) # 1MB chunk
                if not chunk:
                    break
                file_size += len(chunk)
                if file_size > MAX_SIZE:
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(status_code=413, detail="File too large (Max 10MB)")
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {str(e)}")
        
    # 4. Return metadata
    file_url = f"/uploads/{unique_filename}"
    
    return {
        "url": file_url,
        "filename": filename,
        "type": file.content_type,
        "size": file_size
    }
