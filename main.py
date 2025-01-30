import sys
import os
import subprocess

from llm_handler import LLMHandler
from validate_api_keys import validate_api_keys

def check_python_and_packages():
    """Check Python version and update `requirements.txt` only if new packages are detected."""
    # Check Python version
    python_version = sys.version
    print(f"✅ Python is running! Version: {python_version}\n")

    # File to save package list
    package_file = "requirements.txt"

    try:
        # Get current installed packages
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


def main():
    """Main function to validate API keys, check Python setup, and then run final report generation."""

    # Step 1: Check installed Python version & packages
    check_python_and_packages()

    # Step 2: Validate API keys
    print("\n🔍 Validating API keys...\n")
    if not validate_api_keys():
        print("❌ Exiting due to missing or invalid API keys.")
        return

    # Step 3: Initialize LLM Handler and display settings
    print("\n🚀 Initializing LLM Handler...\n")
    llm_handler = LLMHandler("openai")
    print(llm_handler.show_settings())

    # -------------------------------------------------------------------
    # ADDITIONAL CODE BELOW TO RUN YOUR FINAL REPORT GRAPH
    # -------------------------------------------------------------------

    # Step 4: Gather user input and set the report configuration
    import asyncio
    from fetch_project_prompts import report_structure_prompt, get_report_config
    from report_graph_builders import final_report_builder
    from report_models import Section, ReportState

    # Prompt user for report topic and size
    report_topic = input("\nEnter the report topic: ").strip()
    size_choice = input("Enter report size (Concise, Standard, Detailed, Comprehensive): ").strip()

    # Get the config for that size (controls number_of_queries, etc.)
    size_config = get_report_config(size=size_choice)

    rendered_prompt = report_structure_prompt.format(
        min_architecture_sentences=size_config["min_architecture_sentences"],
        max_architecture_sentences=size_config["max_architecture_sentences"],
        min_use_case_sentences=size_config["min_use_case_sentences"],
        max_use_case_sentences=size_config["max_use_case_sentences"]
    )

    # Build the initial state (including the LLM)
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
        "llm": llm_handler # The key: pass the LLM in the state so node functions can do `llm = state["llm"]`
    }

    # Step 5: Run the final report builder
    final_output = asyncio.run(final_report_builder.run(initial_state))

    # Step 6: Show the final report
    print("\n=== FINAL REPORT ===")
    print(final_output["final_report"])


if __name__ == "__main__":
    main()
