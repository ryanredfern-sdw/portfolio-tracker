from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models, api, auth, cache
from .database import engine, SessionLocal

# Create all tables (including users table from auth)
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "https://portfolio-frontend-xxrb.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(api.router)

@app.on_event("startup")
def startup_event():
    """Seed the default admin user on first startup."""
    db = SessionLocal()
    try:
        auth.seed_default_admin(db)
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Financial Portfolio API is running"}
