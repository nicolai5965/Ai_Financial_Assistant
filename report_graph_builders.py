from IPython.display import Image

from report_models import (
    SectionState, 
    SectionOutputState, 
    ReportState, 
    ReportStateOutput,
    Section,
    Sections,
    SearchQuery,
    Queries
)
from langgraph.graph import StateGraph, END, START
from typing import TypeVar, Dict, Any

from llm_handler import LLMHandler
from structured_report_nodes import (
    generate_report_plan,
    generate_queries,
    search_web,
    write_section,
    initiate_section_writing,
    write_final_sections,
    gather_completed_sections,
    initiate_final_section_writing,
    compile_final_report
)
from fetch_project_prompts import (
    report_planner_query_writer_instructions,
    report_planner_instructions,
    query_writer_instructions,
    section_writer_instructions,
    final_section_writer_instructions,
    report_structure
)
from tavily_search import tavily_search_async
from search_results_formatter import (
    deduplicate_and_format_sources,
    format_sections
)
from report_models import ReportState, SectionState, Queries, Sections
    


# Initialize the LLM handler
llm = LLMHandler(
    llm_provider="anthropic",
    max_tokens=1024,
    temperature=0.2
)

# Simple LLM invocation to test functionality
async def test_llm():
    prompt = "What is the capital of France?"
    response = await llm.invoke([{"content": prompt}])
    print("LLM Response:", response)

# Call the test function
import asyncio
asyncio.run(test_llm())

# Add nodes and edges
section_builder = StateGraph(SectionState, output=SectionOutputState)
section_builder.add_node("generate_queries", generate_queries)
section_builder.add_node("search_web", search_web)
section_builder.add_node("write_section", write_section)

section_builder.add_edge(START, "generate_queries")
section_builder.add_edge("generate_queries", "search_web")
section_builder.add_edge("search_web", "write_section")
section_builder.add_edge("write_section", END)

# Compile
section_builder_graph = section_builder.compile()

# View
display(Image(section_builder_graph.get_graph(xray=1).draw_mermaid_png()))


# Add nodes and edges
final_builder = StateGraph(ReportState, output=ReportStateOutput)
final_builder.add_node("generate_report_plan", generate_report_plan)
final_builder.add_node("build_section_with_web_research", section_builder.compile())
final_builder.add_node("gather_completed_sections", gather_completed_sections)
final_builder.add_node("write_final_sections", write_final_sections)
final_builder.add_node("compile_final_report", compile_final_report)
final_builder.add_edge(START, "generate_report_plan")
final_builder.add_conditional_edges("generate_report_plan", initiate_section_writing, ["build_section_with_web_research"])
final_builder.add_edge("build_section_with_web_research", "gather_completed_sections")
final_builder.add_conditional_edges("gather_completed_sections", initiate_final_section_writing, ["write_final_sections"])
final_builder.add_edge("write_final_sections", "compile_final_report")
final_builder.add_edge("compile_final_report", END)

final_graph = final_builder.compile()
display(Image(final_graph.get_graph(xray=1).draw_mermaid_png()))