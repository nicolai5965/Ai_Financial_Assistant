import yfinance as yf
import pandas as pd
import plotly.graph_objects as go
import tempfile
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from ..services.llm.llm_handler import LLMHandler
from ..core.logging_config import get_logger

# Load environment variables from .env file
# Required environment variables for this script:
# - GEMINI_API_KEY: API key for Google Gemini model used in stock analysis
load_dotenv()

# Get the configured logger
logger = get_logger()

# --- Default Configuration ---
# Input for multiple stock tickers (comma-separated)
DEFAULT_TICKERS = "AAPL,MSFT,GOOG"
tickers = [ticker.strip().upper() for ticker in DEFAULT_TICKERS.split(",") if ticker.strip()]

# Set the date range: start date = one year before today, end date = today
end_date_default = datetime.today()
start_date_default = end_date_default - timedelta(days=365)
start_date = start_date_default.date()  # Using only the date part
end_date = end_date_default.date()

# Technical indicators selection (applied to every ticker)
# You can adjust or extend this list as needed.
indicators = ["20-Day SMA"]


def fetch_stock_data(tickers, start_date, end_date):
    """Fetches stock data for each ticker using yfinance."""
    stock_data = {}
    for ticker in tickers:
        print(f"Fetching data for {ticker} from {start_date} to {end_date}...")
        data = yf.download(ticker, start=start_date, end=end_date)
        if not data.empty:
            stock_data[ticker] = data
        else:
            print(f"Warning: No data found for {ticker}.")
    print("Stock data loaded successfully for:", ", ".join(stock_data.keys()))
    return stock_data


def analyze_ticker(ticker, data, indicators):
    """Builds a candlestick chart with technical indicators, calls the Gemini API, and returns the chart and result."""
    print(f"Analyzing {ticker}...")
    # Build candlestick chart
    fig = go.Figure(data=[
        go.Candlestick(
            x=data.index,
            open=data['Open'],
            high=data['High'],
            low=data['Low'],
            close=data['Close'],
            name="Candlestick"
        )
    ])

    # Function to add technical indicators to the chart
    def add_indicator(indicator):
        if indicator == "20-Day SMA":
            sma = data['Close'].rolling(window=20).mean()
            fig.add_trace(go.Scatter(x=data.index, y=sma, mode='lines', name='SMA (20)'))
        elif indicator == "20-Day EMA":
            ema = data['Close'].ewm(span=20).mean()
            fig.add_trace(go.Scatter(x=data.index, y=ema, mode='lines', name='EMA (20)'))
        elif indicator == "20-Day Bollinger Bands":
            sma = data['Close'].rolling(window=20).mean()
            std = data['Close'].rolling(window=20).std()
            bb_upper = sma + 2 * std
            bb_lower = sma - 2 * std
            fig.add_trace(go.Scatter(x=data.index, y=bb_upper, mode='lines', name='BB Upper'))
            fig.add_trace(go.Scatter(x=data.index, y=bb_lower, mode='lines', name='BB Lower'))
        elif indicator == "VWAP":
            data['VWAP'] = (data['Close'] * data['Volume']).cumsum() / data['Volume'].cumsum()
            fig.add_trace(go.Scatter(x=data.index, y=data['VWAP'], mode='lines', name='VWAP'))
    
    for ind in indicators:
        add_indicator(ind)
    fig.update_layout(xaxis_rangeslider_visible=False)

    # Save chart as a temporary PNG file and read its bytes
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmpfile:
        fig.write_image(tmpfile.name)
        tmpfile_path = tmpfile.name
    with open(tmpfile_path, "rb") as f:
        image_bytes = f.read()
    os.remove(tmpfile_path)

    image_part = {
        "data": image_bytes,
        "mime_type": "image/png"
    }

    # Prepare the analysis prompt for the Gemini API
    analysis_prompt = (
        f"You are a Stock Trader specializing in Technical Analysis at a top financial institution. "
        f"Analyze the stock chart for {ticker} based on its candlestick chart and the displayed technical indicators. "
        f"Provide a detailed justification of your analysis, explaining what patterns, signals, and trends you observe. "
        f"Then, based solely on the chart, provide a recommendation from the following options: "
        f"'Strong Buy', 'Buy', 'Weak Buy', 'Hold', 'Weak Sell', 'Sell', or 'Strong Sell'. "
        f"Return your output as a JSON object with two keys: 'action' and 'justification'."
    )

    # Initialize the LLM handler with the Google provider
    try:
        llm_handler = LLMHandler(
            llm_provider="google",
            max_tokens=1024, 
            temperature=0.0,
            model_name="gemini-2.0-flash"  # Using Gemini Flash model
        )
        logger.info(f"LLM handler initialized for analyzing {ticker}")
    except Exception as e:
        logger.error(f"Failed to initialize LLM handler: {str(e)}")
        return fig, {"action": "Error", "justification": f"LLM initialization error: {str(e)}"}

    # Build the contents payload with both text and image parts
    contents = [
        {"role": "user", "parts": [analysis_prompt]},
        {"role": "user", "parts": [image_part]}
    ]

    try:
        # Use the appropriate method from the LLM handler to process the request
        # Note: Since we're using the Google LLM, we need to access the underlying model
        # The LLMHandler creates a LangChain wrapper, but for image analysis we need direct access
        response = llm_handler.language_model.client.generate_content(contents=contents)
        
        # Parse JSON output from the API response
        result_text = response.text
        json_start_index = result_text.find('{')
        json_end_index = result_text.rfind('}') + 1  # Include the closing brace
        if json_start_index != -1 and json_end_index > json_start_index:
            json_string = result_text[json_start_index:json_end_index]
            result = json.loads(json_string)
        else:
            raise ValueError("No valid JSON object found in the response")
    except json.JSONDecodeError as e:
        result = {"action": "Error", "justification": f"JSON Parsing error: {e}. Raw response text: {response.text}"}
        logger.error(f"JSON Parsing error for {ticker}: {e}")
    except ValueError as ve:
        result = {"action": "Error", "justification": f"Value Error: {ve}. Raw response text: {response.text}"}
        logger.error(f"Value Error for {ticker}: {ve}")
    except Exception as e:
        result = {"action": "Error", "justification": f"General Error: {e}"}
        logger.error(f"General error during {ticker} analysis: {e}")

    return fig, result


def main():
    # Fetch stock data for the defined tickers and date range
    stock_data = fetch_stock_data(tickers, start_date, end_date)
    if not stock_data:
        print("No stock data available. Exiting.")
        return

    overall_results = []
    for ticker in stock_data:
        data = stock_data[ticker]
        fig, result = analyze_ticker(ticker, data, indicators)
        overall_results.append({"Stock": ticker, "Recommendation": result.get("action", "N/A")})
        
        # Save the chart to a PNG file for each ticker
        chart_file = f"{ticker}_chart.png"
        fig.write_image(chart_file)
        print(f"Chart for {ticker} saved to {chart_file}.")
        print(f"Detailed Justification for {ticker}:")
        print(result.get("justification", "No justification provided."))
        print("\n---------------------\n")

    # Print overall summary of recommendations
    print("Overall Structured Recommendations:")
    for item in overall_results:
        print(f"Stock: {item['Stock']}, Recommendation: {item['Recommendation']}")


if __name__ == "__main__":
    main()
