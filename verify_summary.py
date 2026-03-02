import requests
import sys
import time

BASE_URL = "http://localhost:8000"

def check_summary():
    try:
        print(f"Checking {BASE_URL}/tickers/summary...")
        start = time.time()
        resp = requests.get(f"{BASE_URL}/tickers/summary", timeout=30)
        print(f"Status: {resp.status_code}")
        print(f"Time: {time.time() - start:.2f}s")
        
        if resp.status_code == 200:
            data = resp.json()
            print(f"Success! Got {len(data)} items.")
            if data:
                print(f"Sample: {data[0]}")
        else:
            print(f"Error: {resp.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    check_summary()
