"""
Services module for AI Financial Assistant
"""

from typing import List

# LLM services
from app.services.llm.llm_handler import LLMHandler
from app.services.llm.fetch_project_prompts import formatted_prompts, get_report_config, set_report_size

# Search services
from app.services.search.tavily_search import tavily_search, tavily_search_async
from app.services.search.search_results_formatter import deduplicate_and_format_sources, format_sections

# Web services
from app.services.web.web_content_extractor import WebContentExtractor
from app.services.web.url_topic_analyzer import URLTopicAnalyzer

# HackerNews services
from app.services.hackernews.hackernews_tracker import HackerNewsTracker
from app.services.hackernews.hackernews_url_analyzer_pipeline import HackerNewsURLAnalyzerPipeline

# Report services
from app.services.reports.report_graph_builders import final_report_builder

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
