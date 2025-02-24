"""Main entry point for the application."""
import asyncio
from config.settings import initialize_environment, get_config
from utils.system_checks import run_system_checks
from validate_api_keys import validate_api_keys
from llm_handler import LLMHandler
from report_models import ReportState

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
        size_choice = input("Enter report size (Concise, Standard, Detailed, Comprehensive): ").strip()
        report_topic = input("Enter report topic: ").strip()
    else:
        size_choice = config["DEFAULT_REPORT_SIZE"]
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
    if not run_system_checks(config["test_mode"]):
        print("❌ System checks failed. Please fix the issues and try again.")
        return
        
    if not validate_api_keys(config["test_mode"]):
        print("❌ API key validation failed. Please check your environment variables.")
        return

    # Initialize LLM Handler
    print("\n🚀 Initializing LLM Handler...")
    llm_handler = LLMHandler(config["llm_provider"])
    llm_settings = llm_handler.show_settings()
    
    # Get user inputCon
    size_choice, report_topic = get_user_input(config["test_mode"], config)

    # Import and configure report generation components
    import fetch_project_prompts
    fetch_project_prompts.set_report_size(size_choice)
    from fetch_project_prompts import formatted_prompts, get_report_config
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

    # Execute report generation
    print("\n🔄 Generating report...")
    from report_graph_builders import final_report_builder
    final_output = await final_report_builder.ainvoke(initial_state)

    # Display results
    print("\n🎯 === FINAL REPORT === 🎯")
    print(final_output["final_report"])
    print("\n✅ Report generation completed successfully! 🎉\n")

if __name__ == "__main__":
    asyncio.run(main())
