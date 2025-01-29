import asyncio
from tavily import TavilyClient, AsyncTavilyClient
from langsmith import traceable

# Initialize Tavily Clients
tavily_client = TavilyClient()
tavily_async_client = AsyncTavilyClient()

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
    return tavily_client.search(query, max_results=max_results, include_raw_content=True)

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

    search_tasks = []
    for query in search_queries:
        search_tasks.append(
            tavily_async_client.search(
                query,
                max_results=max_results,
                include_raw_content=True,
                topic=tavily_topic,
                days=tavily_days if tavily_topic == "news" else None
            )
        )

    # Execute all searches concurrently
    return await asyncio.gather(*search_tasks)
