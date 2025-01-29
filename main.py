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
    """Main function to validate API keys, check Python setup, and initialize LLM handler."""

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

if __name__ == "__main__":
    main()


