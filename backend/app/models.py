from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import declarative_base
from pydantic import BaseModel
from typing import List, Dict, Optional

Base = declarative_base()

# SQLAlchemy Models for DB
class PortfolioDB(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    # allocation will be stored as JSON: {"SPY": 0.6, "AGG": 0.4}
    # This represents the CURRENT target allocation
    allocations = Column(JSON)
    # history will be stored as JSON list: [{"date": "2023-01-01", "allocations": {...}}]
    history = Column(JSON, default=list)
    category = Column(String, default="Balanced")

# Pydantic Models for API
class AllocationItem(BaseModel):
    ticker: str
    weight: float

class RebalanceEvent(BaseModel):
    date: str
    allocations: Dict[str, float]

class PortfolioCreate(BaseModel):
    name: str
    allocations: Dict[str, float]  # e.g., {"SPY": 60.0, "AGG": 40.0}
    category: str = "Balanced"
    history: Optional[List[RebalanceEvent]] = []

class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    allocations: Optional[Dict[str, float]] = None
    category: Optional[str] = None
    history: Optional[List[RebalanceEvent]] = None

class PortfolioResponse(BaseModel):
    id: int
    name: str
    allocations: Dict[str, float]
    category: str
    history: List[RebalanceEvent] = []

    class Config:
        from_attributes = True

class TickerData(BaseModel):
    date: str
    close: float
    daily_return: float

class PortfolioPerformance(BaseModel):
    date: str
    portfolio_value: float # Normalized to 100 start
    daily_return: float

class UPIMetrics(BaseModel):
    ui: float # Ulcer Index
    max_drawdown: float
    total_return: float
    cagr: float
    upi: float
