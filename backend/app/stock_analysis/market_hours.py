import datetime
import pytz
from typing import Dict, List, Optional
import pandas_market_calendars as mcal
import yfinance as yf

class MarketHoursTracker:
    """
    A class for tracking stock market hours and providing countdown information
    for when markets open or close based on the ticker's exchange.
    """
    
    # Use a default exchange in case the lookup fails.
    DEFAULT_EXCHANGE = "NYSE"
    
    def __init__(self):
        """Initialize the MarketHoursTracker with market calendars."""
        self.calendars = {}
        # Pre-load the default market calendar for efficiency.
        try:
            self.calendars[self.DEFAULT_EXCHANGE] = mcal.get_calendar(self.DEFAULT_EXCHANGE)
        except Exception:
            pass
    
    @staticmethod
    def normalize_exchange_name(exchange: str) -> str:
        """
        Normalizes the exchange name returned by yfinance to the format expected by pandas_market_calendars.
        You can easily extend the normalization_map if further discrepancies are discovered.
        """
        normalization_map = {
            'NasdaqGS': 'NASDAQ',   # Convert NasdaqGS to NASDAQ
            'NasdaqCM': 'NASDAQ',   # Convert NasdaqCM to NASDAQ
            'New York Stock Exchange': 'NYSE',
            'NYSE': 'NYSE',
            # Add additional mappings as needed.
        }
        return normalization_map.get(exchange, exchange)
    
    def _get_exchange_for_ticker(self, ticker: str) -> str:
        """
        Determine the appropriate exchange for a given ticker using yfinance's fullExchangeName.
        
        Args:
            ticker: The stock ticker symbol.
            
        Returns:
            The normalized exchange identifier string.
        """
        ticker = ticker.upper()
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            full_exchange_name = info.get('fullExchangeName', None)
            if full_exchange_name:
                return self.normalize_exchange_name(full_exchange_name)
            else:
                return self.DEFAULT_EXCHANGE
        except Exception as e:
            print(f"Error retrieving ticker info for {ticker}: {e}")
            return self.DEFAULT_EXCHANGE
    
    def _get_calendar(self, exchange: str):
        """
        Get the appropriate market calendar for the given exchange.
        
        Args:
            exchange: The normalized exchange identifier.
            
        Returns:
            A pandas_market_calendars calendar object.
        """
        if exchange in self.calendars:
            return self.calendars[exchange]
        try:
            calendar = mcal.get_calendar(exchange)
            self.calendars[exchange] = calendar
            return calendar
        except Exception:
            try:
                calendar = mcal.get_calendar(self.DEFAULT_EXCHANGE)
                self.calendars[self.DEFAULT_EXCHANGE] = calendar
                return calendar
            except Exception:
                return None
    
    def get_market_hours(self, ticker: str, date: Optional[datetime.date] = None) -> Dict:
        """
        Get the market hours for a specific ticker on a given date.
        
        Args:
            ticker: The stock ticker symbol.
            date: The date to check (defaults to today).
            
        Returns:
            A dictionary containing market hours information.
        """
        if date is None:
            date = datetime.datetime.now(pytz.UTC).date()
        
        # Determine the exchange using the new approach.
        exchange = self._get_exchange_for_ticker(ticker)
        calendar = self._get_calendar(exchange)
        if calendar is None:
            return {
                "is_trading_day": False,
                "market_open": None,
                "market_close": None,
                "exchange": exchange,
                "ticker": ticker
            }
        
        schedule = calendar.schedule(start_date=date, end_date=date)
        if schedule.empty:
            return {
                "is_trading_day": False,
                "market_open": None,
                "market_close": None,
                "exchange": exchange,
                "ticker": ticker
            }
        
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
            ticker: The stock ticker symbol.
            
        Returns:
            A dictionary with market status information.
        """
        now = datetime.datetime.now(pytz.UTC)
        today = now.date()
        
        market_hours = self.get_market_hours(ticker, today)
        if not market_hours["is_trading_day"]:
            # Look for the next trading day if today is not a trading day.
            next_day = today + datetime.timedelta(days=1)
            while True:
                next_market_hours = self.get_market_hours(ticker, next_day)
                if next_market_hours["is_trading_day"]:
                    time_until_open = next_market_hours["market_open"] - now
                    seconds_until_open = time_until_open.total_seconds()
                    
                    return {
                        "is_market_open": False,
                        "next_state_change": next_market_hours["market_open"],
                        "seconds_until_change": seconds_until_open,
                        "next_state": "open",
                        "exchange": next_market_hours["exchange"],
                        "ticker": ticker,
                        "current_time": now
                    }
                next_day += datetime.timedelta(days=1)
        
        market_open = market_hours["market_open"]
        market_close = market_hours["market_close"]
        
        if market_open <= now <= market_close:
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
            next_day = today + datetime.timedelta(days=1)
            while True:
                next_market_hours = self.get_market_hours(ticker, next_day)
                if next_market_hours["is_trading_day"]:
                    time_until_open = next_market_hours["market_open"] - now
                    seconds_until_open = time_until_open.total_seconds()
                    
                    return {
                        "is_market_open": False,
                        "next_state_change": next_market_hours["market_open"],
                        "seconds_until_change": seconds_until_open,
                        "next_state": "open",
                        "exchange": next_market_hours["exchange"],
                        "ticker": ticker,
                        "current_time": now
                    }
                next_day += datetime.timedelta(days=1)
    
    def get_trading_schedule(self, ticker: str, start_date: datetime.date, end_date: datetime.date) -> List[Dict]:
        """
        Get the trading schedule for a specific ticker over a date range.
        
        Args:
            ticker: The stock ticker symbol.
            start_date: The start date for the schedule.
            end_date: The end date for the schedule.
            
        Returns:
            A list of dictionaries with trading day information.
        """
        exchange = self._get_exchange_for_ticker(ticker)
        calendar = self._get_calendar(exchange)
        if calendar is None:
            return []
        
        schedule = calendar.schedule(start_date=start_date, end_date=end_date)
        results = []
        for index, row in schedule.iterrows():
            results.append({
                "date": index.date(),
                "market_open": row['market_open'].to_pydatetime(),
                "market_close": row['market_close'].to_pydatetime(),
                "exchange": exchange,
                "ticker": ticker
            })
        return results
