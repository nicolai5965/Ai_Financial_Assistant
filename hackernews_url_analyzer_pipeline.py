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
import argparse
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

# System-wide configuration
DEFAULT_CONFIG = {
    # Global settings
    "global": {
        "test_mode": False,  # Global test mode flag, affects all components
        "max_workers": 5,    # Maximum threads for parallel processing
    },
    
    # Web content extractor settings
    "content_extractor": {
        "primary_method": "requests",  # Primary scraping method: 'requests' or 'crawl4ai'
        "fallback_enabled": True,      # Whether to try fallback scraper if primary fails
        "word_count_threshold": 5,     # Minimum words required for content extraction
        "page_timeout": 5000,         # Milliseconds to wait for page load
        "wait_time": 0.0,            # Seconds to wait between requests
    },
    
    # HackerNews tracker settings
    "hackernews": {
        "num_stories": 10,           # Number of stories to fetch
        "min_trending_score": 5.0,   # Minimum score for a story to be considered
        "back_in_time_hours": 24,    # Only consider stories newer than this
        "cache_duration": 300,       # Duration in seconds for which the fetched data is stored in cache. Increasing this value allows for longer retention of data, reducing the frequency of API calls and improving performance, but may lead to stale data if the underlying information changes frequently.
        "gravity": 1.8,             # Decay factor used in the trending score calculation. A higher value results in a steeper decline in score over time, making it harder for older stories to maintain high scores. Adjusting this value can influence how quickly stories lose their trending status, affecting visibility and engagement.
    },
    
    # LLM Analysis settings
    "analysis": {
        "time_interval": "3",        # Days context for analysis
        "llm_provider": "google",    # LLM provider to use
        "model": "gemini-2.0-flash", # Default model name
        "temperature": 0,            # LLM temperature (0 = more deterministic)
    }
}

def validate_config(config: Dict[str, Any]) -> None:
    """
    Validate configuration values.
    
    Args:
        config: Configuration dictionary to validate
        
    Raises:
        ValueError: If any configuration values are invalid
    """
    # Global settings validation
    if not isinstance(config["global"]["max_workers"], int) or config["global"]["max_workers"] < 1:
        raise ValueError("max_workers must be a positive integer")
    
    # Content extractor validation
    if config["content_extractor"]["primary_method"] not in ["requests", "crawl4ai"]:
        raise ValueError("primary_method must be 'requests' or 'crawl4ai'")
    if config["content_extractor"]["page_timeout"] < 0:
        raise ValueError("page_timeout must be non-negative")
    if config["content_extractor"]["wait_time"] < 0:
        raise ValueError("wait_time must be non-negative")
        
    # HackerNews settings validation
    if config["hackernews"]["num_stories"] < 1:
        raise ValueError("num_stories must be positive")
    if config["hackernews"]["min_trending_score"] < 0:
        raise ValueError("min_trending_score must be non-negative")
    if config["hackernews"]["back_in_time_hours"] < 1:
        raise ValueError("back_in_time_hours must be positive")
    if config["hackernews"]["cache_duration"] < 0:
        raise ValueError("cache_duration must be non-negative")
        
    # Analysis settings validation
    try:
        int(config["analysis"]["time_interval"])
    except ValueError:
        raise ValueError("time_interval must be a valid integer string")

def parse_command_line_args() -> Dict[str, Any]:
    """
    Parse command line arguments for configuration overrides.
    
    Returns:
        Dict[str, Any]: Dictionary of overridden configuration values
    """
    parser = argparse.ArgumentParser(description='Run the HackerNews analysis pipeline')
    
    # Add test-url argument first
    parser.add_argument('--test-url', type=str, help='Test a single URL')
    
    # Global settings
    parser.add_argument('--test-mode', action='store_true', help='Enable test mode')
    parser.add_argument('--max-workers', type=int, help='Maximum number of worker threads')
    
    # Content extractor settings
    parser.add_argument('--primary-method', choices=['requests', 'crawl4ai'], 
                       help='Primary content extraction method')
    parser.add_argument('--page-timeout', type=int, help='Page load timeout in milliseconds')
    
    # HackerNews settings
    parser.add_argument('--num-stories', type=int, help='Number of stories to analyze')
    parser.add_argument('--min-trending-score', type=float, 
                       help='Minimum trending score threshold')
    parser.add_argument('--back-in-time-hours', type=int,
                       help='Hours to look back for stories')
    
    # Analysis settings
    parser.add_argument('--llm-provider', help='LLM provider to use')
    parser.add_argument('--time-interval', help='Time interval for analysis in days')
    
    args = parser.parse_args()
    
    # Convert args to dict, excluding None values and test-url
    overrides = {}
    for arg, value in vars(args).items():
        if value is not None and arg != 'test_url':
            # Convert arg names to config structure
            if arg in ['test_mode', 'max_workers']:
                if 'global' not in overrides:
                    overrides['global'] = {}
                overrides['global'][arg] = value
            elif arg in ['primary_method', 'page_timeout']:
                if 'content_extractor' not in overrides:
                    overrides['content_extractor'] = {}
                overrides['content_extractor'][arg.replace('-', '_')] = value
            elif arg in ['num_stories', 'min_trending_score', 'back_in_time_hours']:
                if 'hackernews' not in overrides:
                    overrides['hackernews'] = {}
                overrides['hackernews'][arg.replace('-', '_')] = value
            elif arg in ['llm_provider', 'time_interval']:
                if 'analysis' not in overrides:
                    overrides['analysis'] = {}
                overrides['analysis'][arg.replace('-', '_')] = value
    
    return overrides

def update_config(base_config: Dict[str, Any], overrides: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update configuration with overrides.
    
    Args:
        base_config: Base configuration dictionary
        overrides: Dictionary of override values
        
    Returns:
        Dict[str, Any]: Updated configuration
    """
    config = base_config.copy()
    for section, values in overrides.items():
        if section in config:
            config[section].update(values)
    return config

def extract_content(url: str, config: Dict[str, Any]) -> Optional[str]:
    """
    Extract content from a URL using the RequestsScraper with fallback to Crawl4AIScraper.
    
    Args:
        url (str): The URL to extract content from
        config: Configuration dictionary containing scraper settings
        
    Returns:
        Optional[str]: The extracted text content, or None if extraction fails
    """
    scraper_config = config["content_extractor"]
    
    # Try primary method first
    if scraper_config["primary_method"] == "requests":
        scraper = RequestsScraper(wait_time=scraper_config["wait_time"])
        result = scraper.fetch_content(url)
        
        if result and result.get("success"):
            return result.get("text_content")
            
        # Try fallback if enabled
        if scraper_config["fallback_enabled"]:
            logger.info(f"RequestsScraper failed for {url}, trying Crawl4AIScraper")
            scraper = Crawl4AIScraper(config={
                "word_count_threshold": scraper_config["word_count_threshold"],
                "page_timeout": scraper_config["page_timeout"]
            })
            result = asyncio.run(scraper.fetch_content(url))
            
            if result and result.get("success"):
                return result.get("text_content")
    else:
        # Try Crawl4AI first
        scraper = Crawl4AIScraper(config={
            "word_count_threshold": scraper_config["word_count_threshold"],
            "page_timeout": scraper_config["page_timeout"]
        })
        result = asyncio.run(scraper.fetch_content(url))
        
        if result and result.get("success"):
            return result.get("text_content")
            
        # Try fallback if enabled
        if scraper_config["fallback_enabled"]:
            logger.info(f"Crawl4AIScraper failed for {url}, trying RequestsScraper")
            scraper = RequestsScraper(wait_time=scraper_config["wait_time"])
            result = scraper.fetch_content(url)
            
            if result and result.get("success"):
                return result.get("text_content")
    
    logger.error(f"All configured scrapers failed to extract content from {url}")
    return None

async def process_story(
    story: Dict[str, Any], 
    executor: concurrent.futures.ThreadPoolExecutor,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Process a single story by extracting its content and analyzing it.
    
    Args:
        story (dict): A Hacker News story that passed the filters
        executor: A ThreadPoolExecutor for parallel processing
        config: Configuration dictionary
        
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
        "trending_score": story.get("trending_score")
    }
    
    if not url:
        logger.warning(f"No URL provided for story: {title}")
        return result
         
    try:
        # Extract content using the web content extractor
        loop = asyncio.get_event_loop()
        content = await loop.run_in_executor(
            executor,
            extract_content,
            url,
            config
        )
        
        if not content:
            logger.error(f"Failed to extract content from URL: {url}")
            return result
            
        # Analyze the extracted content
        analysis = await loop.run_in_executor(
            executor,
            url_topic_analyzer.analyze_article_content,
            content,
            config["analysis"]["time_interval"],
            config["analysis"]["llm_provider"],
            config["global"]["test_mode"]
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

async def run_pipeline(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Main asynchronous pipeline function that fetches Hacker News stories, filters them,
    and performs URL analysis in parallel.
    
    Args:
        config: Configuration dictionary
        
    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing story info and analysis output
    """
    # Fetch trending stories asynchronously
    trending_stories = await hackernews_tracker.get_trending_stories_async(
        config["hackernews"]["num_stories"]
    )
    
    # Filter stories by recency and trending score
    current_time = time.time()
    time_threshold = current_time - (config["hackernews"]["back_in_time_hours"] * 3600)
    filtered_stories = [
        story for story in trending_stories
        if story.get("time", 0) >= time_threshold and 
        story.get("trending_score", 0) >= config["hackernews"]["min_trending_score"]
    ]
    
    # Process URL analysis in parallel using a ThreadPoolExecutor
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=config["global"]["max_workers"]) as executor:
        tasks = [process_story(story, executor, config) for story in filtered_stories]
        results = await asyncio.gather(*tasks)
    
    return results

def pipeline_runner() -> List[Dict[str, Any]]:
    """
    Callable function to run the complete pipeline. Can be imported and used by other modules.
    
    Returns:
        List[Dict[str, Any]]: A list of dictionaries containing the integrated output
    """
    # Get command line overrides
    overrides = parse_command_line_args()
    
    # Update and validate configuration
    config = update_config(DEFAULT_CONFIG, overrides)
    validate_config(config)
    
    return asyncio.run(run_pipeline(config))

async def test_single_url(url: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Test the pipeline with a single URL.
    
    Args:
        url (str): The URL to test
        config: Configuration dictionary
        
    Returns:
        Dict[str, Any]: Analysis results for the URL
    """
    test_story = {
        "url": url,
        "title": "Test Article",
        "by": "Test User",
        "trending_score": 10.0,
        "time": time.time()
    }
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=config["global"]["max_workers"]) as executor:
        result = await process_story(test_story, executor, config)
    return result

def test_url_runner(url: str) -> Dict[str, Any]:
    """
    Runner function for testing a single URL.
    
    Args:
        url (str): The URL to test
        
    Returns:
        Dict[str, Any]: Analysis results
    """
    config = update_config(DEFAULT_CONFIG, parse_command_line_args())
    validate_config(config)
    return asyncio.run(test_single_url(url, config))

if __name__ == "__main__":
    # Parse arguments once
    parser = argparse.ArgumentParser(description='Run the HackerNews analysis pipeline')
    parser.add_argument('--test-url', type=str, help='Test a single URL')
    args, remaining_args = parser.parse_known_args()
    
    if args.test_url:
        results = test_url_runner(args.test_url)
        print(json.dumps(results, indent=2))
    else:
        results = pipeline_runner()
        print(json.dumps(results, indent=2))
