"""API key validation utilities."""
import os
from dotenv import load_dotenv # type: ignore
from typing import Dict, List, Tuple

# Load environment variables from .env file
load_dotenv()

def check_api_key(key_name: str) -> Tuple[bool, str]:
    """Check if a specific API key exists and has correct prefix.
    
    Args:
        key_name (str): Name of the environment variable containing the API key
        
    Returns:
        Tuple[bool, str]: (is_valid, message)
    """
    key = os.getenv(key_name)
    if not key:
        return False, f"Missing {key_name}"
    
    # Add prefix checks based on key type
    prefix_checks = {
        "OPENAI_API_KEY": "sk-",
        "ANTHROPIC_API_KEY": "sk-ant-",
        "TAVILY_API_KEY": "tvly-",
        "LANGCHAIN_API_KEY": "lsv2_"
    }
    
    if key_name in prefix_checks:
        prefix = prefix_checks[key_name]
        if not key.startswith(prefix):
            return False, f"{key_name} should start with '{prefix}'"
    
    return True, f"{key_name} is valid"

def validate_api_keys(test_mode: bool = False) -> bool:
    """Validate all required API keys.
    
    Args:
        test_mode (bool): Whether to perform validation
        
    Returns:
        bool: True if all keys are valid or if not in test mode
    """
    if not test_mode:
        return True
        
    required_keys = [
        "OPENAI_API_KEY",
        "TAVILY_API_KEY",
        "ANTHROPIC_API_KEY",
        "GEMINI_API_KEY",
        "LANGCHAIN_API_KEY"
    ]
    
    all_valid = True
    for key_name in required_keys:
        is_valid, message = check_api_key(key_name)
        print(f"{'✅' if is_valid else '❌'} {message}")
        all_valid = all_valid and is_valid
    
    return all_valid
