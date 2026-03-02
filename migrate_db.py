import sqlite3
import os

DB_FILE = "portfolio_app.db"

def migrate():
    if not os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} not found. Skipping migration.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(portfolios)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "history" not in columns:
            print("Adding 'history' column to portfolios table...")
            # SQLite doesn't have a native JSON type, it uses TEXT/BLOB, usually TEXT for JSON
            cursor.execute("ALTER TABLE portfolios ADD COLUMN history TEXT")
            conn.commit()
            print("Migration successful.")
        else:
            print("'history' column already exists.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
