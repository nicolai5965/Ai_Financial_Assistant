import asyncio
import os
from tavily import TavilyClient, AsyncTavilyClient
from langsmith import traceable

# Lazy initialization of clients
_tavily_client = None
_tavily_async_client = None

def get_tavily_client():
    """Get or initialize the Tavily client."""
    global _tavily_client
    if _tavily_client is None:
        _tavily_client = TavilyClient()
    return _tavily_client

def get_tavily_async_client():
    """Get or initialize the Tavily async client."""
    global _tavily_async_client
    if _tavily_async_client is None:
        _tavily_async_client = AsyncTavilyClient()
    return _tavily_async_client

@traceable
def tavily_search(query, max_results=5):
    """ 
    Search the web using the Tavily API.

    Args:
        query (str): The search query to execute.
        max_results (int, optional): Maximum number of search results to retrieve (default: 5).

    Returns:
        dict: Tavily search response containing:
            - results (list): List of search result dictionaries.
    """
    client = get_tavily_client()
    return client.search(query, max_results=max_results, include_raw_content=True)

@traceable
async def tavily_search_async(search_queries, tavily_topic, tavily_days, max_results=5):
    """
    Performs concurrent web searches using the Tavily API.

    Args:
        search_queries (List[str]): List of search queries to process.
        tavily_topic (str): Type of search to perform ('news' or 'general').
        tavily_days (int): Number of days to look back for news articles (only used when tavily_topic='news').
        max_results (int, optional): Maximum number of search results to retrieve per query (default: 5).

    Returns:
        List[dict]: List of search results from Tavily API, one per query.
    """
    client = get_tavily_async_client()
    search_tasks = []
    for query in search_queries:
        if tavily_topic == "news":
            search_tasks.append(
                client.search(
                    query,
                    max_results=5,
                    include_raw_content=True,
                    topic="news",
                    days=tavily_days
                )
            )
        else:
            search_tasks.append(
                client.search(
                    query,
                    max_results=5,
                    include_raw_content=True,
                    topic="general"
                )
            )

    # Execute all searches concurrently
    return await asyncio.gather(*search_tasks)
