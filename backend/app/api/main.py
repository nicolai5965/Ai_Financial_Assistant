"""Main entry point for the application."""
import asyncio
from app.core.settings import initialize_environment, get_config
from app.utils.system_checks import run_system_checks
from app.core.validate_api_keys import validate_api_keys
from app.services.llm.llm_handler import LLMHandler
from app.models.report_models import ReportState


def get_user_input(test_mode: bool, config: dict) -> tuple[str, str]:
    """Get user input for report configuration.
    
    Args:
        test_mode (bool): Whether to use test mode defaults
        config (dict): Application configuration
        
    Returns:
        tuple[str, str]: Report size and topic
    """
    if test_mode:
        print("\n🧪 Test mode enabled! Using predefined inputs...\n")
        size_choice = config["default_report_size"]
        report_topic = "News on NVIDIA stock"
    else:
        size_choice = config["default_report_size"]
        report_topic = input("Enter report topic: ").strip()
        
    print(f"📌 Report Size: {size_choice}")
    print(f"📌 Report Topic: {report_topic}")
    return size_choice, report_topic

async def main():
    """Main function to execute report generation."""
    # Initialize environment
    initialize_environment()
    config = get_config()
    
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
    
    # Get user input
    size_choice, report_topic = get_user_input(config["test_mode"], config)
    # Import and configure report generation components
    from app.services.llm.fetch_project_prompts import set_report_size, formatted_prompts, get_report_config
    
    # Configure the report size first, which updates the formatted_prompts
    set_report_size(size_choice)
    
    # Get the configuration for the selected report size
    size_config = get_report_config(size_choice)

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
    print("\n🔍 DEBUG: Initial state configuration:")
    print(f"Topic: {initial_state['topic']}")
    print(f"Tavily topic: {initial_state['tavily_topic']}")
    print(f"Number of queries: {initial_state['number_of_queries']}")
    print(f"Sections: {initial_state['sections']}")
    print(f"Report structure: {initial_state['report_structure']}...")
    # ====== END DEBUG LOGGING ======

    # Execute report generation
    print("\n🔄 Generating report...")
    from app.services.reports.report_graph_builders import final_report_builder
    
    try:
        # ====== START DEBUG LOGGING ======
        print("\n🔍 DEBUG: Invoking final_report_builder...")
        # ====== END DEBUG LOGGING ======
        
        final_output = await final_report_builder.ainvoke(initial_state)
        
        # ====== START DEBUG LOGGING ======
        print("\n🔍 DEBUG: final_report_builder execution completed")
        print(f"Type of final_output: {type(final_output)}")
        print(f"Keys in final_output: {list(final_output.keys()) if isinstance(final_output, dict) else 'Not a dictionary'}")
        
        if isinstance(final_output, dict) and "final_report" in final_output:
            print(f"Length of final_report: {len(final_output['final_report'])}")
            has_content = len(final_output['final_report']) > 0
            print(f"Final report has content: {has_content}")
        else:
            print("WARNING: final_report key not found in output or output is not a dictionary")
        # ====== END DEBUG LOGGING ======

        # Display results
        print("\n🎯 === FINAL REPORT === 🎯")
        
        if isinstance(final_output, dict) and "final_report" in final_output and final_output["final_report"]:
            print(final_output["final_report"])
            print("\n✅ Report generation completed successfully! 🎉\n")
        else:
            # ====== START DEBUG LOGGING ======
            print("\n❌ ERROR: No final report was generated!")
            print(f"Final output: {final_output}")
            # ====== END DEBUG LOGGING ======
            print("❌ Report generation failed. Check the logs for more information.")
            
    except Exception as e:
        # ====== START DEBUG LOGGING ======
        import traceback
        print(f"\n❌ ERROR: An exception occurred during report generation: {str(e)}")
        print("Traceback:")
        traceback.print_exc()
        # ====== END DEBUG LOGGING ======
        print("\n❌ Report generation failed due to an error. Check the logs for more information.")

if __name__ == "__main__":
    asyncio.run(main())
