import uuid

from fastapi import HTTPException, UploadFile

from app.config import settings

_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
                "image/svg+xml": ".svg"}
# Magic numbers, so a renamed file cannot pass as an image.
_SIGNATURES = {".jpg": [b"\xff\xd8\xff"], ".png": [b"\x89PNG"], ".gif": [b"GIF8"], ".webp": [b"RIFF"]}


async def save_image(file: UploadFile, prefix: str = "img", allow_svg: bool = False) -> str:
    ext = _IMAGE_TYPES.get(file.content_type or "")
    if not ext or (ext == ".svg" and not allow_svg):
        raise HTTPException(415, "Only JPEG, PNG, WebP or GIF images are allowed")
    data = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"Image is larger than {settings.max_upload_mb} MB")
    if ext == ".svg":
        head = data[:2048].lower()
        if b"<svg" not in head or b"<script" in data.lower() or b"onload" in data.lower():
            raise HTTPException(415, "SVG must not contain scripts")
    elif not any(data.startswith(sig) for sig in _SIGNATURES[ext]):
        raise HTTPException(415, "File content does not match its image type")
    name = f"{prefix}-{uuid.uuid4().hex}{ext}"
    (settings.upload_dir / name).write_bytes(data)
    return f"/uploads/{name}"


async def save_file(file: UploadFile) -> dict:
    """Store an image or a PDF attachment; returns {url, name, kind, size}."""
    name = (file.filename or "datei").rsplit("/", 1)[-1].rsplit("\\", 1)[-1][:200]
    if file.content_type == "application/pdf" or name.lower().endswith(".pdf"):
        limit = settings.max_pdf_mb * 1024 * 1024
        data = await file.read(limit + 1)
        if len(data) > limit:
            raise HTTPException(413, f"PDF is larger than {settings.max_pdf_mb} MB")
        if not data.startswith(b"%PDF-"):
            raise HTTPException(415, "File is not a PDF")
        stored = f"doc-{uuid.uuid4().hex}.pdf"
        (settings.upload_dir / stored).write_bytes(data)
        return {"url": f"/uploads/{stored}", "name": name, "kind": "pdf", "size": len(data)}
    url = await save_image(file, "photo")
    return {"url": url, "name": name, "kind": "image", "size": (settings.upload_dir / url.rsplit("/", 1)[-1]).stat().st_size}
