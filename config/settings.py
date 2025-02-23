"""Configuration settings for the application."""
import os
from dotenv import load_dotenv

def initialize_environment():
    """Initialize environment variables and LangChain settings."""
    # Load environment variables from .env file
    load_dotenv()

    # Set up LangSmith tracing for LangChain
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = "Ai_Financial_Assistant"
    os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"

# Default configurations
DEFAULT_REPORT_SIZE = "Concise"
TEST_MODE = True  # Can be overridden via environment variable

def get_config():
    """Get the application configuration."""
    return {
        "test_mode": os.getenv("TEST_MODE", TEST_MODE),
        "default_report_size": os.getenv("DEFAULT_REPORT_SIZE", DEFAULT_REPORT_SIZE),
        "llm_provider": os.getenv("LLM_PROVIDER", "openai"),
    } 