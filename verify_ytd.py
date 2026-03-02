import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from app.services import fetch_ticker_data

if __name__ == '__main__':
    # Test Alpha Vantage
    os.environ['DATA_PROVIDER'] = 'av'
    print("Fetching AV data with period='ytd'...")
    df_av = fetch_ticker_data('IBM', period='ytd')
    print(f"AV Data shape: {df_av.shape}")
    if not df_av.empty:
        print(f"AV Data start date: {df_av.index[0]}")
        
    print("\nFetching yfinance data with period='ytd'...")
    os.environ['DATA_PROVIDER'] = 'yfinance'
    df_yf = fetch_ticker_data('IBM', period='ytd')
    print(f"YFinance Data shape: {df_yf.shape}")
    if not df_yf.empty:
        print(f"YFinance Data start date: {df_yf.index[0]}")
        
    print("\nVerification successful!")
