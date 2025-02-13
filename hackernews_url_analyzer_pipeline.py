"""
pipeline_runner.py

This module integrates the hackernews_tracker and url_topic_analyzer functionalities.
It fetches Hacker News stories, applies thresholds (e.g. trending score, recency),
and then for each story that passes the filter, it calls the URL topic analyzer.
The URL analysis is retried up to a configurable number of times in case of failures.
The analysis for each story is performed in parallel and the final output is a list of
dictionaries (JSON-friendly) that include the title, author, URL, and analysis details.
"""

import asyncio
import concurrent.futures
import json
import time

# Import the modules (ensure they are in your PYTHONPATH or same directory)
import hackernews_tracker
import url_topic_analyzer

# Configurable constants
MAX_RETRIES = 3          # Number of retries for URL analysis before giving up
DEFAULT_TIME_INTERVAL = "3"  # Passed to url_topic_analyzer (days context)
DEFAULT_MAX_WORKERS = 5  # Maximum threads for parallel URL processing


async def process_story(story, executor, time_interval=DEFAULT_TIME_INTERVAL):
    """
    Process a single story by calling the URL topic analyzer with retries.
    
    Args:
        story (dict): A Hacker News story (from hackernews_tracker) that passed the filters.
        executor: A ThreadPoolExecutor for parallel processing.
        time_interval (str): Time interval (in days) for the analysis prompt.
        
    Returns:
        dict: Combined output including the story's title, author, URL, and analysis output.
    """
    url = story.get("url")
    title = story.get("title", "No Title")
    author = story.get("by", "Unknown")

    # If there is no URL, just return the story info without analysis.
    if not url:
        return {
            "title": title,
            "author": author,
            "url": "No URL",
            "analysis": None,
            "trending_score": story.get("trending_score"),
            "fetched_time": story.get("time")
        }
    
    retries = 0
    loop = asyncio.get_event_loop()
    while retries < MAX_RETRIES:
        try:
            # Run the URL analysis in a thread
            result = await loop.run_in_executor(
                executor,
                url_topic_analyzer.analyze_article,
                url,
                time_interval,
                False  # test_mode is False to get only the analysis content
            )
            # The analyzer returns a string; attempt to parse it as JSON.
            analysis_json = json.loads(result)
            return {
                "title": title,
                "author": author,
                "url": url,
                "analysis": analysis_json,
                "trending_score": story.get("trending_score"),
                "fetched_time": story.get("time")
            }
        except Exception as e:
            retries += 1
            if retries >= MAX_RETRIES:
                # Raise a notification and return the story info with analysis as None.
                print(f"Notification: Failed to analyze URL after {MAX_RETRIES} retries for story '{title}', URL: {url}")
                return {
                    "title": title,
                    "author": author,
                    "url": url,
                    "analysis": None,
                    "trending_score": story.get("trending_score"),
                    "fetched_time": story.get("time")
                }
            else:
                # Optional: wait a bit before retrying.
                await asyncio.sleep(1)


async def run_pipeline(num_stories=10, min_trending_score=5.0, back_in_time_hours=24, max_workers=DEFAULT_MAX_WORKERS):
    """
    Main asynchronous pipeline function that fetches Hacker News stories, filters them,
    and performs URL analysis in parallel.
    
    Args:
        num_stories (int): Number of top stories to initially consider.
        min_trending_score (float): Minimum trending score threshold.
        back_in_time_hours (int): Only include stories newer than this many hours.
        max_workers (int): Maximum number of threads for URL processing.
        
    Returns:
        list: A list of dictionaries, each containing story info and analysis output.
    """
    # Fetch trending stories asynchronously.
    trending_stories = await hackernews_tracker.get_trending_stories_async(num_stories)
    
    # Filter stories by recency and trending score.
    current_time = time.time()
    time_threshold = current_time - (back_in_time_hours * 3600)
    filtered_stories = [
        story for story in trending_stories
        if story.get("time", 0) >= time_threshold and story.get("trending_score", 0) >= min_trending_score
    ]
    
    # Process URL analysis in parallel using a ThreadPoolExecutor.
    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        tasks = [process_story(story, executor) for story in filtered_stories]
        results = await asyncio.gather(*tasks)
    
    return results


def pipeline_runner(num_stories=10, min_trending_score=5.0, back_in_time_hours=24, max_workers=DEFAULT_MAX_WORKERS):
    """
    Callable function to run the complete pipeline. Can be imported and used by other modules.
    
    Args:
        num_stories (int): Number of top stories to consider.
        min_trending_score (float): Minimum trending score threshold.
        back_in_time_hours (int): Only consider stories newer than this many hours.
        max_workers (int): Maximum number of threads for URL processing.
        
    Returns:
        list: A list of dictionaries containing the integrated output.
    """
    return asyncio.run(run_pipeline(num_stories, min_trending_score, back_in_time_hours, max_workers))


if __name__ == "__main__":
    # When run from the command line, execute the pipeline and print the JSON output.
    results = pipeline_runner()
    print(json.dumps(results, indent=2))
