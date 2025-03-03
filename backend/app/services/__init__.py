"""
Services module for AI Financial Assistant
"""

from typing import List

# LLM services
from .llm.llm_handler import LLMHandler
from .llm.fetch_project_prompts import formatted_prompts, get_report_config, set_report_size

# Search services
from .search.tavily_search import tavily_search, tavily_search_async
from .search.search_results_formatter import deduplicate_and_format_sources, format_sections

# Web services
from .web.web_content_extractor import WebContentExtractor
from .web.url_topic_analyzer import URLTopicAnalyzer

# HackerNews services
from .hackernews.hackernews_tracker import HackerNewsTracker
from .hackernews.hackernews_url_analyzer_pipeline import HackerNewsURLAnalyzerPipeline

# Report services
from .reports.report_graph_builders import final_report_builder

__all__: List[str] = [
    # LLM services
    'LLMHandler',
    'formatted_prompts',
    'get_report_config',
    'set_report_size',
    
    # Search services
    'tavily_search',
    'tavily_search_async',
    'deduplicate_and_format_sources',
    'format_sections',
    
    # Web services
    'WebContentExtractor',
    'URLTopicAnalyzer',
    
    # HackerNews services
    'HackerNewsTracker',
    'HackerNewsURLAnalyzerPipeline',
    
    # Report services
    'final_report_builder',
]
