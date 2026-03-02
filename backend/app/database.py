from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Use absolute path to avoid confusion with CWD
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # backend/app
# Go up two levels to root: backend/app -> backend -> root
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Actually, let's just trace distinctively.
# If __file__ is c:\...\backend\app\database.py
# dirname -> backend\app
# dirname -> backend
# dirname -> root
# Better: use the known path structure or relative
# Given the user's setup: c:\Users\Master\.gemini\antigravity\playground\sidereal-cluster
# Let's try to resolve safely.

CURRENT_FILE = os.path.abspath(__file__)
BACKEND_APP_DIR = os.path.dirname(CURRENT_FILE)
BACKEND_DIR = os.path.dirname(BACKEND_APP_DIR)
# Assuming run from root, but let's be explicit
# We want the DB in the same folder as start_backend.ps1 effectively.
# That is the parent of 'backend'
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

DB_PATH = os.path.join(PROJECT_ROOT, "portfolio_app.db")
# SQLAlchemy on Windows needs slightly different handling for absolute paths
# It's safest to use 3 slashes and forward slashes for the path
# e.g. sqlite:///C:/path/to/db
# If we have backslashes, we must escape them or replace them
DB_PATH = DB_PATH.replace("\\", "/")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

print(f"--- DATABASE CONFIG ---")
print(f"Connecting to database at: {DB_PATH}")
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
