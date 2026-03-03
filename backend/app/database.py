from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Use DATABASE_URL from environment (Render PostgreSQL) or fall back to SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Render provides postgresql:// but SQLAlchemy needs postgresql+psycopg2://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
    
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    print(f"--- DATABASE CONFIG ---")
    print(f"Using PostgreSQL (Render)")
    print(f"-----------------------")
    
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    # Local development: use SQLite
    CURRENT_FILE = os.path.abspath(__file__)
    BACKEND_APP_DIR = os.path.dirname(CURRENT_FILE)
    BACKEND_DIR = os.path.dirname(BACKEND_APP_DIR)
    PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
    
    DB_PATH = os.path.join(PROJECT_ROOT, "portfolio_app.db").replace("\\", "/")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
    
    print(f"--- DATABASE CONFIG ---")
    print(f"Using SQLite at: {DB_PATH}")
    print(f"-----------------------")
    
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
