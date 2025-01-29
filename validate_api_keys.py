import os
from dotenv import load_dotenv # type: ignore

# Load environment variables from .env file
load_dotenv()

# Required API keys and their expected prefixes
REQUIRED_KEYS = {
    "OPENAI_API_KEY": "sk-",
    "LANGCHAIN_API_KEY": "lsv2_",
    "TAVILY_API_KEY": "tvly-",
    "ANTHROPIC_API_KEY": "sk-"  
}

def validate_api_keys():
    """
    Validate the presence and format of required API keys in the environment.

    Returns:
        bool: True if all keys are valid, False otherwise.
    """
    missing_or_invalid_keys = []

    for key, prefix in REQUIRED_KEYS.items():
        api_key = os.environ.get(key, "")
        if not api_key.startswith(prefix):
            missing_or_invalid_keys.append(f"{key}: Expected prefix '{prefix}'")

    if not missing_or_invalid_keys:
        print("\u2705 All required API keys are set and valid.")
        return True
    else:
        print("\u274C The following API keys are missing or invalid:")
        for error in missing_or_invalid_keys:
            print(f"   - {error}")
        print("\nPlease check your environment variables and ensure all keys are set correctly.")
        return False
