"""
Services module for AI Financial Assistant
"""

from typing import List

# LLM services
from .llm.llm_handler import LLMHandler
from .llm.fetch_project_prompts import get_report_config, get_formatted_prompt

# Search services
from .search.tavily_search import tavily_search, tavily_search_async
from .search.search_results_formatter import deduplicate_and_format_sources, format_sections

# Report services
from .reports.report_graph_builders import get_final_report_builder

__all__: List[str] = [
    # LLM services
    'LLMHandler',
    'get_report_config',
    'get_formatted_prompt',
    
    # Search services
    'tavily_search',
    'tavily_search_async',
    'deduplicate_and_format_sources',
    'format_sections',
        
    # Report services
    'get_final_report_builder',
]
