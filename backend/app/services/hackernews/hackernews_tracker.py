from hn_sdk.client.v0.client import get_top_stories
from datetime import datetime
import time
import asyncio
import aiohttp
from enum import Enum
from typing import List, Optional, Dict, Any
import re
import logging
from tqdm.auto import tqdm

# New imports for semantic similarity
from sentence_transformers import util

# Disable progress bar from sentence-transformers
logging.getLogger('sentence_transformers').setLevel(logging.WARNING)
# Disable tqdm progress bars globally
tqdm.pandas(disable=True)

# Global variable for lazy-loaded SentenceTransformer model
_model = None

def get_sentence_transformer():
    """
    Lazily initialize and return the SentenceTransformer model.
    """
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

# --------------------
# HackerNewsTracker Class
# --------------------
class HackerNewsTracker:
    """
    A class for tracking and filtering Hacker News stories.
    Provides methods to get top stories, filter by keywords or topics,
    and analyze stories for relevance.
    """
    
    def __init__(self):
        """Initialize the HackerNewsTracker."""
        pass
        
    async def get_filtered_stories(
        self,
        num_stories: int = 30,
        keywords: Optional[List[str]] = None,
        topics: Optional[List[str]] = None,
        similarity_threshold: float = 0.3,
        search_fields: Optional[List[str]] = None
    ) -> List[Dict[Any, Any]]:
        """
        Get filtered Hacker News stories based on keywords and/or topics.
        
        Args:
            num_stories: Number of top stories to fetch
            keywords: List of keywords to filter by
            topics: List of topics to filter by semantic similarity
            similarity_threshold: Minimum similarity score for topic filtering
            search_fields: Fields to search in (title, text, url)
            
        Returns:
            List of filtered stories
        """
        return await get_filtered_stories(
            num_stories=num_stories,
            keywords=keywords,
            topics=topics,
            similarity_threshold=similarity_threshold,
            search_fields=search_fields
        )
    
    @staticmethod
    def filter_stories_by_keywords(
        stories: List[Dict[Any, Any]], 
        keywords: List[str], 
        search_fields: Optional[List[str]] = None
    ) -> List[Dict[Any, Any]]:
        """
        Filter stories by keywords.
        
        Args:
            stories: List of stories to filter
            keywords: List of keywords to filter by
            search_fields: Fields to search in (title, text, url)
            
        Returns:
            Filtered list of stories
        """
        return filter_stories_by_keywords(stories, keywords, search_fields)
    
    @staticmethod
    def filter_stories_by_topic_similarity(
        stories: List[Dict[Any, Any]], 
        topics: List[str],
        similarity_threshold: float = 0.3,
        search_fields: Optional[List[str]] = None
    ) -> List[Dict[Any, Any]]:
        """
        Filter stories by semantic similarity to topics.
        
        Args:
            stories: List of stories to filter
            topics: List of topics to filter by
            similarity_threshold: Minimum similarity score
            search_fields: Fields to search in (title, text, url)
            
        Returns:
            Filtered list of stories with similarity scores
        """
        return filter_stories_by_topic_similarity(
            stories, 
            topics, 
            similarity_threshold, 
            search_fields
        )
    
    @staticmethod
    def analyze_top_stories(stories, include_similarity_score=False):
        """
        Analyze and format top stories.
        
        Args:
            stories: List of stories to analyze
            include_similarity_score: Whether to include similarity scores
            
        Returns:
            Analyzed and formatted stories
        """
        return analyze_top_stories(stories, include_similarity_score)

# --------------------
# Utility Functions
# --------------------

def format_time_ago(timestamp):
    """
    Convert a Unix timestamp into a human-readable "time ago" format.
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

# --------------------
# Async Fetching
# --------------------

async def fetch_items_async(session, item_ids):
    """
    Fetch multiple items concurrently.
    """
    async def fetch_item(item_id):
        url = f"https://hacker-news.firebaseio.com/v0/item/{item_id}.json"
        async with session.get(url) as response:
            if response.status == 200:
                return await response.json()
            return None

    tasks = [fetch_item(item_id) for item_id in item_ids]
    results = await asyncio.gather(*tasks)
    return results

# --------------------
# Analysis Function
# --------------------

def analyze_top_stories(stories, include_similarity_score=False):
    """
    Print analysis for filtered stories, focusing on engagement metrics
    and relevance rather than trending scores.
    """
    if not stories:
        print("No matching stories found.")
        return
    
    print("\n=== Filtered Stories Analysis ===")
    for story in stories:
        current_time = time.time()
        hours_old = (current_time - story.get('time', current_time)) / 3600
        points = story.get('score', 0)
        comments = story.get('descendants', 0)
        
        # Calculate engagement metrics
        points_per_hour = points / hours_old if hours_old > 0 else points
        comments_per_hour = comments / hours_old if hours_old > 0 else comments
        
        # Determine engagement level based on points and comments
        if points >= 200 or comments >= 100:
            engagement = "High Engagement 🔥"
        elif points >= 100 or comments >= 50:
            engagement = "Good Discussion 💬"
        else:
            engagement = "Active 📊"
        
        print(f"Title: {story.get('title', 'No Title')}")
        print(f"Age: {format_time_ago(story.get('time', 0))}")
        print(f"Points: {points} ({points_per_hour:.2f}/hour)")
        print(f"Comments: {comments} ({comments_per_hour:.2f}/hour)")
        print(f"Engagement: {engagement}")
        
        # Only show similarity score if it exists and is requested
        if include_similarity_score and 'similarity_score' in story:
            print(f"Topic Similarity: {story['similarity_score']:.2f}")
        
        print(f"Author: {story.get('by', 'Unknown')}")
        print(f"URL: {story.get('url', 'No URL')}")
        print("-" * 50)

# --------------------
# Filtering Functions
# --------------------

def filter_stories_by_keywords(
    stories: List[Dict[Any, Any]], 
    keywords: List[str], 
    search_fields: Optional[List[str]] = None
) -> List[Dict[Any, Any]]:
    """
    Filter stories based on a list of keywords using whole-word matching.
    """
    if search_fields is None:
        search_fields = ['title', 'url']
    
    matching_stories = []
    for story in stories:
        if not story or story.get("type") != "story":
            continue
        
        for keyword in keywords:
            keyword_lower = keyword.lower()
            pattern = re.compile(r'\b' + re.escape(keyword_lower) + r'\b')
            for field in search_fields:
                field_content = str(story.get(field, '')).lower()
                if pattern.search(field_content):
                    matching_stories.append(story)
                    # Once a keyword matches in one field, no need to check further
                    break
            else:
                continue
            break
            
    return matching_stories

def filter_stories_by_topic_similarity(
    stories: List[Dict[Any, Any]], 
    topics: List[str],
    similarity_threshold: float = 0.3,
    search_fields: Optional[List[str]] = None
) -> List[Dict[Any, Any]]:
    """
    Filter stories based on semantic topic similarity using embeddings.
    For each story, compute the similarity for each search field (e.g., title and url)
    against all topics, take the maximum similarity per field, and average these scores.
    Only stories with an average similarity above the threshold are included.
    """
    if search_fields is None:
        search_fields = ['title', 'url']

    # Get the lazy-loaded SentenceTransformer model
    model = get_sentence_transformer()
    # Precompute embeddings for topics
    topic_embeddings = model.encode(topics, convert_to_tensor=True, show_progress_bar=False)

    matching_stories = []
    for story in stories:
        if not story or story.get("type") != "story":
            continue
        
        field_similarities = []
        for field in search_fields:
            content = str(story.get(field, '')).lower().strip()
            # Optionally clean URL for more meaningful tokens
            if field == 'url':
                content = re.sub(r'https?://|www\.|\.com|\.org|\.net|[0-9]|[-_/]', ' ', content)
            if not content:
                continue
            # Compute embedding for the field content using lazy-loaded model
            content_embedding = model.encode(content, convert_to_tensor=True)
            # Compute cosine similarities with all topic embeddings
            cosine_scores = util.cos_sim(content_embedding, topic_embeddings)
            # Get the maximum similarity for this field
            max_similarity = float(cosine_scores.max())
            field_similarities.append(max_similarity)
        
        if field_similarities:
            # Average the maximum similarity scores across the fields
            average_similarity = sum(field_similarities) / len(field_similarities)
            if average_similarity >= similarity_threshold:
                story['similarity_score'] = average_similarity
                matching_stories.append(story)
    
    matching_stories.sort(key=lambda x: x.get('similarity_score', 0), reverse=True)
    return matching_stories

async def get_filtered_stories(
    num_stories: int = 30,
    keywords: Optional[List[str]] = None,
    topics: Optional[List[str]] = None,
    similarity_threshold: float = 0.3,
    search_fields: Optional[List[str]] = None
) -> List[Dict[Any, Any]]:
    """
    Retrieve trending stories and filter them based on the provided keywords and/or topics.
      - If keywords is provided, only stories containing one of the keywords (in the specified fields) are kept.
      - If topics is provided, only stories with an average semantic similarity above the threshold are kept.
      - If both are provided, only stories that meet both criteria are returned.
      - If neither is provided, all stories are returned.
    """
    top_story_ids = get_top_stories()
    
    async with aiohttp.ClientSession() as session:
        stories = await fetch_items_async(session, top_story_ids[:num_stories * 2])
    
    valid_stories = [story for story in stories if story and story.get("type") == "story"]
    filtered_stories = valid_stories

    if keywords:
        filtered_stories = filter_stories_by_keywords(filtered_stories, keywords, search_fields)
    
    if topics:
        filtered_stories = filter_stories_by_topic_similarity(filtered_stories, topics, similarity_threshold, search_fields)
    
    return filtered_stories

# --------------------
# Main Function
# --------------------

async def main():
    config = {
        "num_stories": 60,
        "back_in_time_hours": 48,
        "topics": [
            "artificial intelligence",
            "machine learning",
            "deep learning",
            "neural networks",
            "computer vision",
            "llm",
            "nasa",
            "apple",
        ],  
        "keywords": ["nvidia", "ai", "gpu", "meta", "apple"], 
        "similarity_threshold": 0.3,
        "search_fields": ["title", "url"],
        "include_similarity_score": True  
    }
    
    filtered_stories = await get_filtered_stories(
        num_stories=config["num_stories"],
        keywords=config.get("keywords"),
        topics=config.get("topics"),
        similarity_threshold=config.get("similarity_threshold"),
        search_fields=config.get("search_fields")
    )
    
    # Filter by time threshold
    current_time = time.time()
    hours_ago = config["back_in_time_hours"]
    time_threshold = current_time - (hours_ago * 3600)
    final_stories = [
        story for story in filtered_stories 
        if story.get("time", 0) >= time_threshold
    ]
    
    analyze_top_stories(final_stories, include_similarity_score=config["include_similarity_score"])

if __name__ == "__main__":
    asyncio.run(main())
