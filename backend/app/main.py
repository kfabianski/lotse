from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import migrate
from app.config import settings
from app.db import Base, engine
from app.routers import (admin_settings, auth, calendar, content, departments, ideas, locations, quicklinks, revisions, search,
                         trainings, users)
from app.db import SessionLocal

Base.metadata.create_all(bind=engine)
migrate.upgrade(engine)
admin_settings.load_overrides_at_startup()
with SessionLocal() as _db:
    departments.ensure_defaults(_db)
    revisions.ensure_initial_revisions(_db)  # articles from before the version history get version 1

app = FastAPI(title="Lotse Intranet API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

for module in (auth, users, content, search, revisions, quicklinks, trainings, locations, ideas, calendar, admin_settings, departments):
    app.include_router(module.router)
app.include_router(trainings.files_router)



@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    if request.url.path.startswith("/uploads/"):
        if request.url.path.endswith(".pdf"):
            # PDFs open in the portal's own viewer (iframe on the same site); the browser's PDF viewer
            # does not work inside a CSP sandbox, so allow framing by this site only.
            response.headers["Content-Security-Policy"] = "frame-ancestors 'self'"
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
        else:
            # Uploaded SVGs are shown as images only; never let them run scripts.
            response.headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    return response


app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Production: serve the built React app from the same process (one service, no extra web server).
if settings.frontend_dist.is_dir():
    app.mount("/assets", StaticFiles(directory=settings.frontend_dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith(("api/", "uploads/")):
            raise HTTPException(404)
        candidate = (settings.frontend_dist / path).resolve()
        if path and candidate.is_file() and settings.frontend_dist.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(settings.frontend_dist / "index.html")
