"""
Models module for AI Financial Assistant
"""

from typing import List

from app.models.report_models import ReportState, ReportConfig

# Removed structured_report_nodes import to avoid circular dependency

__all__: List[str] = [
    'ReportState',
    'ReportConfig',
]
