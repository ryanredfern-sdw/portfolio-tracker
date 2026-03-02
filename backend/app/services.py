import yfinance as yf
import pandas as pd
import numpy as np
import requests
import os
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from functools import lru_cache
import logging

# In a real app, use os.getenv("ALPHAVANTAGE_API_KEY")
# For this demo/playground, we'll use the provided key as default if env var is missing
ALPHAVANTAGE_API_KEY = os.getenv("ALPHAVANTAGE_API_KEY", "1QPOKB0YM78P6N2Q")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Silence yfinance spam
import json
import os

# File-based cache for ticker names to survive restarts
# Saves to backend/ticker_names.json (or similar)
CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ticker_names.json")

def load_name_cache() -> Dict[str, str]:
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_name_cache(cache: Dict[str, str]):
    try:
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f)
    except Exception:
        pass

# Global in-memory cache seeded from file
NAME_CACHE = load_name_cache()

def fetch_ticker_name(ticker: str) -> str:
    """
    Safely fetch ticker name with caching using history metadata (avoids 401 on .info).
    Uses persistent file cache.
    """
    if ticker in NAME_CACHE:
        return NAME_CACHE[ticker]
        
    try:
        tick = yf.Ticker(ticker)
        # Fetch minimal history to populate metadata
        tick.history(period="5d")
        
        meta = tick.get_history_metadata()
        if not meta:
            name = ticker
        else:
            name = meta.get('longName') or meta.get('shortName') or ticker
            
        # Update cache
        NAME_CACHE[ticker] = name
        save_name_cache(NAME_CACHE)
        return name
        
    except Exception as e:
        # logger.error(f"Error fetching name for {ticker}: {e}")
        return ticker

@lru_cache(maxsize=128)
def fetch_ticker_data_av(ticker: str, outputsize: str = "full") -> pd.DataFrame:
    """
    Fetch daily adjusted data from Alpha Vantage.
    Returns DataFrame with columns: Open, High, Low, Close, Volume.
    """
    url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol={ticker}&outputsize={outputsize}&apikey={ALPHAVANTAGE_API_KEY}"
    try:
        response = requests.get(url)
        data = response.json()
        
        if "Time Series (Daily)" not in data:
            logger.error(f"Alpha Vantage error for {ticker}: {data.get('Error Message', data.get('Note', 'Unknown error'))}")
            return pd.DataFrame()
            
        ts_data = data["Time Series (Daily)"]
        df = pd.DataFrame.from_dict(ts_data, orient='index')
        
        df = df.rename(columns={
            "1. open": "Open",
            "2. high": "High",
            "3. low": "Low",
            "4. close": "Close",
            "5. adjusted close": "Adj Close",
            "6. volume": "Volume"
        })
        
        # Convert index to datetime
        df.index = pd.to_datetime(df.index)
        df = df.sort_index()
        
        # Convert columns to numeric
        cols = ["Open", "High", "Low", "Close", "Adj Close", "Volume"]
        for col in cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col])
                
        # For compatibility, overwrite Close with Adj Close if valid
        if "Adj Close" in df.columns:
            df["Close"] = df["Adj Close"]
            
        return df
            
    except Exception as e:
        logger.error(f"Error fetching data for {ticker}: {e}")
        return pd.DataFrame()

@lru_cache(maxsize=128)
def fetch_ticker_data(ticker: str, period: str = "5y", start: str = None, end: str = None, provider: str = os.getenv("DATA_PROVIDER", "yfinance")) -> pd.DataFrame:
    """
    Fetch historical data for a ticker.
    Supports 'yfinance' (default) and 'av' (Alpha Vantage).
    """
    if provider == "av":
        # Alpha Vantage doesn't support "period" naturally (it's compact=100 or full=20+ years)
        # We fetch full (since we have paid plan) and filter by date if needed.
        df = fetch_ticker_data_av(ticker, outputsize="full")
        
        # Basic filtering to match 'period' roughly if needed
        if not df.empty and period:
            end_date = datetime.now()
            start_date = None
            if period == "1mo":
                start_date = end_date - timedelta(days=30)
            elif period == "3mo":
                start_date = end_date - timedelta(days=90)
            elif period == "6mo":
                 start_date = end_date - timedelta(days=180)
            elif period == "1y":
                start_date = end_date - timedelta(days=365)
            elif period == "2y":
                start_date = end_date - timedelta(days=365*2)
            elif period == "5y":
                start_date = end_date - timedelta(days=365*5)
            elif period == "10y":
                start_date = end_date - timedelta(days=365*10)
            elif period == "ytd":
                start_date = datetime(end_date.year, 1, 1)
            
            if start_date:
                df = df[df.index >= start_date]

        return df

    # Default to yfinance
    try:
        ticker_obj = yf.Ticker(ticker)
        # period="max" is allowed
        # auto_adjust=True ensures 'Close' is adjusted for splits/dividends
        df = ticker_obj.history(period=period, start=start, end=end, auto_adjust=True)
        return df
    except Exception as e:
        logger.error(f"Error fetching data for {ticker} from yfinance: {e}")
        return pd.DataFrame()

def calculate_daily_returns(df: pd.DataFrame) -> pd.Series:
    """Calculate daily percentage change."""
    return df['Close'].pct_change().dropna()

def calculate_portfolio_returns(allocations: Dict[str, float], period: str = "2y", history: List[Dict] = None) -> pd.DataFrame:
    """
    Calculate composite daily returns for a portfolio.
    Supports historical rebalancing if 'history' is provided.
    vals in history: [{'date': 'YYYY-MM-DD', 'allocations': {'TICKER': 0.5...}}]
    """
    # 1. Determine Date Range
    current_allocs = allocations
    
    # Identify all tickers involved in history or current
    all_tickers = set(current_allocs.keys())
    if history:
        for event in history:
            if event.get('allocations'):
                all_tickers.update(event['allocations'].keys())
    
    tickers = list(all_tickers)
    data_frames = []
    
    # Map short periods to fetch enough data
    fetch_period = period
    start_date = None
    end_date = None
    
    # Expand default fetch to 5y to gracefully support short-term calculations and caching
    # without relying on volatile sub-period availability from yfinance for mutual funds.
    fetch_period = "5y" if period not in ["max", "10y"] else "max"
    
    if period == "prior_month":
        today = datetime.now()
        first_day_this_month = today.replace(day=1)
        last_day_prev_month = first_day_this_month - timedelta(days=1)
        first_day_prev_month = last_day_prev_month.replace(day=1)
        start_date = first_day_prev_month.strftime("%Y-%m-%d")
        end_date = (last_day_prev_month + timedelta(days=1)).strftime("%Y-%m-%d")
        fetch_period = None
    elif period == "prior_quarter":
        today = datetime.now()
        current_quarter = (today.month - 1) // 3 + 1
        if current_quarter == 1:
            prev_q_end_month = 12
            prev_q_year = today.year - 1
            prev_q_start_month = 10
        else:
            prev_q_end_month = (current_quarter - 1) * 3
            prev_q_year = today.year
            prev_q_start_month = prev_q_end_month - 2
        
        if prev_q_end_month == 12:
            next_month_first = datetime(prev_q_year + 1, 1, 1)
        else:
            next_month_first = datetime(prev_q_year, prev_q_end_month + 1, 1)
            
        last_day_prev_q = next_month_first - timedelta(days=1)
        first_day_prev_q = datetime(prev_q_year, prev_q_start_month, 1)
        start_date = first_day_prev_q.strftime("%Y-%m-%d")
        end_date = (last_day_prev_q + timedelta(days=1)).strftime("%Y-%m-%d")
        fetch_period = None

    # 2. Fetch Data
    for ticker in tickers:
        df = fetch_ticker_data(ticker, period=fetch_period, start=start_date, end=end_date)
        if df.empty:
            continue
        df = df.rename(columns={'Close': ticker})
        data_frames.append(df)
    
    if not data_frames:
        return pd.DataFrame(), {"is_up_to_date": False, "missing_tickers": tickers, "error": "No data found for any ticker"}
        
    prices_df = pd.concat(data_frames, axis=1)
    
    # --- Data Freshness Check ---
    is_up_to_date = False
    metadata = {}
    try:
        if not prices_df.empty:
            now = datetime.now()
            
            # Determine Target Date
            target_date = now.date()
            
            # Weekend handling (Saturday=5, Sunday=6)
            if now.weekday() >= 5:
                # Target is last Friday
                days_to_subtract = now.weekday() - 4
                target_date = (now - timedelta(days=days_to_subtract)).date()
            else:
                # Weekday
                if now.hour < 12:
                    # Morning Grace Period: Expect Yesterday's Close
                    # If today is Monday(0), yesterday is Sunday(6) -> Need Friday(-3)
                    if now.weekday() == 0:
                         target_date = (now - timedelta(days=3)).date()
                    else:
                         target_date = (now - timedelta(days=1)).date()
                else:
                    # After noon: Expect Today's Close
                    target_date = now.date()
            
            # Check if we have valid data for Target Date (Strict: ALL funds must have data)
            # 1. Check if target_date key exists in index (handling timezone naive/aware mismatch if needed, but dates usually match)
            # yfinance index is usually Timestamps. We compare dates.
            
            # Convert index to dates for checking
            available_dates = prices_df.index.date
            
            if target_date in available_dates:
                # 2. Check for NaNs ONLY in currently active tickers
                # Historical tickers (like delisted ones) shouldn't trigger "Not Fresh"
                active_tickers = [t for t, pct in allocations.items() if pct > 0]
                
                # Filter active tickers to those actually in DataFrame (safety check)
                # (If an active ticker has NO data at all, it wouldn't be in columns potentially? 
                #  But data_frames logic ensures they are added or empty. If empty, columns exist?)
                valid_active = [t for t in active_tickers if t in prices_df.columns]
                
                # Check NaNs in the row for these specific columns
                loc_idx = np.where(available_dates == target_date)[0][0]
                row = prices_df.iloc[loc_idx]
                
                row_active = row[valid_active]
                
                if row_active.isna().any():
                    # Identify which are NaN
                    missing = row_active[row_active.isna()].index.tolist()
                    metadata["missing_tickers"] = missing
                else:
                    is_up_to_date = True
            else:
                 # Target date not in index at all
                 # Assume potentially all are missing for this specific date, or check individually
                 metadata["missing_tickers"] = ["Date Missing"]
                    
    except Exception as e:
        print(f"Error checking freshness: {e}")
        is_up_to_date = False
        metadata["error"] = str(e)
        
    metadata["is_up_to_date"] = is_up_to_date

    # Forward fill missing prices (e.g. holidays)
    # Backfill missing start data (e.g. Money Market funds with short history) to avoid dropping all rows
    prices_df = prices_df.ffill().bfill().dropna()
    
    returns_df = prices_df.pct_change().fillna(0.0)
    
    
    # 3. Construct Weights
    
    # Helper to clean allocations (ensure sum to 1? Or just normalize implicitly later? 
    # Current logic normalizes by sum of weights)
    
    if not history:
        # Static Weights for whole period
        # Use current_allocations
        weights_series = pd.Series(0.0, index=returns_df.columns)
        total_w = sum(current_allocs.values())
        if total_w == 0: total_w = 1.0
        
        for t, w in current_allocs.items():
            if t in weights_series.index:
                weights_series[t] = w / total_w
                
        # Broadcast to DataFrame
        weights_df = pd.DataFrame([weights_series.values] * len(returns_df), index=returns_df.index, columns=returns_df.columns)
        
    else:
        # Dynamic Weights
        # Create DataFrame indexed by returns_df.index
        weights_df = pd.DataFrame(0.0, index=returns_df.index, columns=returns_df.columns)
        
        # Build allocations schedule
        # Format: DataFrame with Index=EventDate, Cols=Tickers
        # 1. Sort history
        sorted_events = sorted(history, key=lambda x: x['date'])
        
        # 2. Create index of all events + start date?
        # Simpler: Iterate ticks or reindex?
        # Reindex approach
        
        # Create a DF for history events
        hist_data = []
        hist_index = []
        for event in sorted_events:
            try:
                dt = pd.to_datetime(event['date'])
                alloc = event['allocations']
                # Normalize
                tot = sum(alloc.values())
                if tot == 0: tot = 1.0
                norm_alloc = {k: v/tot for k, v in alloc.items()}
                hist_data.append(norm_alloc)
                hist_index.append(dt)
            except Exception:
                pass
                
        if not hist_data:
             # Fallback
             return pd.DataFrame({'daily_return': pd.Series(0, index=returns_df.index)}), {}

        # Create DataFrame
        hist_df = pd.DataFrame(hist_data, index=hist_index)
        
        # Deduplicate index: keep last entry for any given date
        # This handles cases where initial allocation and a rebalance might happen on same day,
        # or user added multiple variations. We take the latest state.
        hist_df = hist_df[~hist_df.index.duplicated(keep='last')]
        # Reindex to returns_df index (Trade Dates)
        # Use ffill to propagate weights forward
        # Make sure we account for timezone naive/aware mismatch if any. yfinance is aware?
        # returns_df.index is usually TZ-aware (New York).
        # hist_df index is usually naive (from string).
        
        try:
            if returns_df.index.tz is not None:
                hist_df.index = hist_df.index.tz_localize(returns_df.index.tz)
        except Exception:
            # If conversion fails (already tz?), ignore
            pass

        # Combine with returns index to ensure we cover the range, then ffill
        # But we only want rows present in returns_df
        
        # Method:
        # reindex(returns_df.index, method='ffill')
        # But this requires the index to be monotonic. Returns index is monotonic.
        # But hist_df.index needs to be part of the same timeline.
        
        # If hist starts AFTER returns start, ffill will leave NaNs at start -> 0 weights. Correct.
        
        # Apply shift(1) to lag weights (Alloc at T-1 determines Return at T)
        
        weights_df = hist_df.reindex(returns_df.index, method='ffill').fillna(0.0)
        weights_df = weights_df.shift(1).fillna(0.0)
        
        # Align columns (ensure all tickers present)
        for col in returns_df.columns:
            if col not in weights_df.columns:
                weights_df[col] = 0.0
        weights_df = weights_df[returns_df.columns] # Reorder
        
    # 4. Compute Weighted Returns
    # Element-wise multiplication, then sum across rows
    weighted_returns = (returns_df * weights_df).sum(axis=1)

    # Slice back to requested period
    final_series = weighted_returns
    
    if len(weighted_returns) > 0:
        if weighted_returns.index.tz is not None:
            now = pd.Timestamp.now(tz=weighted_returns.index.tz)
        else:
            now = pd.Timestamp.now()
            
        if period == "1d":
            final_series = weighted_returns.iloc[-1:]
        elif period == "5d":
            final_series = weighted_returns.iloc[-5:]
        elif period == "1mo":
            final_series = weighted_returns[weighted_returns.index >= now - pd.Timedelta(days=30)]
        elif period == "3mo":
            final_series = weighted_returns[weighted_returns.index >= now - pd.Timedelta(days=90)]
        elif period == "6mo":
            final_series = weighted_returns[weighted_returns.index >= now - pd.Timedelta(days=180)]
        elif period == "1y":
            final_series = weighted_returns[weighted_returns.index >= now - pd.Timedelta(days=365)]
        elif period == "2y":
            final_series = weighted_returns[weighted_returns.index >= now - pd.Timedelta(days=365*2)]
        elif period == "3y":
            final_series = weighted_returns[weighted_returns.index >= now - pd.Timedelta(days=365*3)]
        elif period == "5y":
            final_series = weighted_returns[weighted_returns.index >= now - pd.Timedelta(days=365*5)]
        elif period == "ytd":
            final_series = weighted_returns[weighted_returns.index.year == now.year]

    metadata["full_returns"] = weighted_returns

    return pd.DataFrame({'daily_return': final_series}), metadata

def calculate_upi(returns: pd.Series, risk_free_rate: float = 0.0) -> Dict:
    """
    Calculate Ulcer Performance Index.
    UPI = (Annualized Return - Risk Free Rate) / Ulcer Index
    """
    if returns.empty:
        return {}

    # 1. Calculate Cumulative Return (Equity Curve)
    equity_curve = (1 + returns).cumprod()
    
    # 2. Calculate Drawdowns
    # Rolling max
    running_max = equity_curve.cummax()
    drawdown = (equity_curve - running_max) / running_max
    
    # 3. Calculate Ulcer Index
    # UI = sqrt(mean(drawdown_squared))
    drawdown_squared = drawdown ** 2
    ui = np.sqrt(drawdown_squared.mean())
    
    # 4. Annualized Return (CAGR)
    total_return = equity_curve.iloc[-1] - 1
    days = len(returns)
    cagr = (equity_curve.iloc[-1]) ** (252/days) - 1
    
    # 5. UPI
    # Avoid division by zero
    if ui == 0:
        upi = 0.0 # float('inf') breaks JSON
    else:
        upi = (cagr - risk_free_rate) / ui
        
    # 6. Standard Deviation (Annualized)
    stdev = returns.std() * np.sqrt(252)
    
    # Helper to safe float
    def safe_float(val):
        try:
            if np.isnan(val) or np.isinf(val):
                return 0.0
            return float(round(val, 2))
        except:
            return 0.0

    return {
        "ui": safe_float(ui * 100),
        "max_drawdown": safe_float(drawdown.min() * 100),
        "total_return": safe_float(total_return * 100),
        "cagr": safe_float(cagr * 100),
        "upi": safe_float(upi),
        "stdev": safe_float(stdev * 100)
    }

def get_performance_summary(returns: pd.Series, full_returns: pd.Series = None) -> Dict:
    """
    Get return for Day, Week (5 trading days), Month (21 trading days), and YTD.
    """
    if returns.empty:
         return {"day": 0.0, "week": 0.0, "month": 0.0, "ytd": 0.0}
         
    # Day
    day_ret = returns.iloc[-1]
    
    # Week (last 5 days)
    if len(returns) >= 5:
        week_ret = (1 + returns.iloc[-5:]).prod() - 1
    else:
        week_ret = (1 + returns).prod() - 1

    # Month (last 21 days)
    if len(returns) >= 21:
        month_ret = (1 + returns.iloc[-21:]).prod() - 1
    else:
        month_ret = (1 + returns).prod() - 1

    # Helper to safe float (duplicated to avoid scope issues or move to global)
    def safe_float(val):
        try:
            if np.isnan(val) or np.isinf(val):
                return 0.0
            return float(round(val, 2))
        except:
            return 0.0
            
    # YTD Calculation (requires full_returns)
    ytd_ret = 0.0
    if full_returns is not None and not full_returns.empty:
        # Filter full_returns to current year
        current_year = datetime.now().year
        # Returns indices are usually datetime/timestamps
        try:
            ytd_series = full_returns[full_returns.index.year == current_year]
            if not ytd_series.empty:
                ytd_ret = (1 + ytd_series).prod() - 1
        except Exception as e:
            logger.error(f"YTD Calculation Error: {e}")

    return {
        "day": safe_float(day_ret * 100),
        "week": safe_float(week_ret * 100),
        "month": safe_float(month_ret * 100),
        "ytd": safe_float(ytd_ret * 100)
    }

def get_all_tickers_summary(portfolios: List[any]) -> List[Dict]:
    """
    Get summary of all unique tickers across all portfolios.
    Returns: [{ticker, name, models, price, change_percent, date}]
    """
    ticker_portfolios = {}
    for p in portfolios:
        # Filter for non-zero allocations only
        for ticker, weight in p.allocations.items():
            if weight > 0:
                if ticker not in ticker_portfolios:
                    ticker_portfolios[ticker] = set()
                ticker_portfolios[ticker].add(p.name)
            
    unique_tickers = list(ticker_portfolios.keys())
    if not unique_tickers:
        return []

    # Manual Cache for Price Data (5 mins)
    global PRICE_CACHE
    current_time = datetime.now()
    
    # Check cache validity
    cache_key = tuple(sorted(unique_tickers))
    if 'PRICE_CACHE' not in globals():
        PRICE_CACHE = {}
        
    cached_entry = PRICE_CACHE.get(cache_key)
    if cached_entry:
        timestamp, cached_data = cached_entry
        if (current_time - timestamp).total_seconds() < 300: # 5 minutes
            data = cached_data
        else:
            cached_entry = None

    if not cached_entry:
        # Batch fetch data (Price)
        try:
            data = yf.download(unique_tickers, period="5d", group_by='ticker', threads=False, progress=False)
            PRICE_CACHE[cache_key] = (current_time, data)
        except Exception as e:
            logger.error(f"Batch download failed: {e}")
            return []

    # Batch fetch names (Metadata) - SEQUENTIAL to avoid rate limits/hanging
    # Optimization: lru_cache helps subsequent calls
    
    summary = []
    
    for ticker in unique_tickers:
        # Extract DataFrame for this ticker
        try:
            if len(unique_tickers) > 1:
                if ticker not in data.columns:
                     continue
                df = data[ticker]
            else:
                df = data
            
            # Check if empty or all NaNs
            if df.empty or df['Close'].dropna().empty:
                continue
                
            # Get valid rows
            df = df.dropna(subset=['Close'])
            
            last_date = df.index[-1].strftime("%Y-%m-%d")
            last_close = df['Close'].iloc[-1]
            
            change_pct = 0.0
            if len(df) >= 2:
                prev_close = df['Close'].iloc[-2]
                change_pct = (last_close - prev_close) / prev_close
                
            # Fetch Info for Name (Sequential)
            fund_name = fetch_ticker_name(ticker)

            summary.append({
                "ticker": ticker,
                "name": fund_name,
                "models": sorted(list(ticker_portfolios[ticker])),
                "price": float(round(last_close, 2)),
                "change_percent": float(round(change_pct * 100, 2)),
                "date": last_date
            })
        except Exception as e:
            # logger.error(f"Error processing {ticker}: {e}")
            continue
        
    # Sort by ticker
    summary.sort(key=lambda x: x['ticker'])
    return summary
