"""
Fundamental-related KPI calculations.

This module provides functions for retrieving and calculating fundamental-related
KPIs for a given stock ticker, including market capitalization, P/E ratio,
EPS, dividend yield, debt-to-equity ratio, and ROE.
"""

from typing import Dict, Any, List, Optional, Union, Tuple
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from app.core.logging_config import get_logger
from app.stock_analysis.kpi.kpi_utils import (
    sanitize_ticker,
    fetch_ticker_info,
    fetch_ticker_history,
    format_kpi_value,
    safe_calculation
)

# Initialize the logger
logger = get_logger()

@safe_calculation
def get_market_cap(ticker: str) -> Dict[str, Any]:
    """
    Get the market capitalization KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with market cap KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get market cap
    market_cap = info.get('marketCap')
    
    # Log the result
    if market_cap is not None:
        logger.debug(f"Market cap for {ticker}: {market_cap:,}")
    else:
        logger.warning(f"Could not retrieve market cap for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": "Market Capitalization",
        "value": format_kpi_value(
            market_cap, 
            "currency_large", 
            {"decimal_places": 2, "currency": "$"}
        ),
        "description": f"Total market value of {ticker}'s outstanding shares",
        "group": "fundamental"
    }

@safe_calculation
def get_pe_ratio(ticker: str) -> Dict[str, Any]:
    """
    Get the Price-to-Earnings (P/E) ratio KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with P/E ratio KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get P/E ratio
    pe_ratio = info.get('trailingPE')
    
    # If trailing P/E is not available, try forward P/E
    if pe_ratio is None:
        pe_ratio = info.get('forwardPE')
        pe_type = "Forward"
    else:
        pe_type = "Trailing"
    
    # Log the result
    if pe_ratio is not None:
        logger.debug(f"{pe_type} P/E ratio for {ticker}: {pe_ratio:.2f}")
    else:
        logger.warning(f"Could not retrieve P/E ratio for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": f"{pe_type} P/E Ratio",
        "value": format_kpi_value(
            pe_ratio, 
            "number", 
            {"decimal_places": 2}
        ),
        "description": f"{pe_type} Price-to-Earnings ratio for {ticker}. Lower values may indicate undervaluation.",
        "group": "fundamental"
    }

@safe_calculation
def get_eps(ticker: str) -> Dict[str, Any]:
    """
    Get the Earnings Per Share (EPS) KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with EPS KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get trailing EPS
    eps = info.get('trailingEps')
    eps_type = "Trailing"
    
    # If trailing EPS is not available, try forward EPS
    if eps is None:
        eps = info.get('forwardEps')
        eps_type = "Forward"
    
    # Get growth rate if available
    eps_growth = info.get('earningsGrowth')
    
    # Log the result
    if eps is not None:
        logger.debug(f"{eps_type} EPS for {ticker}: {eps:.2f}")
        if eps_growth is not None:
            logger.debug(f"EPS growth rate for {ticker}: {eps_growth:.2%}")
    else:
        logger.warning(f"Could not retrieve EPS for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": f"{eps_type} EPS",
        "value": format_kpi_value(
            eps, 
            "currency", 
            {"decimal_places": 2, "currency": "$"}
        ),
        "trend": eps_growth,
        "trend_label": f"{eps_growth*100:.1f}% growth" if eps_growth is not None else None,
        "description": f"{eps_type} Earnings Per Share for {ticker}",
        "group": "fundamental"
    }

@safe_calculation
def get_dividend_yield(ticker: str) -> Dict[str, Any]:
    """
    Get the dividend yield KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with dividend yield KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get dividend yield
    dividend_yield = info.get('dividendYield') / 100
    
    # Get dividend rate
    dividend_rate = info.get('dividendRate')
    
    # Log the result
    if dividend_yield is not None:
        logger.debug(f"Dividend yield for {ticker}: {dividend_yield:.2%}")
        if dividend_rate is not None:
            logger.debug(f"Dividend rate for {ticker}: ${dividend_rate:.2f}")
    else:
        logger.warning(f"Could not retrieve dividend yield for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": "Dividend Yield",
        "value": format_kpi_value(
            dividend_yield, 
            "percentage", 
            {"decimal_places": 2}
        ),
        "secondary_value": format_kpi_value(
            dividend_rate, 
            "currency", 
            {"decimal_places": 2, "currency": "$"}
        ) if dividend_rate is not None else None,
        "secondary_label": "Annual Rate" if dividend_rate is not None else None,
        "description": f"Annual dividend yield for {ticker}",
        "group": "fundamental"
    }

@safe_calculation
def get_debt_to_equity(ticker: str) -> Dict[str, Any]:
    """
    Get the debt-to-equity ratio KPI for a ticker.
    
    Calculates as Total Debt / Shareholders' Equity.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with debt-to-equity ratio KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Initialize debt-to-equity ratio
    debt_to_equity = None
    
    # First, try to calculate it ourselves using total debt and total equity
    # This is the most accurate method: Total Debt / Shareholders' Equity
    total_debt = info.get('totalDebt')
    total_equity = info.get('totalShareholderEquity')
    
    if total_debt is not None and total_equity is not None and total_equity != 0:
        debt_to_equity = total_debt / total_equity
        logger.debug(f"Calculated debt-to-equity for {ticker} from fundamentals: {debt_to_equity:.2f}")
    else:
        # If we can't calculate it ourselves, try to get the pre-calculated value
        debt_to_equity = info.get('debtToEquity')
        
        if debt_to_equity is not None:
            # Yahoo Finance provides debtToEquity as a percentage like 12.95 (for 12.95%)
            # Convert to a decimal ratio to match our description (0.1295)
            debt_to_equity = debt_to_equity / 100
            logger.debug(f"Using provided debt-to-equity for {ticker}: {debt_to_equity:.4f}")
        else:
            logger.warning(f"Could not calculate debt-to-equity for {ticker}, no data available")
    
    # Return the formatted KPI
    return {
        "name": "Debt-to-Equity Ratio",
        "value": format_kpi_value(
            debt_to_equity, 
            "number", 
            {"decimal_places": 2, "show_color": True, "reverse_color": True}
        ),
        "description": f"Debt-to-equity ratio (Total Debt / Shareholders' Equity) for {ticker}. Lower values indicate less financial leverage.",
        "group": "fundamental"
    }

@safe_calculation
def get_roe(ticker: str) -> Dict[str, Any]:
    """
    Get the Return on Equity (ROE) KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with ROE KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get ROE
    roe = info.get('returnOnEquity')
    
    # Log the result
    if roe is not None:
        logger.debug(f"ROE for {ticker}: {roe:.2%}")
    else:
        logger.warning(f"Could not retrieve ROE for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": "Return on Equity (ROE)",
        "value": format_kpi_value(
            roe, 
            "percentage", 
            {"decimal_places": 2, "show_color": True}
        ),
        "description": f"Return on Equity (net income / shareholders' equity) for {ticker}. Higher values indicate better profitability.",
        "group": "fundamental"
    }

@safe_calculation
def get_price_to_book(ticker: str) -> Dict[str, Any]:
    """
    Get the Price-to-Book (P/B) ratio KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with P/B ratio KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get P/B ratio
    pb_ratio = info.get('priceToBook')
    
    # Log the result
    if pb_ratio is not None:
        logger.debug(f"P/B ratio for {ticker}: {pb_ratio:.2f}")
    else:
        logger.warning(f"Could not retrieve P/B ratio for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": "Price-to-Book Ratio",
        "value": format_kpi_value(
            pb_ratio, 
            "number", 
            {"decimal_places": 2}
        ),
        "description": f"Price-to-Book ratio for {ticker}. Values < 1 may indicate undervaluation.",
        "group": "fundamental"
    }

@safe_calculation
def get_price_to_sales(ticker: str) -> Dict[str, Any]:
    """
    Get the Price-to-Sales (P/S) ratio KPI for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with P/S ratio KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    # Fetch the ticker info
    info = fetch_ticker_info(ticker)
    
    # Get P/S ratio
    ps_ratio = info.get('priceToSalesTrailing12Months')
    
    # Log the result
    if ps_ratio is not None:
        logger.debug(f"P/S ratio for {ticker}: {ps_ratio:.2f}")
    else:
        logger.warning(f"Could not retrieve P/S ratio for {ticker}")
    
    # Return the formatted KPI
    return {
        "name": "Price-to-Sales Ratio",
        "value": format_kpi_value(
            ps_ratio, 
            "number", 
            {"decimal_places": 0}
        ),
        "description": f"Price-to-Sales ratio for {ticker}. Lower values may indicate undervaluation.",
        "group": "fundamental"
    }

def get_all_fundamental_metrics(ticker: str) -> Dict[str, Any]:
    """
    Get all fundamental-related KPIs for a ticker.
    
    Args:
        ticker: The ticker symbol
        
    Returns:
        Dictionary with all fundamental KPI data
    """
    # Sanitize the ticker
    ticker = sanitize_ticker(ticker)
    
    logger.info(f"Fetching all fundamental metrics for {ticker}")
    
    # Get individual KPIs
    market_cap = get_market_cap(ticker)
    pe_ratio = get_pe_ratio(ticker)
    eps = get_eps(ticker)
    dividend_yield = get_dividend_yield(ticker)
    debt_to_equity = get_debt_to_equity(ticker)
    roe = get_roe(ticker)
    pb_ratio = get_price_to_book(ticker)
    ps_ratio = get_price_to_sales(ticker)
    
    # Combine into a group result
    metrics = []
    
    if market_cap:
        metrics.append(market_cap)
    
    if pe_ratio:
        metrics.append(pe_ratio)
    
    if eps:
        metrics.append(eps)
    
    if dividend_yield:
        metrics.append(dividend_yield)
    
    if debt_to_equity:
        metrics.append(debt_to_equity)
    
    if roe:
        metrics.append(roe)
    
    if pb_ratio:
        metrics.append(pb_ratio)
    
    if ps_ratio:
        metrics.append(ps_ratio)
    
    # Return organized result
    return {
        "group": "fundamental",
        "title": "Fundamental & Valuation Metrics",
        "description": "Metrics related to company fundamentals and valuation",
        "metrics": metrics
    }
