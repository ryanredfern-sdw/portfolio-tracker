import pandas as pd
from app.services import calculate_portfolio_returns

# Test FDRXX using the YTD period
allocations = {'FDRXX': 1.0, 'AAPL': 0.0}

print("Testing FDRXX with ytd...")
try:
    df, meta = calculate_portfolio_returns(allocations, period="ytd")
    print(df.tail())
    if "full_returns" in meta:
        print(f"Full returns shape: {meta['full_returns'].shape}")
    print("Success!")
except Exception as e:
    print(f"Error: {e}")
