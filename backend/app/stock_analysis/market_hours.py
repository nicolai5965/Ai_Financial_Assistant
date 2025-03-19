import datetime
import pytz
from typing import Dict, List, Optional, Tuple, Union
import pandas_market_calendars as mcal

class MarketHoursTracker:
    """
    A class for tracking stock market hours and providing countdown information
    for when markets open or close based on the ticker's exchange.
    """
    
    # Dictionary mapping exchanges to their respective market calendar names
    EXCHANGE_MAPPINGS = {
        "NYSE": "NYSE",
        "NASDAQ": "NASDAQ",
        "AMEX": "NYSE",  # American Stock Exchange follows NYSE calendar
        "OTC": "NYSE",   # Over-the-counter typically follows NYSE
        "TSX": "TSX",    # Toronto Stock Exchange
        "LSE": "LSE",    # London Stock Exchange
        "HKEX": "HKEX",  # Hong Kong Exchange
        "SSE": "SSE",    # Shanghai Stock Exchange
        "SZSE": "SZSE",  # Shenzhen Stock Exchange
        "JPX": "JPX",    # Japan Exchange Group
    }
    
    # Default exchange to use if the ticker's exchange cannot be determined
    DEFAULT_EXCHANGE = "NYSE"
    
    def __init__(self):
        """Initialize the MarketHoursTracker with market calendars."""
        # Pre-load common market calendars for efficiency
        self.calendars = {}
        for exchange in set(self.EXCHANGE_MAPPINGS.values()):
            try:
                self.calendars[exchange] = mcal.get_calendar(exchange)
            except Exception:
                # If a calendar isn't available, we'll handle it gracefully later
                pass
    
    def _get_exchange_for_ticker(self, ticker: str) -> str:
        """
        Determine the appropriate exchange for a given ticker.
        This is a simplified implementation and might need enhancement with a proper
        ticker-to-exchange mapping database or API.
        
        Args:
            ticker: The stock ticker symbol
            
        Returns:
            The exchange identifier string
        """
        # This is a simplified version - in a production environment,
        # you would want a more comprehensive lookup system
        ticker = ticker.upper()
        
        # Basic pattern matching to guess the exchange
        if "." in ticker:
            suffix = ticker.split(".")[-1]
            if suffix == "L":
                return "LSE"
            elif suffix == "TO":
                return "TSX"
            elif suffix == "HK":
                return "HKEX"
            # Add more exchange suffix mappings as needed
        
        # Default to NYSE for US tickers without a specific suffix
        return self.DEFAULT_EXCHANGE
    
    def _get_calendar(self, exchange: str):
        """
        Get the appropriate market calendar for the given exchange.
        
        Args:
            exchange: The exchange identifier
            
        Returns:
            A pandas_market_calendars calendar object
        """
        cal_name = self.EXCHANGE_MAPPINGS.get(exchange, self.DEFAULT_EXCHANGE)
        
        if cal_name in self.calendars:
            return self.calendars[cal_name]
        
        # If we haven't loaded this calendar yet, try to load it now
        try:
            calendar = mcal.get_calendar(cal_name)
            self.calendars[cal_name] = calendar
            return calendar
        except Exception:
            # Fall back to NYSE if the requested calendar isn't available
            return self.calendars.get(self.DEFAULT_EXCHANGE)
    
    def get_market_hours(self, ticker: str, date: Optional[datetime.date] = None) -> Dict:
        """
        Get the market hours for a specific ticker on a given date.
        
        Args:
            ticker: The stock ticker symbol
            date: The date to check (defaults to today)
            
        Returns:
            A dictionary containing market hours information
        """
        # Use today's date if none provided
        if date is None:
            date = datetime.datetime.now(pytz.UTC).date()
        
        # Determine the exchange and get its calendar
        exchange = self._get_exchange_for_ticker(ticker)
        calendar = self._get_calendar(exchange)
        
        # Get the schedule for the given date
        schedule = calendar.schedule(start_date=date, end_date=date)
        
        # Check if the market is open on this date
        if schedule.empty:
            return {
                "is_trading_day": False,
                "market_open": None,
                "market_close": None,
                "exchange": exchange,
                "ticker": ticker
            }
        
        # Extract the market open and close times
        market_open = schedule.iloc[0]['market_open'].to_pydatetime()
        market_close = schedule.iloc[0]['market_close'].to_pydatetime()
        
        return {
            "is_trading_day": True,
            "market_open": market_open,
            "market_close": market_close,
            "exchange": exchange,
            "ticker": ticker
        }
    
    def get_market_status(self, ticker: str) -> Dict:
        """
        Get the current status of the market for a specific ticker.
        
        Args:
            ticker: The stock ticker symbol
            
        Returns:
            A dictionary with market status information
        """
        # Get the current time in UTC
        now = datetime.datetime.now(pytz.UTC)
        today = now.date()
        
        # Get market hours for today
        market_hours = self.get_market_hours(ticker, today)
        
        # If today is not a trading day, check tomorrow
        if not market_hours["is_trading_day"]:
            # Find the next trading day
            next_day = today + datetime.timedelta(days=1)
            while True:
                next_market_hours = self.get_market_hours(ticker, next_day)
                if next_market_hours["is_trading_day"]:
                    # Calculate time until market opens
                    time_until_open = next_market_hours["market_open"] - now
                    seconds_until_open = time_until_open.total_seconds()
                    
                    return {
                        "is_market_open": False,
                        "next_state_change": next_market_hours["market_open"],
                        "seconds_until_change": seconds_until_open,
                        "next_state": "open",
                        "exchange": market_hours["exchange"],
                        "ticker": ticker,
                        "current_time": now
                    }
                next_day += datetime.timedelta(days=1)
        
        # If we have market hours for today
        market_open = market_hours["market_open"]
        market_close = market_hours["market_close"]
        
        # Check if market is currently open
        is_open = market_open <= now <= market_close
        
        if is_open:
            # Market is open, calculate time until close
            time_until_close = market_close - now
            seconds_until_close = time_until_close.total_seconds()
            
            return {
                "is_market_open": True,
                "next_state_change": market_close,
                "seconds_until_change": seconds_until_close,
                "next_state": "close",
                "exchange": market_hours["exchange"],
                "ticker": ticker,
                "current_time": now
            }
        elif now < market_open:
            # Market will open later today
            time_until_open = market_open - now
            seconds_until_open = time_until_open.total_seconds()
            
            return {
                "is_market_open": False,
                "next_state_change": market_open,
                "seconds_until_change": seconds_until_open,
                "next_state": "open",
                "exchange": market_hours["exchange"],
                "ticker": ticker,
                "current_time": now
            }
        else:
            # Market closed for today, find next trading day
            next_day = today + datetime.timedelta(days=1)
            while True:
                next_market_hours = self.get_market_hours(ticker, next_day)
                if next_market_hours["is_trading_day"]:
                    # Calculate time until market opens
                    time_until_open = next_market_hours["market_open"] - now
                    seconds_until_open = time_until_open.total_seconds()
                    
                    return {
                        "is_market_open": False,
                        "next_state_change": next_market_hours["market_open"],
                        "seconds_until_change": seconds_until_open,
                        "next_state": "open",
                        "exchange": market_hours["exchange"],
                        "ticker": ticker,
                        "current_time": now
                    }
                next_day += datetime.timedelta(days=1)

    def get_trading_schedule(self, ticker: str, start_date: datetime.date, end_date: datetime.date) -> List[Dict]:
        """
        Get the trading schedule for a specific ticker over a date range.
        
        Args:
            ticker: The stock ticker symbol
            start_date: The start date for the schedule
            end_date: The end date for the schedule
            
        Returns:
            A list of dictionaries with trading day information
        """
        exchange = self._get_exchange_for_ticker(ticker)
        calendar = self._get_calendar(exchange)
        
        # Get the schedule for the given date range
        schedule = calendar.schedule(start_date=start_date, end_date=end_date)
        
        results = []
        for _, row in schedule.iterrows():
            results.append({
                "date": row.index.date(),
                "market_open": row['market_open'].to_pydatetime(),
                "market_close": row['market_close'].to_pydatetime(),
                "exchange": exchange,
                "ticker": ticker
            })
        
        return results 