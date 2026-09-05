from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import health, process, notes, documents, profile, embeddings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables that don't exist yet on startup (dev-friendly; use real
    # migrations for production schema changes).
    init_db()
    yield


app = FastAPI(
    title="MindIt! API",
    description="Backend for MindIt! - turns raw text/documents into structured, grounded notes.",
    version="0.1.0",
    lifespan=lifespan,
)

# The Vite dev server runs on 5173 by default; add any deployed frontend
# origin(s) here too (e.g. your Vercel/Netlify URL) once you deploy.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(process.router)
app.include_router(notes.router)
app.include_router(documents.router)
app.include_router(profile.router)
app.include_router(embeddings.router)


@app.get("/")
def root():
    return {"name": "MindIt! API", "status": "running", "docs": "/docs"}
