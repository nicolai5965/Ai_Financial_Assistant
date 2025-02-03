from pytrends.request import TrendReq
import time
import asyncio
from llm_handler import LLMHandler
from datetime import datetime, timezone, timedelta
from langchain.schema import SystemMessage, HumanMessage
from dotenv import load_dotenv
import pandas as pd
import warnings
from tabulate import tabulate

# ===========================
# Load Environment Variables
# ===========================
load_dotenv()

# Suppress FutureWarnings from pandas and pytrends
warnings.simplefilter("ignore", category=FutureWarning)

# ===========================
# Predefined Keywords List
# ===========================
TRENDING_KEYWORDS = [
    # AI & Machine Learning
    "Artificial Intelligence", "Machine Learning", "Deep Learning", "Neural Networks", 
    "GPT", "LLM", "OpenAI", "Anthropic", "Stable Diffusion", "AI Ethics", "Reinforcement Learning", 
    "NLP", "Computer Vision", "AI Regulation", "AI Bias", "AGI", "Federated Learning", 
    "AutoGPT", "AI Agents", "AI Hardware",

    # Tech & Semiconductors
    "NVIDIA", "AMD", "Intel", "TSMC", "ARM", "RISC-V", "Chip Shortage", "AI Chips", "Quantum Processors", 
    "Moore's Law", "5nm Chips", "3nm Chips", "Edge Computing", "Cloud Computing", "Meta", "Google DeepMind", 
    "Apple AI", "AI Smartphones", "Tesla FSD", "AI in Healthcare",

    # Nuclear Energy & Fusion
    "Nuclear Fusion", "ITER", "Tokamak", "Plasma Confinement", "Helion Energy", "General Fusion", 
    "Small Modular Reactors", "Thorium Reactors", "Fusion Breakthrough", "Neutron Capture",

    # Quantum Computing
    "Quantum Computing", "Qubit", "Quantum Supremacy", "IBM Quantum", "Google Quantum", 
    "Quantum Cryptography", "Quantum Entanglement", "Quantum Key Distribution", "Superconducting Qubits",
    "Trapped Ion Qubits", "Photonic Quantum Computing"
]

class GoogleTrendsMonitor:
    def __init__(self, config):
        print("[INFO] Initializing GoogleTrendsMonitor...")
        self.config = config
        self.pytrends = TrendReq(hl='en-US', tz=360)
        self.previous_trend_data = {}
        self.debug_mode = config.get('debug_mode', False)
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
        print(f"[INFO] Fetching trends for batch: {batch}")
        max_retries = 3
        retry_delay = 0.5  # seconds
        
        for attempt in range(max_retries):
            try:
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, self._sync_fetch_batch, batch)
                # Add delay between successful batches
                await asyncio.sleep(1)  # 1 second delay between batches
                return result
            except Exception as e:
                if "429" in str(e):
                    wait_time = (attempt + 1) * retry_delay
                    print(f"[WARNING] Rate limit hit. Waiting {wait_time} seconds before retry {attempt + 1}/{max_retries}")
                    await asyncio.sleep(wait_time)
                else:
                    print(f"[ERROR] Unexpected error in fetch_batch: {e}")
                    raise e
                
        print(f"[ERROR] Failed to fetch batch after {max_retries} retries: {batch}")
        return None

    def _sync_fetch_batch(self, batch):
        """Synchronous function for fetching Google Trends data in a batch."""
        try:
            self.pytrends.build_payload(batch, cat=0, timeframe='now 7-d', geo=self.config['region'], gprop='')
            trends = self.pytrends.interest_over_time()
            if not trends.empty:
                return trends.drop(columns=['isPartial'], errors='ignore')
        except Exception as e:
            raise Exception(f"The request failed: {str(e)}")
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
        
        for keyword in trends.columns:  # Changed from self.config['keywords'] to trends.columns
            col_data = trends[keyword]
            
            if isinstance(col_data, pd.DataFrame):
                col_data = col_data.mean(axis=1)
            
            col_data = col_data.dropna()
            
            if not col_data.empty:
                current_value = col_data.iloc[-1]
                past_values = col_data.iloc[:-1]
                
                if not past_values.empty:
                    avg_past_value = past_values.mean()
                    
                    if avg_past_value == 0:
                        spike_score = 0
                    else:
                        spike_score = (current_value - avg_past_value) / avg_past_value
                    
                    # Store all spike scores, not just those above threshold
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
                {'Keyword': k, 'Spike Score (%)': v, 'Above Threshold': v > self.config['spike_threshold'] * 100}
                for k, v in spike_details.items()
            ])
            spike_df = spike_df.sort_values('Spike Score (%)', ascending=False).head(10)
            print(tabulate(spike_df, headers='keys', tablefmt='pretty', showindex=False))
            print(f"\nSpike Threshold: {self.config['spike_threshold'] * 100}%")
        else:
            print("No trend data available")

    def generate_report_topic(self, spikes):
        """Generate a short textual report topic based on detected spikes."""
        if not spikes:
            return "No significant spikes detected"
        return f"AI/Tech Discussion Spike Detected in: {', '.join(spikes)}"
    
    async def run_monitor(self):
        """Main function to fetch trends asynchronously and check for spikes."""
        print("[INFO] Running Google Trends Monitor...")
        trends = await self.fetch_trends()
        if trends is not None:
            spikes = self.detect_spike(trends)
            
            if spikes:
                print("[INFO] Generating report topic...")
                report_topic = self.generate_report_topic(spikes)
                output_data = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "trending_keywords": spikes,
                    "generated_topic": report_topic
                }
                print("[SUCCESS] Output Data:", output_data)  # Later, this can be stored in a database

def main():
    print("[INFO] Starting Google Trends Monitor...")  # Ensure script starts
    config = {
        "keywords": TRENDING_KEYWORDS,
        "region": "US",
        "spike_threshold": 0.15,  # Adjusted to 15% increase threshold
        "refresh_interval_minutes": 15,  # In minutes
        "time_interval": 3,
        "llm_provider": "openai",
        "max_tokens": 1024,
        "temperature": 0.2,
        "debug_mode": True
    }

    # Convert refresh_interval from minutes to milliseconds
    config["refresh_interval"] = config["refresh_interval_minutes"] * 60 * 1000

    monitor = GoogleTrendsMonitor(config)
    
    try:
        asyncio.run(monitor.run_monitor())
    except Exception as e:
        print(f"[ERROR] Exception during execution: {e}")

if __name__ == "__main__":
    main()
