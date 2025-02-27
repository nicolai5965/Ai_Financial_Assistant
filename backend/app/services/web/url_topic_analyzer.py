import os
import time
from dotenv import load_dotenv
from app.services.llm.llm_handler import LLMHandler
import sys
import argparse
import logging
from typing import Dict, Union, Optional, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class URLTopicAnalyzer:
    """
    A class for analyzing URLs to determine their topics and relevance.
    Wraps the InvestmentTopicAnalyzer functionality.
    """
    
    def __init__(
        self, 
        model: str = "gemini-2.0-flash", 
        time_interval: str = "3", 
        llm_provider: str = "google",
        llm_api_key: Optional[str] = None,
        target_companies: Optional[List[str]] = None
    ):
        """
        Initialize the URLTopicAnalyzer.
        
        Args:
            model: The LLM model to use
            time_interval: Time interval for analysis
            llm_provider: The LLM provider to use
            llm_api_key: Optional API key for the LLM provider
            target_companies: Optional list of target companies to focus on
        """
        self.analyzer = InvestmentTopicAnalyzer(
            model=model,
            time_interval=time_interval,
            llm_provider=llm_provider,
            llm_api_key=llm_api_key,
            target_companies=target_companies
        )
    
    def analyze_content(self, article_text: str) -> Dict[str, Union[str, float]]:
        """
        Analyze article content to determine topics and relevance.
        
        Args:
            article_text: The article text to analyze
            
        Returns:
            Dictionary with analysis results
        """
        return self.analyzer.generate_analysis(article_text)
    
    @staticmethod
    def analyze_article(
        article_text: str, 
        time_interval: str = "3", 
        llm_provider: str = "google",
        test_mode: bool = False,
        target_companies: Optional[List[str]] = None
    ) -> Union[Dict, str]:
        """
        Static method to analyze an article without creating an instance.
        
        Args:
            article_text: The article text to analyze
            time_interval: Time interval for analysis
            llm_provider: The LLM provider to use
            test_mode: Whether to run in test mode
            target_companies: Optional list of target companies to focus on
            
        Returns:
            Analysis results
        """
        return analyze_article_content(
            article_text=article_text,
            time_interval=time_interval,
            llm_provider=llm_provider,
            test_mode=test_mode,
            target_companies=target_companies
        )

class InvestmentTopicAnalyzer:
    """
    A class that uses a Language Model to analyze article content and generate investment topics.
    """
    def __init__(
        self, 
        model: str = "gemini-2.0-flash", 
        time_interval: str = "3", 
        llm_provider: str = "google",
        llm_api_key: Optional[str] = None,
        target_companies: Optional[List[str]] = None
    ):
        """
        Initialize the analyzer.

        Args:
            model (str): The model name to use for analysis
            time_interval (str): The time window (in days) used in search topic prompts
            llm_provider (str): The LLM provider to use (e.g., "google", "openai")
            llm_api_key (str, optional): Your API key for the LLM
            target_companies (List[str], optional): List of companies to track for investment opportunities
        """
        # Ensure environment variables are loaded
        load_dotenv()
        self.llm_api_key = llm_api_key
        self.llm = LLMHandler(
            llm_provider=llm_provider, 
            model_name=model, 
            temperature=0
        ).language_model
        self.time_interval = time_interval

        # Default companies if none provided
        self.target_companies = target_companies
        
        # System prompt instructs the LLM on its role and desired output format.
        self.system_prompt = (
            f"""You are a financial analysis assistant with expertise in generating research topics for investment reports.

Your task is to analyze the provided article, generate a concise summary of its key points, and then create a unified search topic that highlights the potential investment implications of the article.
Evaluate whether the article contains signals that warrant further investigation for potential future investment opportunities.

You should be really critical when determining if the article should be investigated. If the article is not related to investing, you should return "No".

If any of the articles are talking about any of the following companies, you should return "Yes", if you that the article could have a impact on the stock price, but be critical:
{self.target_companies}

The articles dont necessarily need to be talking about these companies, but if you that the content could on the companies, you should return "Yes".
And if you find a similarity without mentioning the company, write it as a short sentence in the summary and relate it into the search topic.

Output your answer as valid JSON with the following keys:
- "summary": A brief paragraph summarizing the article.
- "search_topic": A unified topic statement that encapsulates the article's implications. (For inspiration, consider examples like:
    1) "NVIDIA's AI Innovations and Their Impact on Stock Valuations, over the past {self.time_interval} days."
    2) "How Recent Semiconductor Developments Are Shaping Market Sentiment in Tech Stocks, over the past {self.time_interval} days."
    3) "Stock Market Reactions to the Latest Trends in Quantum Computing and AI, over the past {self.time_interval} days."
Use these as inspiration to generate a topic that reflects the article's implications, over the past {self.time_interval} days.)
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


    def generate_analysis(self, article_text: str) -> Dict[str, Union[str, float]]:
        """
        Generate an analysis based on the article text.

        Args:
            article_text (str): The text content of the article
            
        Returns:
            Dict[str, Union[str, float]]: A dictionary containing the LLM response along with metadata
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


def analyze_article_content(
    article_text: str, 
    time_interval: str = "3", 
    llm_provider: str = "google",
    test_mode: bool = False,
    target_companies: Optional[List[str]] = None
) -> Union[Dict, str]:
    """
    Analyzes the provided article content using the InvestmentTopicAnalyzer.

    Args:
        article_text (str): The text content to analyze
        time_interval (str): Time interval (in days) for context in analysis
        llm_provider (str): The LLM provider to use (e.g., "google", "openai")
        test_mode (bool): If True, returns detailed analysis (including metadata)
        target_companies (List[str], optional): List of companies to track

    Returns:
        Union[Dict, str]: Analysis result as a dictionary (if test_mode is True) or string (if test_mode is False)

    Raises:
        Exception: Propagates any exceptions from analyzing the article
    """
    analyzer = InvestmentTopicAnalyzer(
        time_interval=time_interval, 
        llm_provider=llm_provider,
        target_companies=target_companies
    )
    analysis_result = analyzer.generate_analysis(article_text)
    
    if test_mode:
        logger.info("Test mode is on!")
        logger.info("--------------------------------")
        logger.info(f"JSON: {analysis_result['json']}")
        logger.info(f"Metadata: {analysis_result['metadata']}")
        logger.info(f"Usage: {analysis_result['usage']}")
        logger.info(f"Run ID: {analysis_result['run_id']}")
        logger.info(f"Latency: {analysis_result['latency']}")
        return "--------------------------------"
    
    content = analysis_result["content"]
    # Remove markdown formatting if present
    if content.startswith('```json'):
        content = content[7:-3]  # Strip out markdown markers
    return content


def main():
    """
    CLI entry point for running the investment topic analyzer.
    """
    parser = argparse.ArgumentParser(description='Analyze article content for investment topics')
    parser.add_argument('--content', type=str, required=True,
                      help='Article content to analyze')
    parser.add_argument('--time_interval', type=str, default="3",
                      help='Time interval (in days) for generating the analysis')
    parser.add_argument('--llm_provider', type=str, default="google",
                      help='LLM provider to use (e.g., "google", "openai")')
    parser.add_argument('--test', action='store_true', default=False,
                      help='Run in test mode with detailed output')
    args = parser.parse_args()

    try:
        result = analyze_article_content(
            article_text=args.content,
            time_interval=args.time_interval,
            llm_provider=args.llm_provider,
            test_mode=args.test
        )
        print(result)
    except Exception as e:
        logger.error(f"Error during analysis: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
