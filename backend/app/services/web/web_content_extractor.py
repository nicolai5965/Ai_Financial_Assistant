import asyncio
import requests
import time
from typing import Optional, Dict, Any, List
from bs4 import BeautifulSoup

# -----------------------------
# Import Centralized Logger
# -----------------------------
from app.core.logging_config import logger

# -----------------------------
# Crawl4AIScraper Definition
# -----------------------------
from crawl4ai import AsyncWebCrawler
from crawl4ai.async_configs import BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator


class Crawl4AIScraper:
    """
    Scraper class that uses Crawl4AI to extract web content.
    This is the more sophisticated scraper that can handle JavaScript-rendered content.
    """
    def __init__(
        self, 
        config: Dict[str, Any],
        browser_config: Optional[BrowserConfig] = None
    ):
        # Default browser configuration if none provided
        self.browser_config = browser_config or BrowserConfig(
            verbose=True,  # Enable logging
            headless=True  # Run browser in headless mode
        )
        
        # Single source of configuration
        self.run_config = CrawlerRunConfig(
            word_count_threshold=config.get("word_count_threshold", 5),
            excluded_tags=['script', 'style', 'noscript'],  # HTML tags to ignore
            exclude_external_links=False,  # Whether to follow external links
            remove_overlay_elements=True,  # Remove popups and overlays
            process_iframes=True,  # Process content within iframes
            markdown_generator=DefaultMarkdownGenerator(
                options={ 
                    "body_width": 0,  # No width limit
                    "unicode_snob": True,  # Preserve unicode characters
                    "wrap_links": False,  # Don't wrap links
                    "wrap_list_items": False  # Don't wrap list items
                }
            ),
            cache_mode=CacheMode.DISABLED,  # Don't cache results
            page_timeout=config.get("page_timeout", 5000),  # Increased timeout
            wait_for="body",  # Use a valid CSS selector that is present once the page loads
            # JS code for additional waiting if needed
            js_code=[
                """
                await new Promise(resolve => {
                    if (document.readyState === 'complete') {
                        resolve();
                    } else {
                        window.addEventListener('load', resolve, { passive: true });
                    }
                });
                """
            ]
        )

    async def fetch_content(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Fetches and processes content from a URL using Crawl4AI.
        Handles JavaScript-rendered content and complex web applications.
        """
        try:
            # Initialize crawler with configured settings
            async with AsyncWebCrawler(config=self.browser_config) as crawler:
                result = await crawler.arun(url=url, config=self.run_config)
                if result.success:
                    # Process the extracted content
                    content = result.html
                    soup = BeautifulSoup(content, 'html.parser')
                    main_content = soup.select_one('.main')
                    # Try to get text content from main element, fallback to markdown
                    text_content = (
                        main_content.get_text(strip=True)
                        if main_content
                        else str(result.markdown_v2 if result.markdown_v2 else result.markdown)
                    )
                    
                    return {
                        "success": True,
                        "status_code": result.status_code,
                        "url": url,
                        "html_content": result.html,
                        "text_content": text_content,
                        "extraction_method": "crawl4ai"
                    }
        except Exception as e:
            logger.exception("Crawl4AIScraper error for URL %s", url)
            return {
                "success": False,
                "error": str(e),
                "url": url,
                "extraction_method": "crawl4ai"
            }
        return None

# -----------------------------
# RequestsScraper Definition
# -----------------------------
class RequestsScraper:
    """
    Simple scraper using requests library. 
    Used as a fallback or for simple static websites.
    """
    def __init__(self, wait_time: float = 0.0):
        # Configure headers to mimic a real browser
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/98.0.4758.102 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }
        self.wait_time = wait_time  # Time to wait between requests

    def fetch_content(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Simple content fetching using requests library.
        Good for static websites that don't require JavaScript.
        """
        response = None  # Initialize response variable
        try:
            logger.debug("Starting RequestsScraper for URL: %s", url)
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            # Optional delay to avoid overwhelming servers
            time.sleep(self.wait_time)
            
            html_content = response.text
            soup = BeautifulSoup(response.content, 'html.parser')
            text_content = soup.get_text(strip=True)
            
            if not text_content:
                logger.warning("No text content extracted from URL: %s", url)
                raise ValueError("Could not extract text from the article")
            
            logger.debug("RequestsScraper successfully extracted %d characters of content from URL: %s", 
                        len(text_content), url)
            
            return {
                "success": True,
                "status_code": response.status_code,
                "url": url,
                "html_content": html_content,
                "text_content": text_content,
                "extraction_method": "requests"
            }
        except requests.RequestException as e:
            status_code = response.status_code if response else None
            logger.error("RequestException for URL %s (status: %s): %s", url, status_code, str(e))
            return {
                "success": False,
                "error": str(e),
                "status_code": status_code,
                "url": url,
                "extraction_method": "requests"
            }
        except Exception as e:
            logger.exception("Unexpected error in RequestsScraper for URL %s", url)
            return {
                "success": False,
                "error": str(e),
                "status_code": None,
                "url": url,
                "extraction_method": "requests"
            }

# -----------------------------
# WebContentExtractor Class
# -----------------------------
class WebContentExtractor:
    """
    Main class for extracting content from web pages.
    Provides a unified interface for different extraction methods.
    """
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {
            "primary_method": "crawl4ai",
            "fallback_enabled": True,
            "word_count_threshold": 10,
            "page_timeout": 5000,
            "wait_time": 0.0
        }
        logger.info("WebContentExtractor initialized with primary_method=%s, fallback_enabled=%s", 
                  self.config.get("primary_method"), self.config.get("fallback_enabled"))
    
    async def extract_from_url(self, url: str) -> Dict[str, Any]:
        """
        Extract content from a single URL.
        
        Args:
            url (str): The URL to extract content from.
            
        Returns:
            Dict[str, Any]: The extraction result.
        """
        return await process_url(url, self.config)
    
    async def extract_from_urls(self, urls: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Extract content from multiple URLs concurrently.
        
        Args:
            urls (List[str]): List of URLs to extract content from.
            
        Returns:
            Dict[str, Dict[str, Any]]: Dictionary mapping URLs to their extraction results.
        """
        if not urls:
            logger.warning("extract_from_urls called with empty URL list")
            return {}
            
        logger.info("Starting parallel processing of %d URL(s)", len(urls))
        tasks = [process_url(url, self.config) for url in urls]
        
        # Use gather to run all tasks concurrently
        try:
            processed_results = await asyncio.gather(*tasks)
        except Exception as e:
            logger.exception("Error in parallel URL processing")
            return {}
        
        results = {}
        for url, result in zip(urls, processed_results):
            results[url] = result
            
        success_count = sum(1 for r in results.values() if r.get("success", False))
        logger.info("Completed processing of all URLs. Success: %d/%d", success_count, len(urls))
        return results

# -----------------------------
# Helper: Process a Single URL
# -----------------------------
async def process_url(url: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a single URL using the configured primary method,
    and optionally a fallback if the primary fails.
    
    Logs key checkpoints for processing.
    """
    request_id = id(url)[:8]  # Use first 8 digits of object id as a simple request identifier
    logger.info("[ReqID:%s] Starting processing for URL: %s", request_id, url)
    primary_method = config.get("primary_method", "crawl4ai").lower()
    fallback_enabled = config.get("fallback_enabled", True)
    result = None

    # Define an async wrapper to call the synchronous RequestsScraper
    async def fetch_with_requests(url: str) -> Dict[str, Any]:
        scraper = RequestsScraper(wait_time=config.get("wait_time", 0.0))
        # Run the synchronous fetch_content in a thread
        return await asyncio.to_thread(scraper.fetch_content, url)
    
    # Try primary method first
    if primary_method == "crawl4ai":
        logger.info("[ReqID:%s] Using primary method Crawl4AIScraper for URL: %s", request_id, url)
        try:
            scraper = Crawl4AIScraper(config=config)
            result = await scraper.fetch_content(url)
            # Fallback to requests if needed
            if not (result and result.get("success")) and fallback_enabled:
                error_detail = result.get("error") if result else "Unknown error"
                logger.warning("[ReqID:%s] Crawl4AIScraper failed for URL with error: %s. Falling back to RequestsScraper.", 
                            request_id, error_detail)
                result = await fetch_with_requests(url)
        except Exception as e:
            logger.exception("[ReqID:%s] Unhandled exception in Crawl4AIScraper flow", request_id)
            result = {
                "success": False,
                "error": f"Unhandled exception: {str(e)}",
                "url": url
            }
    else:  # primary_method is "requests"
        logger.info("[ReqID:%s] Using primary method RequestsScraper for URL: %s", request_id, url)
        try:
            result = await fetch_with_requests(url)
            if not (result and result.get("success")) and fallback_enabled:
                error_detail = result.get("error") if result else "Unknown error"
                logger.warning("[ReqID:%s] RequestsScraper failed for URL with error: %s. Falling back to Crawl4AIScraper.", 
                            request_id, error_detail)
                scraper = Crawl4AIScraper(config=config)
                result = await scraper.fetch_content(url)
        except Exception as e:
            logger.exception("[ReqID:%s] Unhandled exception in RequestsScraper flow", request_id)
            result = {
                "success": False,
                "error": f"Unhandled exception: {str(e)}",
                "url": url
            }
    
    if result and result.get("success"):
        text_length = len(result.get("text_content", "")) if result.get("text_content") else 0
        logger.info("[ReqID:%s] Successfully processed URL using method: %s (content length: %d characters)", 
                  request_id, result.get("extraction_method"), text_length)
    else:
        logger.error("[ReqID:%s] Failed to process URL after trying available methods. Error: %s", 
                   request_id, result.get("error") if result else "Unknown error")
        
    logger.info("[ReqID:%s] Completed processing for URL: %s", request_id, url)
    return result

# -----------------------------
# Main Function
# -----------------------------
async def main() -> Dict[str, Any]:
    """
    Main function that reads a configuration dictionary and processes
    one or multiple URLs concurrently.
    
    Logs the overall progress.
    """
    # Configuration dictionary.
    config = {
        "primary_method": "requests", # "crawl4ai" or "requests"
        "fallback_enabled": True,
        "word_count_threshold": 10, # Minimum 10 words required for content extraction
        "page_timeout": 5000, # Wait up to 5 seconds for page load (crawl4ai)
        "wait_time": 0.0, # Wait 0 seconds between requests (requests)
        "urls": [
            "https://www.cea.fr/english/Pages/News/nuclear-fusion-west-beats-the-world-record-for-plasma-duration.aspx",
            "https://www.bitecode.dev/p/a-year-of-uv-pros-cons-and-should"
        ]
    }

    urls: List[str] = config.get("urls", [])
    results: Dict[str, Any] = {}

    if not urls:
        logger.warning("No URLs provided in configuration.")
        return results

    logger.info("Starting batch processing of %d URL(s).", len(urls))
    tasks = [process_url(url, config) for url in urls]
    
    try:
        processed_results = await asyncio.gather(*tasks)
    except Exception as e:
        logger.exception("Critical error during URL batch processing")
        return {}

    # Map each URL to its result and log the outcome.
    success_count = 0
    for url, result in zip(urls, processed_results):
        results[url] = result
        if result and result.get("success"):
            success_count += 1
    
    logger.info("Completed batch processing with %d/%d successful extractions.", success_count, len(urls))
    return results

# -----------------------------
# Run Main If This File Is Executed Directly
# -----------------------------
if __name__ == "__main__":
    logger.info("Starting web_content_extractor as main module")
    try:
        final_results = asyncio.run(main())
        # Enhanced summary output for readability
        print("\n=== Web Content Extraction Results ===")
        print(f"Number of URLs processed: {len(final_results)}\n")
        for url, result in final_results.items():
            print(f"URL: {url}")
            if result.get("success"):
                print("✅ Success | Extraction Method:", result["extraction_method"])
                preview = str(result.get("text_content", ""))[:200] + "..." if result.get("text_content") else "No content"
                print("📄 Content length:", len(str(result.get("text_content", ""))) if result.get("text_content") else 0)
                print("📄 Content Preview:", preview)
            else:
                print("❌ Failed to extract content")
                print("🛑 Error:", result.get("error", "Unknown error"))
            print("-" * 50)
    except Exception as e:
        logger.critical("Fatal error in web_content_extractor main function", exc_info=True)
        print(f"Fatal error: {e}")
