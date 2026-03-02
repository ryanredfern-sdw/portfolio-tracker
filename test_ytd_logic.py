import pandas as pd
import numpy as np
from datetime import datetime

# Mock get_performance_summary
def get_performance_summary(returns: pd.Series, full_returns: pd.Series = None):
    if returns.empty:
         return {"day": 0.0, "week": 0.0, "month": 0.0, "ytd": 0.0}
         
    day_ret = returns.iloc[-1]
    
    if len(returns) >= 5:
        week_ret = (1 + returns.iloc[-5:]).prod() - 1
    else:
        week_ret = (1 + returns).prod() - 1

    if len(returns) >= 21:
        month_ret = (1 + returns.iloc[-21:]).prod() - 1
    else:
        month_ret = (1 + returns).prod() - 1

    def safe_float(val):
        try:
            if np.isnan(val) or np.isinf(val):
                return 0.0
            return float(round(val, 2))
        except:
            return 0.0
            
    ytd_ret = 0.0
    if full_returns is not None and not full_returns.empty:
        current_year = datetime.now().year
        try:
            ytd_series = full_returns[full_returns.index.year == current_year]
            if not ytd_series.empty:
                ytd_ret = (1 + ytd_series).prod() - 1
        except Exception as e:
            print(f"YTD Calculation Error: {e}")

    return {
        "day": safe_float(day_ret * 100),
        "week": safe_float(week_ret * 100),
        "month": safe_float(month_ret * 100),
        "ytd": safe_float(ytd_ret * 100)
    }

# Mock data
dates = pd.date_range(start='12/01/2025', end='03/01/2026', freq='B')
# 1% daily return
returns = pd.Series([0.01]*len(dates), index=dates)

summary = get_performance_summary(returns, returns)
print("Summary:", summary)
