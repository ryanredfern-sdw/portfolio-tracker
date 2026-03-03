"""
Migrate local portfolios to the Render deployment.

Usage:
    python migrate_to_render.py <RENDER_BACKEND_URL>

Example:
    python migrate_to_render.py https://portfolio-backend-dqtz.onrender.com
"""

import sqlite3
import json
import sys
import requests

# Path to local database
LOCAL_DB = "portfolio_app.db"

def get_local_portfolios():
    """Read all portfolios from the local SQLite database."""
    conn = sqlite3.connect(LOCAL_DB)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, allocations, category, history FROM portfolios")
    rows = cursor.fetchall()
    conn.close()

    portfolios = []
    for row in rows:
        portfolio = {
            "name": row["name"],
            "allocations": json.loads(row["allocations"]) if isinstance(row["allocations"], str) else row["allocations"],
            "category": row["category"] or "Balanced",
            "history": json.loads(row["history"]) if isinstance(row["history"], str) else (row["history"] or []),
        }
        portfolios.append(portfolio)
    return portfolios

def upload_to_render(backend_url, portfolios):
    """POST each portfolio to the Render backend."""
    api_url = f"{backend_url.rstrip('/')}/portfolios/"
    
    for p in portfolios:
        print(f"Uploading portfolio: {p['name']}...")
        try:
            response = requests.post(api_url, json=p)
            if response.status_code == 200:
                print(f"  ✓ Success: {p['name']}")
            else:
                print(f"  ✗ Failed ({response.status_code}): {response.text}")
        except Exception as e:
            print(f"  ✗ Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate_to_render.py <RENDER_BACKEND_URL>")
        print("Example: python migrate_to_render.py https://portfolio-backend-dqtz.onrender.com")
        sys.exit(1)

    backend_url = sys.argv[1]
    
    print(f"Reading local portfolios from {LOCAL_DB}...")
    portfolios = get_local_portfolios()
    print(f"Found {len(portfolios)} portfolio(s):\n")
    for p in portfolios:
        tickers = ", ".join(f"{k}: {v}%" for k, v in p["allocations"].items())
        print(f"  - {p['name']} ({p['category']}): {tickers}")
    
    print(f"\nUploading to {backend_url}...")
    upload_to_render(backend_url, portfolios)
    print("\nDone!")
