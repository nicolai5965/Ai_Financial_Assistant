from langgraph.graph import StateGraph, END, START
from IPython.display import Image

from app.models.report_models import ReportState, ReportStateOutput, SectionState, SectionOutputState
from app.models.structured_report_nodes import (
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

# TEMPORARY: Wrapper functions for debugging conditional edges
def debug_initiate_section_writing(state):
    print("\n🔍 DEBUG: Executing conditional edge: initiate_section_writing")
    print(f"🔍 DEBUG: Input state in the initiate_section_writing function: {state}")
    result = initiate_section_writing(state)
    print(f"🔍 DEBUG: Result from initiate_section_writing: {len(result)} items")
    return result

def debug_initiate_final_section_writing(state):
    print("\n🔍 DEBUG: Executing conditional edge: initiate_final_section_writing")
    print(f"🔍 DEBUG: Input state in the initiate_final_section_writing function: {state}")
    result = initiate_final_section_writing(state)
    print(f"🔍 DEBUG: Result from initiate_final_section_writing: {len(result)} items")
    if len(result) == 0:
        print("🔍 DEBUG: WARNING - Empty result from initiate_final_section_writing!")
        print("🔍 DEBUG: This will likely cause the pipeline to terminate early!")
    return result

# Build a subgraph for a single section
print("🔄 Constructing section builder graph...")
section_builder = StateGraph(SectionState, output=SectionOutputState)

print("➕ Adding nodes to section builder...")
section_builder.add_node("generate_queries", generate_queries)
section_builder.add_node("search_web", search_web)
section_builder.add_node("write_section", write_section)

print("🔗 Defining edges for section builder...")
section_builder.add_edge(START, "generate_queries")
section_builder.add_edge("generate_queries", "search_web")
section_builder.add_edge("search_web", "write_section")
section_builder.add_edge("write_section", END)

print("✅ Section builder graph complete.\n")

# Build the final report graph
print("🔄 Constructing final report graph...")
final_builder = StateGraph(ReportState, output=ReportStateOutput)

print("➕ Adding nodes to final report graph...")
final_builder.add_node("generate_report_plan", generate_report_plan)
final_builder.add_node("build_section_with_web_research", section_builder.compile())
final_builder.add_node("gather_completed_sections", gather_completed_sections)
final_builder.add_node("write_final_sections", write_final_sections)
final_builder.add_node("compile_final_report", compile_final_report)

print("🔗 Defining edges for final report graph...")
final_builder.add_edge(START, "generate_report_plan")
# Use debug wrapper for conditional edges
final_builder.add_conditional_edges("generate_report_plan", debug_initiate_section_writing, ["build_section_with_web_research"])
final_builder.add_edge("build_section_with_web_research", "gather_completed_sections")
# Use debug wrapper for conditional edges
final_builder.add_conditional_edges("gather_completed_sections", debug_initiate_final_section_writing, ["write_final_sections"])
final_builder.add_edge("write_final_sections", "compile_final_report")
final_builder.add_edge("compile_final_report", END)

# TEMPORARY: Add a fallback edge to ensure the pipeline continues
# This is a safety measure in case no non-research sections are found
print("🔗 DEBUG: Adding fallback edge from gather_completed_sections to compile_final_report...")
final_builder.add_edge("gather_completed_sections", "compile_final_report")
print("✅ DEBUG: Fallback edge added.")

print("✅ Final report graph constructed successfully.\n")

# Compile the final graph
print("🛠️ Compiling the final report graph...")
final_graph = final_builder.compile()
print("✅ Compilation complete.\n")

# Assign the compiled graph
final_report_builder = final_graph

