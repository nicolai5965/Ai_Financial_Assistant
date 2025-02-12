import os
import time
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
import sys
import argparse

# Load environment variables
load_dotenv()


class ArticleFetcher:
    """
    A class responsible for fetching and extracting article text from a URL.
    """
    def __init__(self):
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/98.0.4758.102 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }
    
    def fetch_article_text(self, url):
        """
        Fetch the text content from an article URL.

        Args:
            url (str): The URL to fetch.
            
        Returns:
            str: The extracted article text.
            
        Raises:
            requests.exceptions.RequestException: If there's an error fetching the article.
            ValueError: If the article text cannot be extracted.
        """
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()  # Raises an exception for bad status codes
        
        soup = BeautifulSoup(response.content, 'html.parser')
        article_text = soup.get_text(strip=True)
        
        if not article_text:
            raise ValueError("Could not extract text from the article")
            
        return article_text


class InvestmentTopicAnalyzer:
    """
    A class that uses a Language Model to analyze an article and generate investment topics.
    """
    def __init__(self, model="gemini-2.0-flash", time_interval="7", google_api_key=None):
        """
        Initialize the analyzer.

        Args:
            model (str): The model name.
            time_interval (str): The time window (in days) used in search topic prompts.
            google_api_key (str): Your API key for the LLM.
        """
        # Ensure environment variables are loaded
        load_dotenv()
        self.google_api_key = google_api_key or os.getenv("GEMINI_API_KEY")
        self.llm = ChatGoogleGenerativeAI(model=model, google_api_key=self.google_api_key, temperature=0)
        self.time_interval = time_interval

        # System prompt instructs the LLM on its role and desired output format.
        self.system_prompt = (
            f"""You are a financial analysis assistant with expertise in generating research topics for investment reports.

Your task is to analyze the provided article, generate a concise summary of its key points, and then create a unified search topic that highlights the potential investment implications of the article.
Evaluate whether the article contains signals that warrant further investigation for potential future investment opportunities.
Output your answer as valid JSON with the following keys:

- "summary": A brief paragraph summarizing the article.
- "search_topic": A unified topic statement that encapsulates the article's implications. (For inspiration, consider examples like:
    1) "NVIDIA's AI Innovations and Their Impact on Stock Valuations Over the Past {self.time_interval} Days."
    2) "How Recent Semiconductor Developments Are Shaping Market Sentiment in Tech Stocks Over the Past {self.time_interval} Days."
    3) "Stock Market Reactions to the Latest Trends in Quantum Computing and AI Over the Past {self.time_interval} Days."
Use these as inspiration to generate a topic that reflects the article's implications over the past {self.time_interval} days.)
- "should_investigate": "Yes" if the article suggests that a deeper investigation might uncover promising future investment opportunities, otherwise "No".

JSON output:
{{
    "summary": "Brief summary of the article",
    "search_topic": "Unified search topic",
    "should_investigate": "Yes" or "No"
}}
"""
        )

        # Human prompt template where the article text is inserted.
        self.human_prompt_template = (
            """Please analyze the following article and provide your analysis enclosed in square brackets [ ].
Article content:
[
{article_text}
]
Follow the system instructions: generate a concise summary, create a unified search topic that reflects the investment implications, and decide whether the article suggests that further investigation is warranted (indicate this in the 'should_investigate' field as "Yes" or "No").
"""
        )


    def generate_analysis(self, article_text):
        """
        Generate an analysis based on the article text.

        Args:
            article_text (str): The text content of the article.
            
        Returns:
            dict: A dictionary containing the LLM response along with metadata.
        """
        # Fill in the human prompt with the article text.
        human_prompt = self.human_prompt_template.format(article_text=article_text)
        # Combine system and human prompts.
        full_prompt = f"System: {self.system_prompt}\n\nHuman: {human_prompt}"

        start = time.time()
        response = self.llm.invoke(full_prompt)
        latency = time.time() - start

        return {
            "content": response.content,
            "metadata": response.response_metadata,
            "usage": response.usage_metadata,
            "run_id": response.id,
            "latency": latency,
            "json": response.to_json()
        }


def analyze_article(url, time_interval="3", test_mode=False):
    """
    Fetches an article from the given URL, analyzes it using the InvestmentTopicAnalyzer, 
    and returns the result.

    Args:
        url (str): The URL of the article to analyze.
        time_interval (str): Time interval (in days) for context in analysis.
        test_mode (bool): If True, returns detailed analysis (including metadata), otherwise returns only the content.

    Returns:
        dict or str: Analysis result as a dictionary (if test_mode is True) or string (if test_mode is False).

    Raises:
        Exception: Propagates any exceptions from fetching or analyzing the article.
    """
    fetcher = ArticleFetcher()
    article_text = fetcher.fetch_article_text(url)
    
    analyzer = InvestmentTopicAnalyzer(time_interval=time_interval)
    analysis_result = analyzer.generate_analysis(article_text)
    
    if test_mode == True:
        print("Test mode is on!")
        print("--------------------------------")
        print("JSON: "  , analysis_result["json"])
        print("Metadata: ", analysis_result["metadata"])
        print("Usage: ", analysis_result["usage"])
        print("Run ID: ", analysis_result["run_id"])
        print("Latency: ", analysis_result["latency"])
        return "--------------------------------"
        
    else:
        content = analysis_result["content"]
        # Remove markdown formatting if present
        if content.startswith('```json'):
            content = content[7:-3]  # Strip out markdown markers
        return content


def main():
    """
    CLI entry point for running the investment topic analyzer.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', type=str, required=True,
                        help='URL of the article to analyze')
    parser.add_argument('--time_interval', type=str, default="3",
                        help='Time interval (in days) for generating the analysis')
    parser.add_argument('--test', action='store_true', default=False,
                        help='Run in test mode with detailed output')
    args = parser.parse_args()

    try:
        result = analyze_article(url=args.url, time_interval=args.time_interval, test_mode=args.test)
        print(result)
    except (requests.exceptions.RequestException, ValueError) as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
