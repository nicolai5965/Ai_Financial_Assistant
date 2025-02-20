"""
pipeline_runner.py

This module integrates hackernews_tracker, web_content_extractor, and url_topic_analyzer functionalities.
It fetches Hacker News stories, extracts content from their URLs using the web content extractor,
and then analyzes the content using the topic analyzer.
"""

import asyncio
import concurrent.futures
import json
import time
import logging
from typing import Dict, Any, Optional, List

# Import the modules
import hackernews_tracker
import url_topic_analyzer
from web_content_extractor import RequestsScraper, Crawl4AIScraper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configurable constants
MAX_RETRIES = 3          # Number of retries for URL analysis before giving up
DEFAULT_TIME_INTERVAL = "3"  # Passed to url_topic_analyzer (days context)
DEFAULT_MAX_WORKERS = 5  # Maximum threads for parallel URL processing
DEFAULT_LLM_PROVIDER = "google"  # Default LLM provider

def extract_content(url: str) -> Optional[str]:
    """
    Extract content from a URL using the RequestsScraper with fallback to Crawl4AIScraper.
    
    Args:
        url (str): The URL to extract content from
        
    Returns:
        Optional[str]: The extracted text content, or None if extraction fails
    """
    # Try RequestsScraper first
    scraper = RequestsScraper()
    result = scraper.fetch_content(url)
    
    if result and result.get("success"):
        return result.get("text_content")
        
    # If RequestsScraper fails, try Crawl4AIScraper
    logger.info(f"RequestsScraper failed for {url}, trying Crawl4AIScraper")
    scraper = Crawl4AIScraper(config={})
    result = asyncio.run(scraper.fetch_content(url))
    
    if result and result.get("success"):
        return result.get("text_content")
    
    logger.error(f"Both scrapers failed to extract content from {url}")
    return None

async def process_story(
    story: Dict[str, Any], 
    executor: concurrent.futures.ThreadPoolExecutor,
    time_interval: str = DEFAULT_TIME_INTERVAL,
    llm_provider: str = DEFAULT_LLM_PROVIDER
) -> Dict[str, Any]:
    """
    Process a single story by extracting its content and analyzing it.
    
    Args:
        story (dict): A Hacker News story that passed the filters
        executor: A ThreadPoolExecutor for parallel processing
        time_interval (str): Time interval (in days) for the analysis prompt
        llm_provider (str): The LLM provider to use for analysis
        
    Returns:
        dict: Combined output including the story's metadata and analysis
    """
    url = story.get("url")
    title = story.get("title", "No Title")
    author = story.get("by", "Unknown")
    
    # Base result with story info
    result = {
        "title": title,
        "author": author,
        "url": url or "No URL",
        "analysis": None,
        "trending_score": story.get("trending_score"),
        "fetched_time": story.get("time")
    }
    
    if not url:
        logger.warning(f"No URL provided for story: {title}")
        return result
        
    try:
        # Extract content using the web content extractor
        loop = asyncio.get_event_loop()
        content = await loop.run_in_executor(executor, extract_content, url)
        
        if not content:
            logger.error(f"Failed to extract content from URL: {url}")
            return result
            
        # Analyze the extracted content
        analysis = await loop.run_in_executor(
            executor,
            url_topic_analyzer.analyze_article_content,
            content,
            time_interval,
            llm_provider,
            False
        )
        
        # Try to parse the analysis as JSON
        try:
            result["analysis"] = json.loads(analysis)
        except json.JSONDecodeError:
            result["analysis"] = {"error": "Failed to parse analysis output"}
            logger.error(f"Failed to parse analysis output for URL: {url}")
            
    except Exception as e:
        logger.error(f"Error processing story {title} with URL {url}: {str(e)}")
        
    return result

async def run_pipeline(
    num_stories: int = 10,
    min_trending_score: float = 5.0,
    back_in_time_hours: int = 24,
    max_workers: int = DEFAULT_MAX_WORKERS,
    llm_provider: str = DEFAULT_LLM_PROVIDER
) -> List[Dict[str, Any]]:
    """
    Main asynchronous pipeline function that fetches Hacker News stories, filters them,
    and performs URL analysis in parallel.
    
    Args:
        num_stories (int): Number of top stories to initially consider
        min_trending_score (float): Minimum trending score threshold
        back_in_time_hours (int): Only include stories newer than this many hours
        max_workers (int): Maximum number of threads for URL processing
        llm_provider (str): The LLM provider to use for analysis
        
    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing story info and analysis output
    """
    # Fetch trending stories asynchronously
    trending_stories = await hackernews_tracker.get_trending_stories_async(num_stories)
    
    # Filter stories by recency and trending score
    current_time = time.time()
    time_threshold = current_time - (back_in_time_hours * 3600)
    filtered_stories = [
        story for story in trending_stories
        if story.get("time", 0) >= time_threshold and story.get("trending_score", 0) >= min_trending_score
    ]
    
    # Process URL analysis in parallel using a ThreadPoolExecutor
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        tasks = [
            process_story(
                story, 
                executor, 
                DEFAULT_TIME_INTERVAL, 
                llm_provider
            ) for story in filtered_stories
        ]
        results = await asyncio.gather(*tasks)
    
    return results

def pipeline_runner(
    num_stories: int = 10,
    min_trending_score: float = 5.0,
    back_in_time_hours: int = 24,
    max_workers: int = DEFAULT_MAX_WORKERS,
    llm_provider: str = DEFAULT_LLM_PROVIDER
) -> List[Dict[str, Any]]:
    """
    Callable function to run the complete pipeline. Can be imported and used by other modules.
    
    Args:
        num_stories (int): Number of top stories to consider
        min_trending_score (float): Minimum trending score threshold
        back_in_time_hours (int): Only consider stories newer than this many hours
        max_workers (int): Maximum number of threads for URL processing
        llm_provider (str): The LLM provider to use for analysis
        
    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing the integrated output
    """
    return asyncio.run(run_pipeline(
        num_stories=num_stories,
        min_trending_score=min_trending_score,
        back_in_time_hours=back_in_time_hours,
        max_workers=max_workers,
        llm_provider=llm_provider
    ))

if __name__ == "__main__":
    # When run from the command line, execute the pipeline and print the JSON output
    results = pipeline_runner()
    print(json.dumps(results, indent=2))
