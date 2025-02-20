import asyncio
import requests
import time
import logging
from typing import Optional, Dict, Any, List
from bs4 import BeautifulSoup

# -----------------------------
# Logging Configuration
# -----------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

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
        except requests.RequestException as e:
            status_code = response.status_code if 'response' in locals() and response is not None else None
            logging.error("Error fetching content from URL %s: %s", url, e)
            return {
                "success": False,
                "error": str(e),
                "status_code": status_code,
                "url": url
            }
        except Exception as e:
            logging.error("Unexpected error fetching content from URL %s: %s", url, e)
            return {
                "success": False,
                "error": str(e),
                "status_code": None,
                "url": url
            }

# -----------------------------
# Helper: Process a Single URL
# -----------------------------
async def process_url(url: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a single URL using the configured primary method,
    and optionally a fallback if the primary fails.
    
    Logs key checkpoints for processing.
    """
    logging.info("Starting processing for URL: %s", url)
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
        logging.info("Using primary method Crawl4AIScraper for URL: %s", url)
        scraper = Crawl4AIScraper(config=config)
        result = await scraper.fetch_content(url)
        # Fallback to requests if needed
        if not (result and result.get("success")) and fallback_enabled:
            error_detail = result.get("error") if result else "Unknown error"
            logging.warning("Crawl4AIScraper failed for URL %s with error: %s. Falling back to RequestsScraper.", url, error_detail)
            result = await fetch_with_requests(url)
    else:  # primary_method is "requests"
        logging.info("Using primary method RequestsScraper for URL: %s", url)
        result = await fetch_with_requests(url)
        if not (result and result.get("success")) and fallback_enabled:
            error_detail = result.get("error") if result else "Unknown error"
            logging.warning("RequestsScraper failed for URL %s with error: %s. Falling back to Crawl4AIScraper.", url, error_detail)
            scraper = Crawl4AIScraper(config=config)
            result = await scraper.fetch_content(url)
    
    if result.get("success"):
        logging.info("Successfully processed URL: %s using method: %s", url, result.get("extraction_method"))
    else:
        logging.error("Failed to process URL: %s after trying both Crawl4AIScraper and RequestsScraper.", url)
    logging.info("Completed processing for URL: %s", url)
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
        logging.info("No URLs provided in configuration.")
        return results

    logging.info("Starting processing of %d URL(s).", len(urls))
    tasks = [process_url(url, config) for url in urls]
    processed_results = await asyncio.gather(*tasks)

    # Map each URL to its result and log the outcome.
    for url, result in zip(urls, processed_results):
        results[url] = result
    logging.info("Completed processing of all URLs.")
    return results

# -----------------------------
# Run Main If This File Is Executed Directly
# -----------------------------
if __name__ == "__main__":
    final_results = asyncio.run(main())
    # Enhanced summary output for readability
    print("\n=== Web Content Extraction Results ===")
    print(f"Number of URLs processed: {len(final_results)}\n")
    for url, result in final_results.items():
        print(f"URL: {url}")
        if result.get("success"):
            print("✅ Success | Extraction Method:", result["extraction_method"])
            preview = str(result.get("text_content", ""))[:200] + "..." if result.get("text_content") else "No content"
            print("📄 Content length:", len(str(result)) if result else 0)
            print("📄 Content Preview:", preview)
        else:
            print("❌ Failed to extract content")
            print("🛑 Error:", result.get("error", "Unknown error"))
        print("-" * 50)
