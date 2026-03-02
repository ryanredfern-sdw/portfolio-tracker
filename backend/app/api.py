from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, services
from .database import get_db
from typing import List, Dict

router = APIRouter()

@router.get("/health")
def health_check():
    from .database import DB_PATH
    return {"status": "ok", "db_path": str(DB_PATH)}

@router.post("/portfolios/", response_model=models.PortfolioResponse)
def create_portfolio(portfolio: models.PortfolioCreate, db: Session = Depends(get_db)):
    try:
        # Sanitize tickers in allocations
        sanitized_allocations = {k.replace('$', '').strip().upper(): v for k, v in portfolio.allocations.items()}

        # Use .dict() or model_dump() depending on pydantic version, sticking to safe access
        db_portfolio = models.PortfolioDB(
            name=portfolio.name, 
            allocations=sanitized_allocations,
            category=portfolio.category,
            history=portfolio.history
        )
        db.add(db_portfolio)
        db.commit()
        db.refresh(db_portfolio)
        return db_portfolio
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/portfolios/", response_model=List[models.PortfolioResponse])
def read_portfolios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    portfolios = db.query(models.PortfolioDB).offset(skip).limit(limit).all()
    return portfolios

@router.put("/portfolios/{portfolio_id}", response_model=models.PortfolioResponse)
def update_portfolio(portfolio_id: int, portfolio_update: models.PortfolioUpdate, db: Session = Depends(get_db)):
    db_portfolio = db.query(models.PortfolioDB).filter(models.PortfolioDB.id == portfolio_id).first()
    if not db_portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Update fields that are allowed to be updated
    if portfolio_update.name is not None:
        db_portfolio.name = portfolio_update.name
    if portfolio_update.allocations is not None:
        db_portfolio.allocations = portfolio_update.allocations
    if portfolio_update.category is not None:
        db_portfolio.category = portfolio_update.category
    if portfolio_update.history is not None:
        # Pydantic List[RebalanceEvent] -> JSON list of dicts
        # SQLAlchemy JSON column usually handles list of Pydantic models automatically? 
        # No, better convert to dict.
        db_portfolio.history = [h.dict() for h in portfolio_update.history]
    
    db.commit()
    db.refresh(db_portfolio)
    return db_portfolio

@router.delete("/portfolios/{portfolio_id}")
def delete_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    db_portfolio = db.query(models.PortfolioDB).filter(models.PortfolioDB.id == portfolio_id).first()
    if not db_portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    db.delete(db_portfolio)
    db.commit()
    return {"status": "deleted", "id": portfolio_id}

@router.get("/portfolios/{portfolio_id}/performance")
def get_portfolio_performance(portfolio_id: int, period: str = "2y", db: Session = Depends(get_db)):
    portfolio = db.query(models.PortfolioDB).filter(models.PortfolioDB.id == portfolio_id).first()
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Calculate returns
    history = portfolio.history if portfolio.history else []
    
    # Ensure history is list of dicts (it should be from JSON column)
    returns_df, metadata = services.calculate_portfolio_returns(portfolio.allocations, period=period, history=history)
    
    if returns_df.empty:
         # raise HTTPException(status_code=400, detail="Could not calculate returns (no data)")
         return {
             "metrics": {}, 
             "performance": {}, 
             "chart": [], 
             "is_up_to_date": False,
             "missing_tickers": metadata.get("missing_tickers", []),
             "error": metadata.get("error")
         }

    # Calculate metrics
    upi_metrics = services.calculate_upi(returns_df['daily_return'])
    perf_summary = services.get_performance_summary(returns_df['daily_return'], full_returns=metadata.get("full_returns"))
    
    # Prepare chart data (cumulative return)
    cumulative_returns = (1 + returns_df['daily_return']).cumprod()
    chart_data = []
    # Convert index (timestamp) to string safely
    for date, value in cumulative_returns.items():
        chart_data.append({"date": date.strftime("%Y-%m-%d"), "value": float(value)})
        
    return {
        "name": portfolio.name,
        "category": portfolio.category,
        "metrics": upi_metrics,
        "performance": perf_summary,
        "chart": chart_data,
        "is_up_to_date": metadata.get("is_up_to_date", False),
        "missing_tickers": metadata.get("missing_tickers", []),
        "error": metadata.get("error")
    }

@router.get("/portfolios/compare")
def compare_portfolios(period: str = "2y", db: Session = Depends(get_db)):
    portfolios = db.query(models.PortfolioDB).all()
    results = []
    
    for p in portfolios:
        try:
            history = p.history if p.history else []
            # Calculate returns
            returns_df, metadata = services.calculate_portfolio_returns(p.allocations, period=period, history=history)
            if returns_df.empty:
                continue
                
            metrics = services.calculate_upi(returns_df['daily_return'])
            perf_summary = services.get_performance_summary(returns_df['daily_return'], full_returns=metadata.get("full_returns"))
            
            # Combine info
            results.append({
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "total_return": metrics.get("total_return", 0),
                "cagr": metrics.get("cagr", 0),
                "stdev": metrics.get("stdev", 0),
                "max_drawdown": metrics.get("max_drawdown", 0),
                "upi": metrics.get("upi", 0),
                "ui": metrics.get("ui", 0),
                "day": perf_summary.get("day", 0),
                "week": perf_summary.get("week", 0),
                "month": perf_summary.get("month", 0),
                "ytd": perf_summary.get("ytd", 0)
            })
        except Exception as e:
            # import traceback
            # traceback.print_exc()
            print(f"Error calculating metrics for {p.name}: {e}")
            continue
            
    # Sort by UPI descending by default
    results.sort(key=lambda x: x["upi"], reverse=True)
    return results

@router.get("/tickers/summary")
def get_tickers_summary(db: Session = Depends(get_db)):
    portfolios = db.query(models.PortfolioDB).all()
    summary = services.get_all_tickers_summary(portfolios)
    return summary

@router.get("/tickers/{ticker}")
def check_ticker(ticker: str):
    df = services.fetch_ticker_data(ticker, period="1mo")
    if df.empty:
        raise HTTPException(status_code=404, detail="Ticker not found")
    
    last_close = df.iloc[-1]['Close']
    return {"ticker": ticker, "last_close": last_close}
