import asyncio
import requests
import time
import logging
from typing import Optional, Dict, Any, List
from bs4 import BeautifulSoup

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
                        window.addEventListener('load', resolve);
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
            logging.error("Crawl4AIScraper error for URL %s: %s", url, e)
            return {
                "success": False,
                "error": str(e)
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
        # NOTE: These headers can be customized if needed
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
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            # Optional delay to avoid overwhelming servers
            time.sleep(self.wait_time)
            
            html_content = response.text
            soup = BeautifulSoup(response.content, 'html.parser')
            text_content = soup.get_text(strip=True)
            
            if not text_content:
                raise ValueError("Could not extract text from the article")
            
            return {
                "success": True,
                "status_code": response.status_code,
                "url": url,
                "html_content": html_content,
                "text_content": text_content,
                "extraction_method": "requests"
            }
        except Exception as e:
            logging.error("Error fetching content from URL %s: %s", url, e)
            return {
                "success": False,
                "error": str(e),
                "status_code": response.status_code if 'response' in locals() else None,
                "url": url
            }

# -----------------------------
# Helper: Process a Single URL
# -----------------------------
async def process_url(url: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a single URL using the configured primary method,
    and optionally a fallback if the primary fails.
    
    Args:
        url: The URL to process.
        config: A dict with keys such as:
            - primary_method: "crawl4ai" or "requests"
            - fallback_enabled: bool
            - word_count_threshold: int (for crawl4ai)
            - page_timeout: int (for crawl4ai)
            - wait_time: float (for requests)
    
    Returns:
        A dictionary containing the output from whichever scraper succeeds.
    """
    primary_method = config.get("primary_method", "crawl4ai").lower()
    fallback_enabled = config.get("fallback_enabled", True)
    result = None

    # Define an async wrapper to call the synchronous RequestsScraper
    async def fetch_with_requests(url: str) -> Dict[str, Any]:
        from functools import partial
        scraper = RequestsScraper(wait_time=config.get("wait_time", 0.0))
        # Run the synchronous fetch_content in a thread
        return await asyncio.to_thread(scraper.fetch_content, url)
    
    # Try primary method first
    if primary_method == "crawl4ai":
        scraper = Crawl4AIScraper(config=config)
        result = await scraper.fetch_content(url)
        # Fallback to requests if needed
        if not (result and result.get("success")) and fallback_enabled:
            result = await fetch_with_requests(url)
    else:  # primary_method is "requests"
        result = await fetch_with_requests(url)
        if not (result and result.get("success")) and fallback_enabled:
            scraper = Crawl4AIScraper(config=config)
            result = await scraper.fetch_content(url)
    return result

# -----------------------------
# Main Function
# -----------------------------
async def main() -> Dict[str, Any]:
    """
    Main function that reads a configuration dictionary and processes
    one or multiple URLs concurrently.
    
    The configuration dictionary can include:
      - primary_method: "crawl4ai" or "requests"
      - fallback_enabled: bool
      - word_count_threshold: int
      - page_timeout: int
      - wait_time: float (for requests)
      - urls: List of URL strings
    
    Returns:
        A dictionary mapping each URL to its scraping result.
    """
    # Configuration dictionary.
    # (In a real application, you might load this from a file or environment.)
    config = {
        "primary_method": "crawl4ai",    # or "crawl4ai"
        "fallback_enabled": True,
        "word_count_threshold": 10, # Minimum 10 words required for content extraction
        "page_timeout": 1, # Wait up to 5 seconds for page load (crawl4ai)
        "wait_time": 0.0, # Wait 0 seconds between requests (requests)
        # List of URLs to process. (This list may have 1 or several URLs.)
        "urls": [
            "https://www.cea.fr/english/Pages/News/nuclear-fusion-west-beats-the-world-record-for-plasma-duration.aspx",
            "https://www.bitecode.dev/p/a-year-of-uv-pros-cons-and-should"
        ]
    }

    urls: List[str] = config.get("urls", [])
    results: Dict[str, Any] = {}

    if not urls:
        # If no URLs provided, return an empty dict
        print("No URLs provided.")
        return results

    # Process all URLs concurrently
    tasks = [process_url(url, config) for url in urls]
    processed_results = await asyncio.gather(*tasks)

    # Map each URL to its result.
    for url, result in zip(urls, processed_results):
        results[url] = result

    return results

# -----------------------------
# Run Main If This File Is Executed Directly
# -----------------------------
if __name__ == "__main__":
    final_results = asyncio.run(main())
    # Print detailed information about the results
    print("\n=== Web Content Extraction Results ===")
    print(f"\nNumber of URLs processed: {len(final_results)}")
    print("\nDetailed results for each URL:")
    print("-----------------------------------")
    for url, result in final_results.items():
        print(f"\nURL: {url}")
        print("Result type:", type(result))
        print("Content length:", len(str(result)) if result else 0)
        print("Content preview:", str(result)[:200] + "..." if result else "No content")
        print("-----------------------------------")
