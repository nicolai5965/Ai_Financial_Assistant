"""
Web services for AI Financial Assistant
"""

from app.services.web.web_content_extractor import WebContentExtractor
from app.services.web.url_topic_analyzer import URLTopicAnalyzer

__all__ = [
    'WebContentExtractor',
    'URLTopicAnalyzer',
]
