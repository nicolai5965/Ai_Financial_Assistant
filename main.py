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
from fetch_project_prompts import report_structure, get_report_config
from report_models import ReportState


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
    # print("\n", llm_settings)

    # ✅ Correctly access the values
    llm_provider = llm_settings.get("llm_provider", "Unknown Provider")
    model_name = llm_settings.get("language_model", {}).get("model_name", "Unknown Model")

    print(f"\n✅ LLM Handler initialized with provider: {llm_provider} using model {model_name}.")


    # Step 5: Import and set up the report builder **only after LLM is ready**
    print("\n🔄 Setting up report generation pipeline builders...\n")
    from report_graph_builders import final_report_builder  # Delayed import ensures LLM is ready first
    print("✅ Report generation pipeline is ready! Execution can now begin. 🚀\n")

    # Step 6: Gather user input for report configuration
    report_topic = input("\nEnter the report topic: ").strip()
    size_choice = input("Enter report size (Concise, Standard, Detailed, Comprehensive): ").strip()

    # Get the config for that size
    size_config = get_report_config(size=size_choice)

    rendered_prompt = report_structure.format(
        min_architecture_sentences=size_config["min_architecture_sentences"],
        max_architecture_sentences=size_config["max_architecture_sentences"],
        min_use_case_sentences=size_config["min_use_case_sentences"],
        max_use_case_sentences=size_config["max_use_case_sentences"]
    )

    # Build the initial state
    initial_state: ReportState = {
        "topic": report_topic,
        "tavily_topic": "general",
        "tavily_days": None,
        "report_structure": rendered_prompt,
        "number_of_queries": size_config["number_of_queries"],
        "sections": [],
        "completed_sections": [],
        "report_sections_from_research": "",
        "final_report": "",
        "llm": llm_handler  # The key: pass the LLM in the state so node functions can do `llm = state["llm"]`
    }

    # Step 7: Execute report generation
    print("\n🛠️ Generating the final report...\n")
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
