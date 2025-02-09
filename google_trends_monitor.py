from pytrends.request import TrendReq
import asyncio
from llm_handler import LLMHandler
from datetime import datetime, timezone, timedelta
from langchain.schema import SystemMessage, HumanMessage
from dotenv import load_dotenv
import pandas as pd
import warnings
from tabulate import tabulate
from datetime import timedelta
import time

# ===========================
# Load Environment Variables
# ===========================
load_dotenv()

# Suppress FutureWarnings from pandas and pytrends
warnings.simplefilter("ignore", category=FutureWarning)

# ===========================
# Predefined Keywords by Sector
# ===========================
TRENDING_KEYWORDS = {
    # Tech Giants
    "Tech Giants": [
        "Apple", "Microsoft", "Amazon", "Alphabet", "Meta"
    ],
    # Semiconductor Leaders
    "Semiconductor Leaders": [
        "NVIDIA", "AMD", "Intel", "TSMC", "Qualcomm"
    ],
    # AI Innovators
    "AI Innovators": [
        "OpenAI", "Anthropic", "DeepMind", "Cerebras", "Hugging Face"
    ],
    # Cloud & Software
    "Cloud & Software": [
        "Salesforce", "Oracle", "Adobe", "SAP", "ServiceNow"
    ],
    # Automotive & Autonomous
    "Automotive & Autonomous": [
        "Tesla", "Waymo", "NIO", "Lucid Motors", "GM Cruise"
    ],
    # Quantum Computing
    "Quantum Computing": [
        "IBM Quantum", "D-Wave", "IonQ", "Rigetti Computing Inc", "Google Quantum"
    ],
    # Renewable Energy
    "Renewable Energy": [
        "NextEra Energy", "Enphase Energy", "SolarEdge", "First Solar", "SunPower"
    ]
}


class GoogleTrendsMonitor:
    def __init__(self, config):
        self.debug_mode = config.get('debug_mode', False)
        print("[INFO] Initializing GoogleTrendsMonitor...")
        self.config = config
        
        # Process sectors if provided in config. Default to ["All"].
        sectors = self.config.get("sectors", ["All"])
        if isinstance(sectors, list) and len(sectors) == 1 and sectors[0].lower() == "all":
            # Flatten all keywords from all sectors
            self.config["keywords"] = []
            for sector_keywords in TRENDING_KEYWORDS.values():
                self.config["keywords"].extend(sector_keywords)
        elif isinstance(sectors, list):
            # Use only the keywords from the specified sectors
            self.config["keywords"] = []
            for sector in sectors:
                if sector.lower() == "all":
                    # If "All" is included, add all keywords
                    for sector_keywords in TRENDING_KEYWORDS.values():
                        self.config["keywords"].extend(sector_keywords)
                elif sector in TRENDING_KEYWORDS:
                    self.config["keywords"].extend(TRENDING_KEYWORDS[sector])
                else:
                    if self.debug_mode:
                        print(f"[WARNING] Sector '{sector}' not found. Skipping.")
        else:
            # Fallback: use all sectors
            self.config["keywords"] = []
            for sector_keywords in TRENDING_KEYWORDS.values():
                self.config["keywords"].extend(sector_keywords)

        
        self.pytrends = TrendReq(hl='en-US', tz=360)
        self.previous_trend_data = {}
        # Initialize LLMHandler
        self.llm_handler = LLMHandler(
            llm_provider=config.get('llm_provider', 'openai'),
            max_tokens=config.get('max_tokens', 1024),
            temperature=config.get('temperature', 0.2),
            model_name=config.get('model_name')
        )
        
        # Set default time interval to 3 days if not specified
        self.time_interval = config.get('time_interval', 3)
    
    async def fetch_batch(self, batch):
        """Fetches Google Trends data for a batch of keywords asynchronously."""
        if self.debug_mode:
            print(f"[INFO] Fetching trends for batch: {batch}")
        max_retries = self.config.get('max_retries', 4)
        retry_delay = self.config.get('retry_delay', 0.75)  # seconds

        for attempt in range(max_retries):
            try:
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(None, self._sync_fetch_batch, batch)
                # Add sleep after successful fetch to avoid rate limiting
                await asyncio.sleep(2)  # Wait for 2 seconds between batches
                return result
            except Exception as e:
                if "429" in str(e):
                    wait_time = (attempt + 1) * retry_delay
                    if self.debug_mode:
                        print(f"[WARNING] Rate limit hit. Waiting {wait_time} seconds before retry {attempt + 1}/{max_retries}")
                    await asyncio.sleep(wait_time)
                else:
                    if self.debug_mode:
                        print(f"[ERROR] Unexpected error in fetch_batch: {e}")
                    raise e

        if self.debug_mode:
            print(f"[ERROR] Failed to fetch batch after {max_retries} retries: {batch}")
        return None

    def _sync_fetch_batch(self, batch):
        """Synchronous function for fetching Google Trends data in a batch."""
        try:
            self.pytrends.build_payload(batch, cat=0, timeframe=self.fixed_timeframe, geo=self.config['region'], gprop='')
            trends = self.pytrends.interest_over_time()
            if not trends.empty:
                return trends.drop(columns=['isPartial'], errors='ignore')
        except Exception as e:
            print(f"Error fetching batch {batch}: {e}")
            return None


    async def fetch_trends(self):
        """Fetches Google Trends data asynchronously in batches of 5 keywords."""
        print("[INFO] Fetching trends data...")
        keywords = self.config['keywords']
        batch_size = 5  # Google Trends only allows 5 keywords per request
        batches = [keywords[i:i+batch_size] for i in range(0, len(keywords), batch_size)]
        
        # Process batches with controlled concurrency
        semaphore = asyncio.Semaphore(3)  # Limit concurrent requests to 3
        
        async def fetch_with_semaphore(batch):
            async with semaphore:
                return await self.fetch_batch(batch)
        
        results = await asyncio.gather(*[fetch_with_semaphore(batch) for batch in batches])
        trend_data = [r for r in results if r is not None]
        
        if trend_data:
            print("[INFO] Successfully fetched trends data.")
            try:
                combined_df = pd.concat(trend_data, axis=1)
                combined_df = combined_df.apply(pd.to_numeric, errors='coerce')  # Ensure numeric columns
                
                # Resolve duplicate column names by averaging across duplicates
                combined_df = (
                    combined_df.T.groupby(level=0).mean()
                ).T

                if self.debug_mode:
                    self._print_debug_trends(combined_df)
                
                return combined_df
            except Exception as e:
                print(f"[ERROR] Error processing trend data: {e}")
                return None
        
        print("[WARNING] No trend data fetched.")
        return None

    def _print_debug_trends(self, trends_df):
        """Print debug information about the trends data."""
        print("\n=== DEBUG: Current vs Average Trends Data ===")
        
        # Calculate current and average values for each keyword
        debug_data = []
        for column in trends_df.columns:
            current_value = trends_df[column].iloc[-1]
            past_values = trends_df[column].iloc[:-1]
            avg_value = past_values.mean() if not past_values.empty else 0
            
            debug_data.append({
                'Keyword': column,
                'Current Value': round(current_value, 2),
                'Average Value': round(avg_value, 2),
                'Change (%)': round(((current_value - avg_value) / avg_value * 100 if avg_value != 0 else 0), 2)
            })
        
        debug_df = pd.DataFrame(debug_data)
        debug_df = debug_df.sort_values('Change (%)', ascending=False).head(10)
        print(tabulate(debug_df, headers='keys', tablefmt='pretty', showindex=False))


    def detect_spike(self, trends):
        """Detects a search spike based on the defined threshold and logs spike scores."""
        print("[INFO] Detecting spikes...")
        spikes_detected = []
        spike_details = {}
        
        # Use a minimum baseline for calculation to avoid huge percentages on near-zero values.
        min_baseline = 1.0
        # Skip processing keywords with very low average search volume.
        min_avg_threshold = self.config.get("min_avg_threshold", 5)  # default threshold of 5
        
        for keyword in trends.columns:
            col_data = trends[keyword]
            
            # If the column is a DataFrame, collapse it by taking the mean of each row.
            if isinstance(col_data, pd.DataFrame):
                col_data = col_data.mean(axis=1)
            
            col_data = col_data.dropna()
            
            if not col_data.empty:
                current_value = col_data.iloc[-1]
                past_values = col_data.iloc[:-1]
                
                if not past_values.empty:
                    avg_past_value = past_values.mean()
                    
                    # If the overall average is below our minimum threshold, skip this keyword.
                    if avg_past_value < min_avg_threshold:
                        if self.debug_mode:
                            print(f"[DEBUG] Skipping {keyword} due to low average volume: {avg_past_value}")
                        continue
                    
                    # Use the larger of avg_past_value or min_baseline for stable calculation.
                    baseline = avg_past_value if avg_past_value > min_baseline else min_baseline
                    spike_score = (current_value - baseline) / baseline
                    
                    # Save the spike percentage (spike_score * 100)
                    spike_details[keyword] = round(spike_score * 100, 2)
                    
                    if spike_score > self.config['spike_threshold']:
                        spikes_detected.append(keyword)
        
        if self.debug_mode:
            self._print_debug_spikes(spike_details)
        
        return spikes_detected

    def _print_debug_spikes(self, spike_details):
        """Print debug information about detected spikes."""
        print("\n=== DEBUG: Top 10 Trending Keywords by Spike Score ===")
        if spike_details:
            spike_df = pd.DataFrame([
                {'Keyword': k, 'Spike Score (%)': v, f'Above Threshold: {self.config["spike_threshold"] * 100}%': v > self.config['spike_threshold'] * 100}
                for k, v in spike_details.items()
            ])
            spike_df = spike_df.sort_values('Spike Score (%)', ascending=False).head(10)
            print(tabulate(spike_df, headers='keys', tablefmt='pretty', showindex=False))
            print(f"\nSpike Threshold: {self.config['spike_threshold'] * 100}%")
        else:
            print("No trend data available")


    def generate_report_topic(self, trending_keywords):
        """Generates a report topic based on trending keywords with an emphasis on stock market effects.
        
        Args:
            trending_keywords (list): List of keywords that are currently trending
            
        Returns:
            str: Generated report topic that focuses on how the trends impact the stock market.
        """
        if not trending_keywords:
            return "No significant trends detected."

        current_date = datetime.now(timezone.utc)
        date_limit = current_date - timedelta(days=self.time_interval)
        formatted_date = date_limit.strftime('%Y-%m-%d')

        system_prompt = SystemMessage(
            content=f"""You are an AI that generates concise and insightful report topics focused on stock market implications. 
            Your output should analyze how recent trends influence investor sentiment, stock price movements, and market dynamics. 
            Today's date is {current_date.strftime('%Y-%m-%d')}. Ensure the topic is relevant within the past {self.time_interval} days (since {formatted_date}) unless stated otherwise."""
                )

        human_prompt = HumanMessage(
            content=f"""Based on recent trends, generate a short, focused report topic that examines how the following trending keywords may affect the stock market:
            {', '.join(trending_keywords)}.
            Ensure that your topic is centered on market impact—such as shifts in stock valuations, investor sentiment, trading strategies, or overall market performance—within the past {self.time_interval} days (since {formatted_date}).

            Example search topics:
            1) "NVIDIA's AI Innovations and Their Impact on Stock Valuations Over the Past {self.time_interval} Days."
            2) "How Recent Semiconductor Developments Are Shaping Market Sentiment in Tech Stocks Over the Past {self.time_interval} Days."
            3) "Stock Market Reactions to the Latest Trends in Quantum Computing and AI Over the Past {self.time_interval} Days."
            4) "Evaluating the Influence of Recent Google Trends Spikes on the Performance of Stock Market Leaders Over the Past {self.time_interval} Days."
            5) "The Effect of Advances in Nuclear Fusion Technology on Energy Stocks Over the Past {self.time_interval} Days."

            These examples are for inspiration; generate one unified search topic that highlights the stock market's response to these trends and only the past {self.time_interval} days.. 
            If some keywords naturally cluster together, create a topic that reflects their combined market impact."""
                )

        response = self.llm_handler.language_model.invoke([system_prompt, human_prompt])
        return response.content if response and response.content else "No relevant topic could be generated."
    
    def _print_all_keywords_avg(self, trends_df):
        """Prints a table of all keywords and their average search volume (and current value),
        along with counts:
            - Total keywords configured.
            - Total keywords fetched.
            - Keywords with no data returned.
            - Keywords passing the minimum average threshold.
            - Keywords removed due to low average.
        """
        print("\n=== DEBUG: All Keywords and Their Average Values ===")
        
        # Step 1: Total keywords originally configured.
        total_configured = len(self.config["keywords"])
        configured_set = set(self.config["keywords"])
        
        # Step 2: Total keywords fetched (columns in trends_df).
        total_fetched = trends_df.shape[1]
        fetched_set = set(trends_df.columns)
        
        # Step 3: Determine which configured keywords did not return any data.
        missing_keywords = list(configured_set - fetched_set)
        missing_count = len(missing_keywords)
        
        # Step 4: Process fetched keywords to build the table and filter based on average.
        min_avg_threshold = self.config.get("min_avg_threshold", 5)
        passed_keywords = []
        removed_keywords = []
        all_data = []
        
        for column in trends_df.columns:
            current_value = trends_df[column].iloc[-1]
            past_values = trends_df[column].iloc[:-1]
            avg_value = past_values.mean() if not past_values.empty else 0
            
            all_data.append({
                'Keyword': column,
                'Current Value': round(current_value, 2),
                'Average Value': round(avg_value, 2)
            })
            
            if avg_value >= min_avg_threshold:
                passed_keywords.append(column)
            else:
                removed_keywords.append(column)
        
        passed_count = len(passed_keywords)
        removed_count = len(removed_keywords)
        
        # Step 5: Print out the counts.
        print(f"[DEBUG] Total Keywords Configured: {total_configured}")
        print(f"[DEBUG] Total Keywords Fetched: {total_fetched}")
        print(f"[DEBUG] Missing Keywords (No Data Returned): {missing_count}")
        if missing_keywords:
            print(f"[DEBUG] Missing Keywords: {', '.join(missing_keywords)}")
        print(f"[DEBUG] Keywords passing min average threshold ({min_avg_threshold}): {passed_count}")
        print(f"[DEBUG] Keywords removed due to low average: {removed_count}")
        
        # Step 6: Print the table of fetched keywords with their current and average values.
        all_df = pd.DataFrame(all_data)
        print(tabulate(all_df, headers='keys', tablefmt='pretty', showindex=False))

    async def run_monitor(self):
        """Main function to fetch trends asynchronously and check for spikes."""
        print("[INFO] Running Google Trends Monitor...")
        # Get the fixed timeframe as before...
        self.run_end_time = datetime.now(timezone.utc)
        time_window_minutes = self.config.get("time_window_minutes", 60)
        self.run_start_time = self.run_end_time - timedelta(minutes=time_window_minutes)
        run_start_hour = self.run_start_time.strftime('%Y-%m-%dT%H')
        run_end_hour = self.run_end_time.strftime('%Y-%m-%dT%H')
        self.fixed_timeframe = f"{run_start_hour} {run_end_hour}"
        
        if self.debug_mode:
            print(f"[DEBUG] Fixed Timeframe: {self.fixed_timeframe}")

        trends = await self.fetch_trends()
        if trends is not None:
            # New: Print a table of all keywords and their averages
            if self.debug_mode:
                self._print_all_keywords_avg(trends)
                
            spikes = self.detect_spike(trends)
            
            if spikes:
                print("[INFO] Generating report topic...")
                report_topic = self.generate_report_topic(spikes)
                output_data = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "trending_keywords": spikes,
                    "generated_topic": report_topic
                }
                print("[SUCCESS] Report Topic Generated")
                if self.debug_mode:
                    print("[SUCCESS] Output Data:", output_data)
                    print("[INFO] Report Topic:", report_topic)
                    print("[INFO] Trending Keywords:", spikes)


def main():
    print("[INFO] Starting Google Trends Monitor...")
    config = {
        "keywords": [],  # Will be set based on sectors below
        "region": "US",
        "spike_threshold": 0.10,  # How much the trend has to increase to be considered a spike
        "time_window_minutes": 3600,  # Query time window in minutes
        "time_interval": 3, # 3 days how long to look back for the trends
        "min_avg_threshold": 30,  # Only consider keywords with an average above a minimum threshold
        "llm_provider": "openai",
        "max_tokens": 1024,
        "temperature": 0.2,
        "debug_mode": True,
        "sectors": ["Semiconductor Leaders"],  # Change to a list like ["Tech & Semiconductors", "AI & Machine Learning"] to filter by sectors
        "max_retries": 4,    # Maximum number of retry attempts for failed requests
        "retry_delay": 1.5,  # Base delay between retries in seconds
        "request_sleep": 2
    }



    monitor = GoogleTrendsMonitor(config)
    
    try:
        asyncio.run(monitor.run_monitor())
    except Exception as e:
        print(f"[ERROR] Exception during execution: {e}")

if __name__ == "__main__":
    main()
