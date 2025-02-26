from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Annotated, Any, Dict
from typing_extensions import TypedDict
import operator

# =========================
# Report Configuration
# =========================

class ReportConfig(BaseModel):
    """Configuration settings for report generation."""
    min_word_limit: int = Field(description="Minimum word limit for sections")
    max_word_limit: int = Field(description="Maximum word limit for sections")
    min_sentences_per_paragraph: int = Field(description="Minimum sentences per paragraph")
    max_sentences_per_paragraph: int = Field(description="Maximum sentences per paragraph")
    min_list_items: int = Field(description="Minimum items in lists")
    max_list_items: int = Field(description="Maximum items in lists")
    number_of_queries: int = Field(description="Number of search queries to perform")
    min_intro_word_limit: int = Field(description="Minimum word limit for introduction")
    max_intro_word_limit: int = Field(description="Maximum word limit for introduction")
    min_intro_paragraphs: int = Field(description="Minimum paragraphs in introduction")
    max_intro_paragraphs: int = Field(description="Maximum paragraphs in introduction")
    min_conclusion_word_limit: int = Field(description="Minimum word limit for conclusion")
    max_conclusion_word_limit: int = Field(description="Maximum word limit for conclusion")
    min_architecture_sentences: int = Field(description="Minimum sentences for architecture description")
    max_architecture_sentences: int = Field(description="Maximum sentences for architecture description")
    min_use_case_sentences: int = Field(description="Minimum sentences for use case description")
    max_use_case_sentences: int = Field(description="Maximum sentences for use case description")

# =========================
# Section Models
# =========================

class Section(BaseModel):
    """Represents a single section in the report."""
    name: str = Field(description="Name for this section of the report.")
    description: str = Field(default="", description="Brief overview of the main topics and concepts to be covered in this section.")
    research: bool = Field(description="Whether to perform web research for this section of the report.")
    content: str = Field(default="", description="The content of the section.")

class Sections(BaseModel):
    """Encapsulates a list of sections in the report."""
    sections: List[Section] = Field(description="Sections of the report.")

# =========================
# Query Models
# =========================

class SearchQuery(BaseModel):
    """Represents a single search query for Tavily web search."""
    search_query: str = Field(None, description="Query for web search.")

class Queries(BaseModel):
    """A collection of search queries."""
    queries: List[SearchQuery] = Field(description="List of search queries.")

# =========================
# State Tracking for Report Generation
# =========================

class ReportState(TypedDict):
    """Tracks the overall state of the report generation process."""
    topic: str  # Report topic
    tavily_topic: Literal["general", "news"]  # Tavily search topic
    tavily_days: Optional[int]  # Only applicable for news topic
    report_structure: str  # Report structure
    number_of_queries: int  # Number of web search queries to perform per section
    sections: List[Section]  # List of report sections
    completed_sections: Annotated[List[Section], operator.add]  # Send() API key
    report_sections_from_research: str  # String of any completed sections from research to write final sections
    final_report: str  # Final report output
    llm: Any

class SectionState(TypedDict):
    """Tracks the state of an individual report section during processing."""
    tavily_topic: Literal["general", "news"]  # Tavily search topic
    tavily_days: Optional[int]  # Only applicable for news topic
    number_of_queries: int  # Number of search queries for this section
    section: Section  # The report section being processed
    search_queries: List[SearchQuery]  # List of search queries
    source_str: str  # Formatted content from web search
    report_sections_from_research: str  # Contextual information from previous sections
    completed_sections: List[Section]  # Final output sections
    llm: Any

class SectionOutputState(TypedDict):
    """Defines the output shape for a completed report section."""
    completed_sections: List[Section]  # Completed sections

class ReportStateOutput(TypedDict):
    """Final compiled report structure."""
    final_report: str  # The fully compiled report
