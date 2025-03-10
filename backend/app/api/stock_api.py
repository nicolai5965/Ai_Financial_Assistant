"""
FastAPI server for stock analysis endpoints.
This module provides REST API endpoints for stock data analysis and visualization.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, timedelta
import logging

from ..stock_analysis.stock_data_fetcher import fetch_stock_data
from ..stock_analysis.stock_data_charting import analyze_ticker
from ..core.logging_config import get_logger

# Get the logger
logger = get_logger()

# Create FastAPI application
app = FastAPI(
    title="Stock Analysis API",
    description="API for analyzing and visualizing stock market data",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request model
class StockAnalysisRequest(BaseModel):
    """
    Request model for stock analysis.
    """
    ticker: str = Field(..., description="Stock ticker symbol (e.g., 'AAPL')")
    days: Optional[int] = Field(10, description="Number of days to look back")
    interval: str = Field("1d", description="Data interval (e.g., '1d', '1h', '5m', '1m', '1wk', '1mo')")
    indicators: List[str] = Field(default=[], description="List of technical indicators to include")
    chart_type: str = Field("candlestick", description="Chart type: 'candlestick' or 'line'")

# Create API endpoints
@app.post("/api/stocks/analyze")
async def analyze_stock(request: StockAnalysisRequest):
    """
    Analyze stock data and return a visualization.
    
    Args:
        request: StockAnalysisRequest containing analysis parameters
        
    Returns:
        JSON: Plotly figure JSON representation
    """
    try:
        logger.info(f"Analyzing stock data for {request.ticker} with {request.interval} interval")
        
        # Calculate date range
        end_date = date.today() + timedelta(days=1)  # Add 1 day because yfinance treats end date as exclusive
        start_date = end_date - timedelta(days=request.days)
        
        # Validate interval and days
        interval_max_days = {
            "1m": 7,
            "2m": 60,
            "5m": 60,
            "15m": 60,
            "30m": 60,
            "1h": 730
            # "1d", "1wk", and "1mo" have no maximum day limits
        }
        
        if request.interval in interval_max_days:
            max_allowed = interval_max_days[request.interval]
            if request.days > max_allowed:
                logger.warning(f"Requested {request.days} days for interval {request.interval}, but max allowed is {max_allowed}")
                start_date = end_date - timedelta(days=max_allowed)
        
        # Fetch stock data
        tickers = [request.ticker]
        stock_data = fetch_stock_data(tickers, start_date, end_date, request.interval)
        
        if not stock_data or request.ticker not in stock_data:
            logger.error(f"No data found for ticker {request.ticker}")
            raise HTTPException(status_code=404, detail=f"No data found for ticker {request.ticker}")
        
        # Use the stock data directly without filtering
        ticker_data = stock_data[request.ticker]
        
        if ticker_data.empty:
            logger.error(f"No trading data found for {request.ticker}")
            raise HTTPException(status_code=404, detail=f"No trading data found for {request.ticker}")
        
        # Generate chart
        fig = analyze_ticker(
            request.ticker, 
            ticker_data, 
            request.indicators, 
            request.interval,
            chart_type=request.chart_type
        )
        
        # Convert to JSON
        chart_json = fig.to_json()
        
        return JSONResponse(content={"chart": chart_json, "ticker": request.ticker})
    
    except Exception as e:
        logger.exception(f"Error processing stock analysis request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

# Simple health check endpoint
@app.get("/api/health")
async def health_check():
    """
    Health check endpoint to verify the API is running.
    """
    return {"status": "healthy", "service": "stock-analysis-api"}

# Error handling
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for the API.
    """
    logger.exception(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    ) 