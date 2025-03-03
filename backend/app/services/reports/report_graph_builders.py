from langgraph.graph import StateGraph, END, START
from IPython.display import Image

from app.core.logging_config import get_logger
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

# Initialize the logger at the module level
logger = get_logger()

# TEMPORARY: Wrapper functions for debugging conditional edges
def debug_initiate_section_writing(state):
    logger.debug("Executing conditional edge: initiate_section_writing")
    
    try:
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(f"Input state in the initiate_section_writing function: {state}")
        
        result = initiate_section_writing(state)
        
        logger.debug(f"Result from initiate_section_writing: {len(result)} items")
        return result
    except Exception as e:
        logger.exception(f"Error in initiate_section_writing: {str(e)}")
        # Re-raise to maintain the original error behavior
        raise

def debug_initiate_final_section_writing(state):
    logger.debug("Executing conditional edge: initiate_final_section_writing")
    
    try:
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(f"Input state in the initiate_final_section_writing function: {state}")
        
        result = initiate_final_section_writing(state)
        
        logger.debug(f"Result from initiate_final_section_writing: {len(result)} items")
        
        if len(result) == 0:
            logger.warning("Empty result from initiate_final_section_writing - this may cause the pipeline to terminate early!")
        
        return result
    except Exception as e:
        logger.exception(f"Error in initiate_final_section_writing: {str(e)}")
        # Re-raise to maintain the original error behavior
        raise

# Initialize the final report builder as None for lazy loading
final_report_builder = None

def build_final_report_graph():
    """
    Builds and returns the final report graph.
    This function encapsulates all graph construction code to prevent
    execution at import time.
    
    Returns:
        The compiled final report graph
    """
    try:
        # Build a subgraph for a single section
        logger.info("Constructing section builder graph...")
        section_builder = StateGraph(SectionState, output=SectionOutputState)

        logger.debug("Adding nodes to section builder...")
        section_builder.add_node("generate_queries", generate_queries)
        section_builder.add_node("search_web", search_web)
        section_builder.add_node("write_section", write_section)

        logger.debug("Defining edges for section builder...")
        section_builder.add_edge(START, "generate_queries")
        section_builder.add_edge("generate_queries", "search_web")
        section_builder.add_edge("search_web", "write_section")
        section_builder.add_edge("write_section", END)

        logger.info("Section builder graph complete")

        # Build the final report graph
        logger.info("Constructing final report graph...")
        final_builder = StateGraph(ReportState, output=ReportStateOutput)

        logger.debug("Adding nodes to final report graph...")
        final_builder.add_node("generate_report_plan", generate_report_plan)
        final_builder.add_node("build_section_with_web_research", section_builder.compile())
        final_builder.add_node("gather_completed_sections", gather_completed_sections)
        final_builder.add_node("write_final_sections", write_final_sections)
        final_builder.add_node("compile_final_report", compile_final_report)

        logger.debug("Defining edges for final report graph...")
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
        logger.debug("Adding fallback edge from gather_completed_sections to compile_final_report...")
        final_builder.add_edge("gather_completed_sections", "compile_final_report")
        logger.debug("Fallback edge added successfully")

        logger.info("Final report graph constructed successfully")

        # Compile the final graph
        logger.info("Compiling the final report graph...")
        try:
            final_graph = final_builder.compile()
            logger.info("Graph compilation complete")
        except Exception as compile_error:
            logger.error(f"Error compiling final report graph: {str(compile_error)}")
            raise

        return final_graph
    except Exception as e:
        logger.exception(f"Unexpected error building report graph: {str(e)}")
        raise

def get_final_report_builder():
    """
    Lazily initializes and returns the final report graph.
    The graph is only built the first time this function is called.
    
    Returns:
        The compiled final report graph
    """
    global final_report_builder
    
    try:
        if final_report_builder is None:
            logger.info("Initializing final report builder for the first time")
            final_report_builder = build_final_report_graph()
        else:
            logger.debug("Returning existing final report builder instance")
        
        return final_report_builder
    except Exception as e:
        logger.exception(f"Error in get_final_report_builder: {str(e)}")
        raise

# Import this at the module level to avoid circular imports
import logging

