"""
Services module for AI Financial Assistant
"""

from typing import List

from app.services.llm_handler import LLMHandler
from app.services.tavily_search import tavily_search, tavily_search_async
from app.services.web_content_extractor import WebContentExtractor
from app.services.hackernews_tracker import HackerNewsTracker
from app.services.url_topic_analyzer import URLTopicAnalyzer
from app.services.hackernews_url_analyzer_pipeline import HackerNewsURLAnalyzerPipeline
from app.services.fetch_project_prompts import formatted_prompts, get_report_config, set_report_size
from app.services.report_graph_builders import final_report_builder

__all__: List[str] = [
    'LLMHandler',
    'tavily_search',
    'tavily_search_async',
    'WebContentExtractor',
    'HackerNewsTracker',
    'URLTopicAnalyzer',
    'HackerNewsURLAnalyzerPipeline',
    'formatted_prompts',
    'get_report_config',
    'set_report_size',
    'final_report_builder',
]
