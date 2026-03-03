"""
Ticker price cache: stores historical price data in the database
so only new/missing data needs to be fetched from yfinance.
"""

from sqlalchemy import Column, Integer, String, Float, Date, UniqueConstraint
from sqlalchemy.orm import Session
from .models import Base
import pandas as pd
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class TickerPriceCache(Base):
    __tablename__ = "ticker_price_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True, nullable=False)
    date = Column(Date, nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)
    
    __table_args__ = (
        UniqueConstraint('ticker', 'date', name='uq_ticker_date'),
    )


def get_last_cached_date(db: Session, ticker: str):
    """Get the most recent cached date for a ticker."""
    result = db.query(TickerPriceCache.date)\
        .filter(TickerPriceCache.ticker == ticker)\
        .order_by(TickerPriceCache.date.desc())\
        .first()
    return result[0] if result else None


def get_cached_prices(db: Session, ticker: str, start_date=None) -> pd.DataFrame:
    """Read cached prices from DB, optionally filtering by start_date."""
    query = db.query(TickerPriceCache)\
        .filter(TickerPriceCache.ticker == ticker)
    
    if start_date:
        query = query.filter(TickerPriceCache.date >= start_date)
    
    query = query.order_by(TickerPriceCache.date)
    rows = query.all()
    
    if not rows:
        return pd.DataFrame()
    
    data = [{
        'Date': row.date,
        'Open': row.open,
        'High': row.high,
        'Low': row.low,
        'Close': row.close,
        'Volume': row.volume,
    } for row in rows]
    
    df = pd.DataFrame(data)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.set_index('Date')
    return df


def update_cache(db: Session, ticker: str, df: pd.DataFrame):
    """Insert or update price data in the cache."""
    if df.empty:
        return
    
    count = 0
    for date, row in df.iterrows():
        # Convert timestamp to date
        if hasattr(date, 'date'):
            cache_date = date.date()
        else:
            cache_date = date
        
        # Check if row already exists
        existing = db.query(TickerPriceCache)\
            .filter(TickerPriceCache.ticker == ticker,
                    TickerPriceCache.date == cache_date)\
            .first()
        
        if existing:
            # Update
            existing.open = float(row.get('Open', 0) or 0)
            existing.high = float(row.get('High', 0) or 0)
            existing.low = float(row.get('Low', 0) or 0)
            existing.close = float(row.get('Close', 0) or 0)
            existing.volume = float(row.get('Volume', 0) or 0)
        else:
            # Insert
            new_row = TickerPriceCache(
                ticker=ticker,
                date=cache_date,
                open=float(row.get('Open', 0) or 0),
                high=float(row.get('High', 0) or 0),
                low=float(row.get('Low', 0) or 0),
                close=float(row.get('Close', 0) or 0),
                volume=float(row.get('Volume', 0) or 0),
            )
            db.add(new_row)
            count += 1
    
    db.commit()
    if count > 0:
        logger.info(f"Cached {count} new price rows for {ticker}")


def get_ticker_count(db: Session, ticker: str) -> int:
    """Get the number of cached rows for a ticker."""
    return db.query(TickerPriceCache)\
        .filter(TickerPriceCache.ticker == ticker)\
        .count()
