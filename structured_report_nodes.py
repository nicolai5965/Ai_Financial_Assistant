from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.constants import Send


from report_models import ReportState, SectionState, Queries, Sections
from search_results_formatter import deduplicate_and_format_sources, format_sections
from tavily_search import tavily_search_async
# from fetch_project_prompts import (
#     report_planner_query_writer_instructions,
#     report_planner_instructions,
#     query_writer_instructions,
#     section_writer_instructions,
#     final_section_writer_instructions, 
#     get_report_config
# )

from fetch_project_prompts import formatted_prompts

# Access formatted prompts dynamically
report_planner_query_writer_instructions = formatted_prompts["report_planner_query_writer_instructions"]
report_planner_instructions = formatted_prompts["report_planner_instructions"]
query_writer_instructions = formatted_prompts["query_writer_instructions"]
section_writer_instructions = formatted_prompts["section_writer_instructions"]
final_section_writer_instructions = formatted_prompts["final_section_writer_instructions"]





# ====================================================
# Report Plan Generation Node
# ====================================================

async def generate_report_plan(state: ReportState):
    """
    Generates a structured report plan by:
    1. Generating search queries using an LLM
    2. Searching the web using Tavily
    3. Deduplicating and formatting search results
    4. Generating report sections using a second LLM prompt
    
    Args:
        state (ReportState): Contains report configuration including topic, structure, etc.
        
    Returns:
        dict: Contains list of Section objects with empty content fields
    """

    print("\n📝 Generating report plan...")

    # Extract inputs from state
    llm = state["llm"]
    topic = state["topic"]
    report_structure = state["report_structure"]
    number_of_queries = state["number_of_queries"]
    tavily_topic = state["tavily_topic"]
    tavily_days = state.get("tavily_days", None)

    # Convert JSON object to string if necessary
    if isinstance(report_structure, dict):
        report_structure = str(report_structure)

    # 1. Generate search queries using LLM
    print("🔍 Generating search queries...")
    structured_llm = llm.with_structured_output(Queries)
    system_instructions_query = report_planner_query_writer_instructions.format(
        topic=topic, 
        report_organization=report_structure,
        number_of_queries=number_of_queries
    )
    results = structured_llm.invoke([
        SystemMessage(content=system_instructions_query),
        HumanMessage(content="Generate search queries that will help with planning the sections of the report.")
    ])
    print("✅ Search queries generated.")

    # 2. Execute web searches via Tavily
    print("🔍 Executing web searches via Tavily...")
    query_list = [query.search_query for query in results.queries]

    if not query_list or not all(isinstance(q, str) and q.strip() for q in query_list):
        raise ValueError("❌ ERROR: Query list is empty or contains invalid data.")
    
    search_docs = await tavily_search_async(query_list, tavily_topic, tavily_days)
    print("✅ Tavily searches completed.")

    # 3. Process and format search results
    print("📜 Formatting and deduplicating search results...")
    source_str = deduplicate_and_format_sources(
        search_docs, 
        max_tokens_per_source=1000, 
        include_raw_content=True
    )
    print("✅ Search results formatted and deduplicated.")

    # 4. Generate report sections using second LLM prompt
    print("✍️ Generating report sections...")
    system_instructions_sections = report_planner_instructions.format(
        topic=topic,
        report_organization=report_structure,
        context=source_str
    )
    structured_llm = llm.with_structured_output(Sections)
    report_sections = structured_llm.invoke([
        SystemMessage(content=system_instructions_sections),
        HumanMessage(content="Generate the sections of the report. Your response must include a 'sections' field containing a list of sections. Each section must have: name, description, research, and content fields.")
    ])
    print("✅ Report sections generated.")

    # Return list of sections
    return {"sections": report_sections.sections}


# ====================================================
# Section Generation Node Functions
# ===========================

def generate_queries(state: SectionState):
    """
    Uses the LLM to produce a list of search queries for a single section.

    Args:
        state (SectionState): Contains section info and query parameters

    Returns:
        dict: Contains "search_queries" list of generated queries
    """

    print(f"\n🔍 Generating queries for section: {state['section'].name}...")
    # Extract inputs from state
    llm = state["llm"]
    number_of_queries = state["number_of_queries"]
    section = state["section"]

    # Generate queries
    structured_llm = llm.with_structured_output(Queries)

    # Format system instructions
    system_instructions = query_writer_instructions.format(section_topic=section.description, number_of_queries=number_of_queries)

    # Generate queries
    queries = structured_llm.invoke([SystemMessage(content=system_instructions)]+[HumanMessage(content="Generate search queries on the provided topic.")])

    print(f"✅ Queries generated for section: {state['section'].name}.")

    return {"search_queries": queries.queries}

async def search_web(state: SectionState):
    """
    Performs Tavily web searches for each query and formats the results.

    Args:
        state (SectionState): Contains search queries and search parameters

    Returns:
        dict: Contains "source_str" with formatted search results
    """

    print(f"\n🌐 Searching the web for section: {state['section'].name}...")
    # Extract inputs from state
    search_queries = state["search_queries"]
    tavily_topic = state["tavily_topic"]
    tavily_days = state.get("tavily_days", None)

    # Web search
    query_list = [query.search_query for query in search_queries]
    search_docs = await tavily_search_async(query_list, tavily_topic, tavily_days)
    print(f"✅ Tavily searches completed for section: {state['section'].name}.")
    # Deduplicate and format sources
    source_str = deduplicate_and_format_sources(search_docs, max_tokens_per_source=5000, include_raw_content=True)
    print(f"✅ Search results formatted and deduplicated for section: {state['section'].name}.")
    return {"source_str": source_str}

def write_section(state: SectionState):
    """
    Writes the final text of a report section by incorporating search results.

    Args:
        state (SectionState): Contains section info and search results

    Returns:
        dict: Contains "completed_sections" with the finalized section
    """

    print(f"\n✍️ Writing section: {state['section'].name}...")
    # Extract inputs from state
    llm = state["llm"]
    section = state["section"]
    source_str = state["source_str"]

    # Format system instructions
    system_instructions = section_writer_instructions.format(section_title=section.name, section_topic=section.description, context=source_str)

    # Generate section
    section_content = llm.invoke([SystemMessage(content=system_instructions)]+[HumanMessage(content="Generate a report section based on the provided sources.")])
    # Write content to the section object
    section.content = section_content.content

    print(f"✅ Section: {state['section'].name} written.")
    # Write the updated section to completed sections
    return {"completed_sections": [section]}

# ==================================================
# Node Functions for the Full Report Workflow
# =========================

def initiate_section_writing(state: ReportState):
    """
    Initiates web research and writing for sections that require research.
    This is the "map" step that kicks off parallel processing via Send() API.

    Args:
        state (ReportState): Contains report configuration and sections

    Returns:
        list: List of Send() API calls for sections requiring research
    """
    print("\n🚀 Initiating section writing...")
    result = [
        Send("build_section_with_web_research", {
            "section": s,
            "number_of_queries": state["number_of_queries"],
            "tavily_topic": state["tavily_topic"],
            "tavily_days": state.get("tavily_days", None),
            "llm": state["llm"]
        })
        for s in state["sections"]
        if s.research
    ]

    print("✅ Section writing initiated.")

    return result

def write_final_sections(state: SectionState):
    """
    Writes sections that don't require web research (e.g. Introduction, Conclusion).
    Uses completed research sections as context for synthesis.

    Args:
        state (SectionState): Contains section info and completed research sections

    Returns:
        dict: Contains completed section
    """

    print(f"\n✍️ Writing final section: {state['section'].name}...")
    # Extract inputs from state
    llm = state["llm"]
    section = state["section"]
    completed_report_sections = state["report_sections_from_research"]

    # Format system instructions
    system_instructions = final_section_writer_instructions.format(
        section_title=section.name,
        section_topic=section.description,
        context=completed_report_sections
    )

    section_content = llm.invoke([
        SystemMessage(content=system_instructions),
        HumanMessage(content="Generate a report section based on the provided sources.")
    ])

    section.content = section_content.content

    print(f"✅ Section: {state['section'].name} written.")

    return {"completed_sections": [section]}

def gather_completed_sections(state: ReportState):
    """
    Collects and formats completed research sections to be used as context.

    Args:
        state (ReportState): Contains completed sections

    Returns:
        dict: Contains formatted string of completed sections
    """
    print("\n📦 Gathering completed sections...")
    # Extract inputs from state
    completed_sections = state["completed_sections"]

    completed_report_sections = format_sections(completed_sections)
    print("✅ Completed sections gathered.")
    return {"report_sections_from_research": completed_report_sections}

def initiate_final_section_writing(state: ReportState):
    """
    Initiates writing of non-research sections after research sections are complete.
    This is the "map" step that kicks off parallel processing via Send() API.

    Args:
        state (ReportState): Contains report sections and completed research

    Returns:
        list: List of Send() API calls for non-research sections
    """
    print("\n🚀 Initiating final section writing...")
    return [
        Send("write_final_sections", {
            "section": s,
            "report_sections_from_research": state["report_sections_from_research"],
            "llm": state["llm"]
        })
        for s in state["sections"]
        if not s.research
    ]


def compile_final_report(state: ReportState):
    """
    Combines all sections in order into a cohesive final report.

    Args:
        state (ReportState): Contains all sections and completed content

    Returns:
        dict: Contains final compiled report
    """
    print("\n🔄 Compiling final report...")

    # Extract inputs from state
    sections = state["sections"]
    completed_sections = {s.name: s.content for s in state["completed_sections"]}

    # Update sections while maintaining original order
    for section in sections:
        section.content = completed_sections[section.name]

    all_sections = "\n\n".join([s.content for s in sections])
    print("✅ Final report compiled.")
    return {"final_report": all_sections}


