import yfinance as yf
t = yf.Ticker("SPY")
try:
    print(f"Fast Info: {t.fast_info}")
    # accessing lazy property
    print(f"Currency: {t.fast_info.currency}") 
except Exception as e:
    print(f"Error: {e}")
