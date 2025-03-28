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
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        market_cap, 
        "currency_large", 
        {"decimal_places": 2, "currency": "$"}
    )

    # Create description
    description = (
        f"**What it is:** The total market value of {ticker}'s outstanding shares (Current Share Price x Total Outstanding Shares).\\n"
        f"**Trading Use:** Indicates the company's size (e.g., large-cap, mid-cap, small-cap), which influences risk, growth potential, and investor interest.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** Represents the market's current valuation of the entire company."
    )
    
    # Return the formatted KPI
    return {
        "name": "Market Capitalization",
        "value": formatted_value_obj,
        "description": description,
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
    pe_type = "Trailing (TTM)"
    
    # If trailing P/E is not available, try forward P/E
    if pe_ratio is None:
        pe_ratio = info.get('forwardPE')
        pe_type = "Forward"
    
    # Log the result
    if pe_ratio is not None:
        logger.debug(f"{pe_type} P/E ratio for {ticker}: {pe_ratio:.2f}")
    else:
        logger.warning(f"Could not retrieve P/E ratio for {ticker}")
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        pe_ratio, "number", {"decimal_places": 2}
    )

    # Create interpretation
    interpretation = "P/E ratio could not be determined."
    if pe_ratio is not None:
        if pe_ratio < 0:
            interpretation = f"The company has negative earnings, making the P/E ratio ({pe_ratio:.2f}) difficult to interpret directly."
        elif pe_ratio < 15:
            interpretation = f"The {pe_type} P/E ratio ({pe_ratio:.2f}) is relatively low, potentially indicating undervaluation or lower growth expectations."
        elif pe_ratio < 25:
            interpretation = f"The {pe_type} P/E ratio ({pe_ratio:.2f}) is moderate, suggesting a balance between price and earnings."
        else:
            interpretation = f"The {pe_type} P/E ratio ({pe_ratio:.2f}) is high, potentially indicating overvaluation or high growth expectations."

    # Create description
    what_it_is = f"**What it is:** The {pe_type} Price-to-Earnings ratio compares {ticker}'s current share price to its earnings per share."
    if pe_type == "Trailing (TTM)":
        what_it_is += " Based on the past 12 months of earnings."
    else: # Forward
        what_it_is += " Based on estimated future earnings."
    
    description = (
        f"{what_it_is}\\n"
        f"**Trading Use:** Used to assess valuation. A high P/E suggests investors expect higher earnings growth in the future compared to companies with a lower P/E.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation} (Context relative to industry and market average is important)."
    )
    
    # Return the formatted KPI
    return {
        "name": f"{pe_type} P/E Ratio",
        "value": formatted_value_obj,
        "description": description,
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
    eps_type = "Trailing (TTM)"
    
    # If trailing EPS is not available, try forward EPS
    if eps is None:
        eps = info.get('forwardEps')
        eps_type = "Forward"
    
    # Get growth rate if available (earningsQuarterlyGrowth seems more reliable than earningsGrowth)
    eps_growth = info.get('earningsQuarterlyGrowth')
    
    # Log the result
    if eps is not None:
        logger.debug(f"{eps_type} EPS for {ticker}: {eps:.2f}")
        if eps_growth is not None:
            logger.debug(f"Quarterly EPS growth rate for {ticker}: {eps_growth:.2%}")
    else:
        logger.warning(f"Could not retrieve EPS for {ticker}")
    
    # Format values
    formatted_value_obj = format_kpi_value(
        eps, "currency", {"currency": "$"}
    )
    formatted_growth_obj = format_kpi_value(
        eps_growth, "percentage", {"show_sign": True}
    ) if eps_growth is not None else None

    # Create interpretation
    interpretation = "EPS could not be determined."
    if eps is not None:
        if eps > 0:
            interpretation = f"The company is profitable on a per-share basis ({formatted_value_obj['formatted_value']})."
        else:
            interpretation = f"The company reported a loss per share ({formatted_value_obj['formatted_value']})."
        if formatted_growth_obj:
            interpretation += f" Recent quarterly earnings growth was {formatted_growth_obj['formatted_value']}."

    # Create description
    what_it_is = f"**What it is:** {eps_type} Earnings Per Share represents the portion of {ticker}'s profit allocated to each outstanding share of common stock."
    if eps_type == "Trailing (TTM)":
        what_it_is += " Based on the past 12 months."
    else: # Forward
        what_it_is += " Based on future estimates."

    description = (
        f"{what_it_is}\\n"
        f"**Trading Use:** A key indicator of profitability. Higher EPS is generally better. Growth in EPS is often seen positively by investors.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}"
        f"{' (Quarterly Growth: ' + formatted_growth_obj['formatted_value'] + ')' if formatted_growth_obj else ''}\\n"
        f"**Interpretation:** {interpretation}"
    )
    
    # Return the formatted KPI
    return {
        "name": f"{eps_type} EPS",
        "value": formatted_value_obj,
        "trend": eps_growth,
        "trend_label": f"{formatted_growth_obj['formatted_value']} Qtr Growth" if formatted_growth_obj else None,
        "description": description,
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
    
    # Get dividend yield (provided as decimal, e.g., 0.02 for 2%)
    dividend_yield = info.get('dividendYield')
    
    # Get dividend rate (annual amount per share)
    dividend_rate = info.get('dividendRate')
    
    # Log the result
    if dividend_yield is not None:
        logger.debug(f"Dividend yield for {ticker}: {dividend_yield:.2%}")
        if dividend_rate is not None:
            logger.debug(f"Dividend rate for {ticker}: ${dividend_rate:.2f}")
    else:
        logger.warning(f"Could not retrieve dividend yield for {ticker}")
    
    # Format values
    formatted_yield_obj = format_kpi_value(
        dividend_yield, "percentage", {"decimal_places": 2}
    )
    formatted_rate_obj = format_kpi_value(
        dividend_rate, "currency", {"currency": "$", "decimal_places": 2}
    ) if dividend_rate is not None else None

    # Create interpretation
    interpretation = "Dividend information not available or company does not pay dividends."
    if dividend_yield is not None and dividend_yield > 0:
        interpretation = f"{ticker} provides an annual dividend yield of {formatted_yield_obj['formatted_value']} relative to its current share price."
        if formatted_rate_obj:
             interpretation += f" This equates to {formatted_rate_obj['formatted_value']} per share annually."
    elif dividend_yield == 0:
        interpretation = f"{ticker} currently does not pay a dividend."

    # Create description
    description = (
        f"**What it is:** The annual dividend payment per share represented as a percentage of the stock's current market price for {ticker}.\\n"
        f"**Trading Use:** Measures the income return on an investment. Attractive to income-focused investors. A high yield might signal undervaluation or risk.\\n"
        f"**Current Data:** {formatted_yield_obj['formatted_value'] if formatted_yield_obj else 'N/A'}"
        f"{' (Annual Rate: ' + formatted_rate_obj['formatted_value'] + ')' if formatted_rate_obj else ''}\\n"
        f"**Interpretation:** {interpretation}"
    )
    
    # Return the formatted KPI
    return {
        "name": "Dividend Yield",
        "value": formatted_yield_obj,
        "secondary_value": formatted_rate_obj,
        "secondary_label": "Annual Rate" if formatted_rate_obj else None,
        "description": description,
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
    calculation_source = "Unavailable"
    
    # First, try to calculate it ourselves using total debt and total equity
    # This is the most accurate method: Total Debt / Shareholders' Equity
    total_debt = info.get('totalDebt')
    total_equity = info.get('totalShareholderEquity')
    
    if total_debt is not None and total_equity is not None and total_equity != 0:
        debt_to_equity = total_debt / total_equity
        calculation_source = "Calculated (Total Debt / Equity)"
        logger.debug(f"Calculated debt-to-equity for {ticker} from fundamentals: {debt_to_equity:.2f}")
    else:
        # If we can't calculate it ourselves, try to get the pre-calculated value
        yahoo_dte = info.get('debtToEquity')
        
        if yahoo_dte is not None:
            # Yahoo Finance provides debtToEquity as a percentage like 12.95 (for 12.95%)
            # Convert to a decimal ratio (0.1295)
            debt_to_equity = yahoo_dte / 100
            calculation_source = "Yahoo Finance (Provided Value)"
            logger.debug(f"Using provided debt-to-equity for {ticker}: {debt_to_equity:.4f}")
        else:
            logger.warning(f"Could not calculate or retrieve debt-to-equity for {ticker}")

    # Format the value
    formatted_value_obj = format_kpi_value(
        debt_to_equity, "number", {"show_color": True, "reverse_color": True}
    )

    # Create interpretation
    interpretation = "Debt-to-Equity ratio could not be determined."
    if debt_to_equity is not None:
        if debt_to_equity > 2.0: # Example threshold
            interpretation = f"The company has high financial leverage ({debt_to_equity:.2f}), indicating it uses significantly more debt than equity to finance assets. This can increase risk."
        elif debt_to_equity > 1.0:
            interpretation = f"The company has moderate financial leverage ({debt_to_equity:.2f}), using more debt than equity."
        else:
            interpretation = f"The company has low financial leverage ({debt_to_equity:.2f}), relying more on equity than debt. This generally implies lower financial risk."

    # Create description
    description = (
        f"**What it is:** Measures {ticker}'s financial leverage by comparing its total debt to its total shareholders' equity. (Source: {calculation_source})\\n"
        f"**Trading Use:** Assesses credit risk and how the company finances its assets. Lower ratios are generally considered safer, but context (industry norms) is important.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation}"
    )
    
    # Return the formatted KPI
    return {
        "name": "Debt-to-Equity Ratio",
        "value": formatted_value_obj,
        "description": description,
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
    
    # Get ROE (provided as decimal, e.g., 0.15 for 15%)
    roe = info.get('returnOnEquity')
    
    # Log the result
    if roe is not None:
        logger.debug(f"ROE for {ticker}: {roe:.2%}")
    else:
        logger.warning(f"Could not retrieve ROE for {ticker}")
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        roe, "percentage", {"show_color": True}
    )

    # Create interpretation
    interpretation = "Return on Equity could not be determined."
    if roe is not None:
        if roe > 0.20: # Example threshold
            interpretation = f"The company generates a high return ({formatted_value_obj['formatted_value']}) on shareholder investments, indicating strong profitability and efficiency."
        elif roe > 0.10:
            interpretation = f"The company generates a moderate return ({formatted_value_obj['formatted_value']}) on shareholder investments."
        elif roe > 0:
             interpretation = f"The company generates a low positive return ({formatted_value_obj['formatted_value']}) on shareholder investments."
        else:
             interpretation = f"The company has a negative return ({formatted_value_obj['formatted_value']}) on shareholder investments, indicating it lost money relative to shareholder equity."

    # Create description
    description = (
        f"**What it is:** Return on Equity measures {ticker}'s profitability by revealing how much profit a company generates with the money shareholders have invested. (Net Income / Average Shareholders' Equity)\\n"
        f"**Trading Use:** Assesses management effectiveness in using equity financing to generate profits. Higher ROE is generally better, but should be compared within the industry.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation}"
    )
    
    # Return the formatted KPI
    return {
        "name": "Return on Equity (ROE)",
        "value": formatted_value_obj,
        "description": description,
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
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        pb_ratio, "number", {"decimal_places": 2}
    )

    # Create interpretation
    interpretation = "Price-to-Book ratio could not be determined."
    if pb_ratio is not None:
        if pb_ratio < 1.0:
            interpretation = f"The stock price ({pb_ratio:.2f}) is less than its book value per share, potentially indicating undervaluation."
        elif pb_ratio < 3.0:
            interpretation = f"The stock price ({pb_ratio:.2f}) is moderately above its book value per share."
        else:
            interpretation = f"The stock price ({pb_ratio:.2f}) is significantly higher than its book value per share, suggesting the market values intangible assets or expects high future growth."

    # Create description
    description = (
        f"**What it is:** The Price-to-Book ratio compares {ticker}'s market capitalization to its book value (Assets - Liabilities).\\n"
        f"**Trading Use:** Used to find potentially undervalued stocks. A P/B ratio below 1 suggests the stock might be trading for less than its net asset value. Often compared within industries.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation} (Book value may not accurately reflect the value of service/tech companies with few physical assets)."
    )
    
    # Return the formatted KPI
    return {
        "name": "Price-to-Book Ratio",
        "value": formatted_value_obj,
        "description": description,
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
    
    # Get P/S ratio (Trailing Twelve Months)
    ps_ratio = info.get('priceToSalesTrailing12Months')
    
    # Log the result
    if ps_ratio is not None:
        logger.debug(f"P/S ratio (TTM) for {ticker}: {ps_ratio:.2f}")
    else:
        logger.warning(f"Could not retrieve P/S ratio (TTM) for {ticker}")
    
    # Format the value
    formatted_value_obj = format_kpi_value(
        ps_ratio, "number", {"decimal_places": 2} # Changed decimal places to 2 for better precision
    )

    # Create interpretation
    interpretation = "Price-to-Sales ratio could not be determined."
    if ps_ratio is not None:
        if ps_ratio < 1.0:
            interpretation = f"The stock price ({ps_ratio:.2f}) is less than its revenue per share over the last year, potentially indicating undervaluation."
        elif ps_ratio < 2.0:
            interpretation = f"The stock price ({ps_ratio:.2f}) is moderately above its revenue per share."
        else:
            interpretation = f"The stock price ({ps_ratio:.2f}) is significantly higher than its revenue per share, suggesting high market expectations for future growth or profitability."

    # Create description
    description = (
        f"**What it is:** The Price-to-Sales (TTM) ratio compares {ticker}'s market capitalization to its total sales or revenue over the past 12 months.\\n"
        f"**Trading Use:** Useful for valuing companies that are not yet profitable or have inconsistent earnings. Lower ratios may suggest undervaluation.\\n"
        f"**Current Data:** {formatted_value_obj['formatted_value'] if formatted_value_obj else 'N/A'}\\n"
        f"**Interpretation:** {interpretation} (Most effective when comparing against industry peers)."
    )
    
    # Return the formatted KPI
    return {
        "name": "Price-to-Sales Ratio (TTM)", # Clarified TTM
        "value": formatted_value_obj,
        "description": description,
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
