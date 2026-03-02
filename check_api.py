import requests

try:
    print("Testing /portfolios/compare?period=1mo")
    resp = requests.get('http://localhost:8000/portfolios/compare?period=1mo')
    print("Status:", resp.status_code)
    try:
        data = resp.json()
        if len(data) > 0:
            print("First item metrics:", {k: v for k, v in data[0].items() if k in ['ytd', 'month', 'week', 'day']})
        else:
            print("Empty array returned.")
    except Exception as e:
        print("Error parsing JSON:", e)
        print("Raw response:", resp.text[:200])
        
except Exception as e:
    print("Connection error:", e)
