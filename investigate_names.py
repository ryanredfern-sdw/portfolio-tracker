import yfinance as yf
import requests

ticker = "SPY"
tick = yf.Ticker(ticker)

print(f"--- Checking {ticker} ---")

# 1. Check history_metadata
try:
    meta = tick.get_history_metadata()
    print(f"History Metadata: {meta}")
    if meta and 'shortName' in meta:
        print(f"FOUND in Metadata: {meta['shortName']}")
    if meta and 'longName' in meta:
        print(f"FOUND in Metadata: {meta['longName']}")
except Exception as e:
    print(f"Metadata Error: {e}")
    
# 2. Check Search API directly
print("\n--- Checking Search API ---")
try:
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={ticker}"
    resp = requests.get(url, headers=headers, timeout=5)
    data = resp.json()
    if 'quotes' in data and len(data['quotes']) > 0:
        q = data['quotes'][0]
        print(f"Search Result: {q.get('shortname')} | {q.get('longname')}")
    else:
        print("No search results.")
except Exception as e:
    print(f"Search API Error: {e}")
