"""Main entry point for the application."""
import asyncio
import os
from app.core.settings import initialize_environment, get_config
from app.utils.system_checks import run_system_checks
from app.core.validate_api_keys import validate_api_keys
from app.services.llm.llm_handler import LLMHandler
from app.models.report_models import ReportState
from app.core.logging_config import get_logger

# ========= ENVIRONMENT CONFIGURATION =========
# Set these constants once at the module level
ENVIRONMENT = os.environ.get("ENVIRONMENT", "production").lower()
IS_DEVELOPMENT = ENVIRONMENT == "development"
# ============================================

# Get the configured logger
logger = get_logger()

# Import all needed functions from fetch_project_prompts in one place
from app.services.llm.fetch_project_prompts import (
    set_report_size, 
    formatted_prompts, 
    get_report_config
)

# Helper function using the module constant instead of checking environment every time
def debug_print(*args, **kwargs):
    """Print debug messages only in development mode."""
    if IS_DEVELOPMENT:
        print(*args, **kwargs)

def get_user_input(test_mode: bool, config: dict) -> tuple[str, str]:
    """Get user input for report configuration.
    
    Args:
        test_mode (bool): Whether to use test mode defaults
        config (dict): Application configuration
        
    Returns:
        tuple[str, str]: Report size and topic
    """
    if test_mode:
        logger.info("Test mode enabled, using predefined inputs")
        print("\n🧪 Test mode enabled! Using predefined inputs...\n")
        size_choice = config["default_report_size"]
        report_topic = "Give an overview of capabilities and specific use case examples for these processing units: CPU, GPU"
    else:
        logger.info("Prompting user for input")
        size_choice = config["default_report_size"]
        report_topic = input("Enter report topic: ").strip()
        
    print(f"📌 Report Size: {size_choice}")
    print(f"📌 Report Topic: {report_topic}")
    logger.info(f"Using report size: {size_choice}, topic: {report_topic}")
    return size_choice, report_topic

async def main():
    """Main function to execute report generation."""

    
    # Log application startup
    logger.info(f"Application starting in {ENVIRONMENT} mode")
    
    # Initialize environment
    initialize_environment()
    config = get_config()
    
    # Get user input first (to determine report size early)
    size_choice, report_topic = get_user_input(config["test_mode"], config)
    
    # Set report size as early as possible, before other imports
    print("\n🔄 Setting report size and initializing prompts...")
    # Use verbose_logging=False to reduce logging output
    set_report_size(size_choice, verbose_logging=False)
    
    # Run system checks and API validation in test mode
    # if not run_system_checks(config["test_mode"]):
    #     print("❌ System checks failed. Please fix the issues and try again.")
    #     return
        
    # if not validate_api_keys(config["test_mode"]):
    #     print("❌ API key validation failed. Please check your environment variables.")
    #     return

    # Initialize LLM Handler
    print("\n🚀 Initializing LLM Handler...")
    llm_handler = LLMHandler(config["llm_provider"])
    # llm_settings = llm_handler.show_settings()
    
    # Get the configuration for the selected report size
    # Use INFO level for this important configuration to reduce debug output
    size_config = get_report_config(size_choice, log_level="INFO")

    # Build initial state
    initial_state: ReportState = {
        "topic": report_topic,
        "tavily_topic": "general",
        "tavily_days": None,
        "report_structure": formatted_prompts["report_structure"],
        "number_of_queries": size_config["number_of_queries"],
        "sections": [],
        "completed_sections": [],
        "report_sections_from_research": "",
        "final_report": "",
        "llm": llm_handler.language_model
    }

    # ====== START DEBUG LOGGING ======
    # Only log detailed debug information if in development mode
    if IS_DEVELOPMENT:
        logger.debug("Initial state configuration set up")
        debug_print("\n🔍 DEBUG: Initial state configuration:")
        debug_print(f"Topic: {initial_state['topic']}")
        debug_print(f"Tavily topic: {initial_state['tavily_topic']}")
        debug_print(f"Number of queries: {initial_state['number_of_queries']}")
        debug_print(f"Sections: {initial_state['sections']}")
        debug_print(f"Report structure: {initial_state['report_structure']}...")
    # ====== END DEBUG LOGGING ======

    # Execute report generation
    print("\n🔄 Generating report...")
    
    # Import report_graph_builders after set_report_size to ensure proper prompt loading
    from app.services.reports.report_graph_builders import final_report_builder
    
    # ====== START DEBUG LOGGING ======
    # Only execute debug code in development mode
    if IS_DEVELOPMENT:
        debug_print("Temporary debug breakpoint")
        # Conditional breakpoint (only in development mode)
        breakpoint()
    # ====== END DEBUG LOGGING ======

    try:
        # ====== START DEBUG LOGGING ======
        logger.info("Invoking final_report_builder")
        if IS_DEVELOPMENT:
            debug_print("\n🔍 DEBUG: Invoking final_report_builder...")
        # ====== END DEBUG LOGGING ======
        
        final_output = await final_report_builder.ainvoke(initial_state)
        
        # ====== START DEBUG LOGGING ======
        logger.info("final_report_builder execution completed")
        if IS_DEVELOPMENT:
            debug_print("\n🔍 DEBUG: final_report_builder execution completed")
            debug_print(f"Type of final_output: {type(final_output)}")
            debug_print(f"Keys in final_output: {list(final_output.keys()) if isinstance(final_output, dict) else 'Not a dictionary'}")
            
            if isinstance(final_output, dict) and "final_report" in final_output:
                debug_print(f"Length of final_report: {len(final_output['final_report'])}")
                has_content = len(final_output['final_report']) > 0
                debug_print(f"Final report has content: {has_content}")
            else:
                debug_print("WARNING: final_report key not found in output or output is not a dictionary")
        # ====== END DEBUG LOGGING ======

        # Display results
        print("\n🎯 === FINAL REPORT === 🎯")
        
        if isinstance(final_output, dict) and "final_report" in final_output and final_output["final_report"]:
            print(final_output["final_report"])
            logger.info("Report generation completed successfully")
            print("\n✅ Report generation completed successfully! 🎉\n")
        else:
            # ====== START DEBUG LOGGING ======
            logger.error("No final report was generated")
            print("\n❌ ERROR: No final report was generated!")
            if IS_DEVELOPMENT:
                debug_print(f"Final output: {final_output}")
            # ====== END DEBUG LOGGING ======
            print("❌ Report generation failed. Check the logs for more information.")
            
    except Exception as e:
        # ====== START DEBUG LOGGING ======
        import traceback
        logger.exception("Exception during report generation: %s", str(e))
        print(f"\n❌ ERROR: An exception occurred during report generation: {str(e)}")
        if IS_DEVELOPMENT:
            debug_print("Traceback:")
            debug_print(traceback.format_exc())
        # ====== END DEBUG LOGGING ======
        print("\n❌ Report generation failed due to an error. Check the logs for more information.")

if __name__ == "__main__":
    asyncio.run(main())
