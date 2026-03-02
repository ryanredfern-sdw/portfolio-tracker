import yfinance as yf
ticker = "SPY"
print(f"Checking {ticker}...")
try:
    t = yf.Ticker(ticker)
    info = t.info
    print(f"Name: {info.get('longName')}")
    hist = t.history(period="5d")
    print(f"History Rows: {len(hist)}")
except Exception as e:
    print(f"Error: {e}")
