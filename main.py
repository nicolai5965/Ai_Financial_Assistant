import os
import sys
import asyncio
import subprocess
from dotenv import load_dotenv

# ===========================
# Load Environment Variables
# ===========================
load_dotenv()

# Set up LangSmith tracing for LangChain
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "Structured_Report_Generator"
os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"

# ===========================
# Import Local Modules
# ===========================
from validate_api_keys import validate_api_keys
from llm_handler import LLMHandler
from report_models import ReportState

# Import the Google Trends Monitor module
from google_trends_monitor import GoogleTrendsMonitor, TRENDING_KEYWORDS

# ===========================
# Python & Package Validation
# ===========================

def check_python_version():
    """Check and print the Python version."""
    python_version = sys.version
    print(f"✅ Python is running! Version: {python_version}\n")

def check_requirements():
    """Check installed packages and update `requirements.txt` if necessary."""
    package_file = "requirements.txt"

    try:
        # Get currently installed packages
        result = subprocess.run(["pip", "freeze"], capture_output=True, text=True, check=True)
        installed_packages = result.stdout.strip()

        # Read existing requirements.txt (if it exists)
        if os.path.exists(package_file):
            with open(package_file, "r", encoding="utf-8") as file:
                existing_packages = file.read().strip()
        else:
            existing_packages = ""

        # Compare before writing to avoid unnecessary changes
        if installed_packages != existing_packages:
            with open(package_file, "w", encoding="utf-8") as file:
                file.write(installed_packages)
            print(f"✅ Package list updated in {package_file} (changes detected).")
        else:
            print(f"✅ No changes in installed packages. `{package_file}` remains unchanged.")

    except Exception as e:
        print(f"❌ Error retrieving installed packages: {e}")

# ===========================
# Main Execution
# ===========================

def main():
    """Main function to validate system setup and execute report generation."""

    # Step 1: Check Python version
    check_python_version()

    # Step 2: Check installed packages
    check_requirements()

    # Step 3: Validate API keys
    print("\n🔍 Validating API keys...\n")
    if not validate_api_keys():
        print("❌ Exiting due to missing or invalid API keys.")
        return

    # Step 4: Initialize LLM Handler

    print("\n🚀 Initializing LLM Handler...")
    llm_handler = LLMHandler("openai")

    # Get LLM settings (which is likely a dictionary)
    llm_settings = llm_handler.show_settings()

    # ✅ Correctly access the values
    llm_provider = llm_settings.get("llm_provider", "Unknown Provider")
    model_name = llm_settings.get("language_model", {}).get("model_name", "Unknown Model")

    print(f"\n✅ LLM Handler initialized with provider: {llm_provider} using model {model_name}.")

    # Toggle this to enable/disable test mode
    test_mode = False  # Change to True for testing

    # ---------------------------
    # New Step: Generate report topic from trends
    # ---------------------------
    # Set up configuration for the Google Trends Monitor
    monitor_config = {
        "keywords": [],  # Will be set based on sectors below
        "region": "US",
        "spike_threshold": 0.10,  # How much the trend has to increase to be considered a spike
        "time_window_minutes": 3600,  # Query time window in minutes
        "time_interval": 3, # 3 days how long to look back for the trends
        "min_avg_threshold": 30,  # Only consider keywords with an average above a minimum threshold
        "llm_provider": "openai",
        "max_tokens": 1024,
        "temperature": 0.2,
        "debug_mode": False,
        "sectors": ["Semiconductor Leaders"],  # Change to a list like ["Tech & Semiconductors", "AI & Machine Learning"] to filter by sectors
        "max_retries": 4,    # Maximum number of retry attempts for failed requests
        "retry_delay": 1.5,  # Base delay between retries in seconds
        "request_sleep": 2
    }
    # Convert refresh_interval from minutes to milliseconds

    trends_monitor = GoogleTrendsMonitor(monitor_config)
    
    # Generate the report topic based on trending keywords
    trends_monitor_output = asyncio.run(trends_monitor.run_monitor())
    
    if trends_monitor_output is None or trends_monitor_output["generated_topic"] == "":
        print("❌ No report topic generated. Exiting.")
        sys.exit(1)

    report_topic = trends_monitor_output["generated_topic"]

    print(f"📌 Generated Report Topic: {report_topic}")



    # ---------------------------
    # End of trend integration
    # ---------------------------

    # Step 5: Gather user input for report configuration **BEFORE GRAPH BUILDER SETUP**
    if test_mode:
        print("\n🧪 Test mode enabled! Using predefined inputs...\n")
        print("\n llm_settings: ", llm_settings)
        size_choice = input("Enter report size (Concise, Standard, Detailed, Comprehensive): ").strip()
        print(f"📌 Report Size: {size_choice}")
    else:
        size_choice = "Concise"

    # Step 6: Set report size and import formatted prompts  
    # 🚨 Set report size BEFORE importing any graph-related code!
    import fetch_project_prompts  
    fetch_project_prompts.set_report_size(size_choice)

    # 🚨 Now import the formatted prompts AFTER they are correctly set
    from fetch_project_prompts import formatted_prompts, get_report_config

    size_config = get_report_config(size_choice)    


    # Build the initial state
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
        "llm": llm_handler.language_model  # The key: pass the LLM in the state so node functions can do `llm = state["llm"]`
    }

    if test_mode:
        print("\n🔍 DEBUG: Checking initial state before execution:")
        print(initial_state.keys())



    print("\n🔄 Setting up report generation pipeline builders...\n")
    from report_graph_builders import final_report_builder  # Delayed import ensures LLM is ready first
    print("✅ Report generation pipeline is ready! Execution can now begin. 🚀\n")

    # # 🚨 **STOP EXECUTION AFTER TESTING**
    # sys.exit("🛑 Test complete: Exiting script after printing report_structure.")
    # Step 7: Execute report generation
    final_output = asyncio.run(final_report_builder.ainvoke(initial_state))

    # Step 8: Show the final report
    print("\n🎯 === FINAL REPORT === 🎯")
    print(final_output["final_report"])

    print("\n✅ Report generation completed successfully! 🎉\n")

# ===========================
# Entry Point
# ===========================

if __name__ == "__main__":
    main()
