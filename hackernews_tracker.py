from hn_sdk.client.v0.client import (
    get_top_stories,
    get_item_by_id,
    get_best_stories, # not used yet, but could be used for future analysis
)

from datetime import datetime
import time
import asyncio
import aiohttp
from functools import lru_cache

# --------------------
# Utility Functions
# --------------------

def format_time_ago(timestamp):
    """
    Convert a Unix timestamp into a human-readable “time ago” format.
    """
    current_time = time.time()
    diff = current_time - timestamp
    if diff < 60:
        return "just now"
    elif diff < 3600:
        minutes = int(diff / 60)
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    elif diff < 86400:
        hours = int(diff / 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif diff < 604800:
        days = int(diff / 86400)
        return f"{days} day{'s' if days != 1 else ''} ago"
    else:
        return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M')

def calculate_trending_score(story):
    """
    Calculate a trending score based on points, comments, and the story's age.
    
    Formula: (points + comments * 2) / (hours_since_posted + 2)^1.8
    """
    current_time = time.time()
    story_time = story.get('time', current_time)
    hours_since_posted = (current_time - story_time) / 3600
    points = story.get('score', 0)
    comments = story.get('descendants', 0)
    gravity = 1.8
    time_denominator = pow(hours_since_posted + 2, gravity)
    trending_score = (points + comments * 2) / time_denominator
    return trending_score

# --------------------
# Caching & Async Fetching
# --------------------

class HNCache:
    """A simple in-memory cache for Hacker News API responses."""
    def __init__(self, cache_duration=300):  # 5 minutes default
        self.cache = {}
        self.cache_duration = cache_duration
    
    def get(self, key):
        if key in self.cache:
            data, timestamp = self.cache[key]
            if time.time() - timestamp < self.cache_duration:
                return data
            else:
                del self.cache[key]
        return None
    
    def set(self, key, value):
        self.cache[key] = (value, time.time())

# Global cache instance
hn_cache = HNCache()

@lru_cache(maxsize=100)
def get_cached_item(item_id):
    """A cached version of get_item_by_id."""
    cached = hn_cache.get(f"item_{item_id}")
    if cached:
        return cached
    item = get_item_by_id(item_id)
    if item:
        hn_cache.set(f"item_{item_id}", item)
    return item

async def fetch_items_async(session, item_ids):
    """
    Fetch multiple items concurrently.
    """
    async def fetch_item(item_id):
        cached = hn_cache.get(f"item_{item_id}")
        if cached:
            return cached
        url = f"https://hacker-news.firebaseio.com/v0/item/{item_id}.json"
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                if data:
                    hn_cache.set(f"item_{item_id}", data)
                return data
            return None

    tasks = [fetch_item(item_id) for item_id in item_ids]
    results = await asyncio.gather(*tasks)
    return results

async def get_trending_stories_async(num_stories=10):
    """
    Retrieve trending stories (without printing intermediate output).
    
    Fetches extra stories and calculates the trending score for each;
    returns a list sorted in descending order of trending score.
    """
    top_story_ids = hn_cache.get("top_stories")
    if not top_story_ids:
        top_story_ids = get_top_stories()
        hn_cache.set("top_stories", top_story_ids)
    
    async with aiohttp.ClientSession() as session:
        stories = await fetch_items_async(session, top_story_ids[:num_stories * 2])
    
    valid_stories = []
    for story in stories:
        if story and story.get("type") == "story":
            story['trending_score'] = calculate_trending_score(story)
            valid_stories.append(story)
    
    valid_stories.sort(key=lambda x: x['trending_score'], reverse=True)
    return valid_stories

# --------------------
# Analysis Function
# --------------------

def analyze_top_stories(stories, min_trending_score):
    """
    Print performance analysis for all stories with a trending score
    greater than or equal to the specified threshold.
    """
    filtered_stories = [story for story in stories if story.get('trending_score', 0) >= min_trending_score]
    if not filtered_stories:
        print(f"No stories with trending score >= {min_trending_score}.")
        return
    
    print("\n=== Top Stories Performance Analysis ===")
    for story in filtered_stories:
        current_time = time.time()
        hours_old = (current_time - story.get('time', current_time)) / 3600
        points = story.get('score', 0)
        comments = story.get('descendants', 0)
        points_per_hour = points / hours_old if hours_old > 0 else points
        comments_per_hour = comments / hours_old if hours_old > 0 else comments
        trending_score = story.get('trending_score', 0)
        
        if trending_score > 50:
            status = "Viral 🔥"
        elif trending_score > 30:
            status = "Trending ⬆️"
        elif trending_score > 15:
            status = "Popular 👍"
        else:
            status = "Normal 📊"
        
        print(f"Title: {story.get('title', 'No Title')}")
        print(f"Age: {format_time_ago(story.get('time', 0))}")
        print(f"Points: {points} ({points_per_hour:.2f}/hour)")
        print(f"Comments: {comments} ({comments_per_hour:.2f}/hour)")
        print(f"Trending Score: {trending_score:.2f}")
        print(f"Status: {status}")
        print(f"Author: {story.get('by', 'Unknown')}")
        print(f"URL: {story.get('url', 'No URL')}")
        print("-" * 50)

# --------------------
# Main Coordination
# --------------------

async def main():
    # Configuration dictionary for non-hardcoded values.
    config = {
        "num_stories": 10,
        "min_trending_score": 1.0,
        "back_in_time_hours": 24  # Only consider stories from the past 24 hours.
    }
    
    # Fetch trending stories asynchronously.
    trending_stories = await get_trending_stories_async(config["num_stories"])
    
    # Filter stories to only include those not older than the back_in_time threshold.
    current_time = time.time()
    time_threshold = current_time - (config["back_in_time_hours"] * 3600)
    filtered_stories = [story for story in trending_stories if story.get("time", 0) >= time_threshold]
    
    analyze_top_stories(filtered_stories, config["min_trending_score"])

if __name__ == "__main__":
    asyncio.run(main())