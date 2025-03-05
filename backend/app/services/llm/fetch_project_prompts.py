###############################################################
# 1) Importing LangSmith and LangChain Components
###############################################################

from langsmith import Client
from langchain.prompts import ChatPromptTemplate
import re
import os
from dotenv import load_dotenv
from app.core.logging_config import get_logger  # Centralized logger

# Get the configured logger
logger = get_logger()

# Only load environment variables once during initial import
_env_loaded = False

def _load_environment():
    """Load environment variables once and log the result."""
    global _env_loaded
    if not _env_loaded:
        try:
            load_dotenv()  # Loads variables from .env
            logger.info("Environment variables loaded successfully")
            _env_loaded = True
        except Exception as e:
            logger.exception("Failed to load environment variables: %s", str(e))
            raise

# Load environment during module import
_load_environment()

# Initialize LangSmith Client (expects LANGSMITH_API_KEY to be in the environment)
client = Client()

###############################################################
# 2) Getting Report Configuration
###############################################################

def get_report_config(size="Standard", overrides=None):
    """
    Returns a dictionary of placeholder values for the specified report size.
    
    :param size: One of ["Concise", "Standard", "Detailed", "Comprehensive"] (case-insensitive).
    :param overrides: An optional dict to override specific placeholder values.
    :return: A dict of placeholder-value pairs.
    """
    logger.debug("Getting report configuration for size: %s", size)
    
    config_presets = {
        "concise": {
            "min_word_limit": 100,
            "max_word_limit": 150,
            "min_sentences_per_paragraph": 1,
            "max_sentences_per_paragraph": 2,
            "min_list_items": 2,
            "max_list_items": 3,
            "number_of_queries": 3,
            "min_intro_word_limit": 50,
            "max_intro_word_limit": 80,
            "min_intro_paragraphs": 1,
            "max_intro_paragraphs": 1,
            "min_conclusion_word_limit": 80,
            "max_conclusion_word_limit": 120,
            "min_architecture_sentences": 3,
            "max_architecture_sentences": 4,
            "min_use_case_sentences": 3,
            "max_use_case_sentences": 4
        },
        "standard": {
            "min_word_limit": 150,
            "max_word_limit": 200,
            "min_sentences_per_paragraph": 2,
            "max_sentences_per_paragraph": 3,
            "min_list_items": 3,
            "max_list_items": 5,
            "number_of_queries": 5,
            "min_intro_word_limit": 50,
            "max_intro_word_limit": 100,
            "min_intro_paragraphs": 1,
            "max_intro_paragraphs": 2,
            "min_conclusion_word_limit": 100,
            "max_conclusion_word_limit": 150,
            "min_architecture_sentences": 4,
            "max_architecture_sentences": 6,
            "min_use_case_sentences": 4,
            "max_use_case_sentences": 6
        },
        "detailed": {
            "min_word_limit": 200,
            "max_word_limit": 300,
            "min_sentences_per_paragraph": 2,
            "max_sentences_per_paragraph": 4,
            "min_list_items": 3,
            "max_list_items": 6,
            "number_of_queries": 7,
            "min_intro_word_limit": 80,
            "max_intro_word_limit": 120,
            "min_intro_paragraphs": 1,
            "max_intro_paragraphs": 2,
            "min_conclusion_word_limit": 150,
            "max_conclusion_word_limit": 200,
            "min_architecture_sentences": 5,
            "max_architecture_sentences": 7,
            "min_use_case_sentences": 5,
            "max_use_case_sentences": 7
        },
        "comprehensive": {
            "min_word_limit": 300,
            "max_word_limit": 500,
            "min_sentences_per_paragraph": 3,
            "max_sentences_per_paragraph": 5,
            "min_list_items": 4,
            "max_list_items": 7,
            "number_of_queries": 10,
            "min_intro_word_limit": 100,
            "max_intro_word_limit": 150,
            "min_intro_paragraphs": 2,
            "max_intro_paragraphs": 3,
            "min_conclusion_word_limit": 200,
            "max_conclusion_word_limit": 300,
            "min_architecture_sentences": 6,
            "max_architecture_sentences": 9,
            "min_use_case_sentences": 6,
            "max_use_case_sentences": 9
        }
    }

    size_key = size.strip().lower()
    if size_key not in config_presets:
        valid_sizes = ", ".join([s.capitalize() for s in config_presets.keys()])
        error_msg = f"Unknown report size '{size}'. Valid options: {valid_sizes}."
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    config = dict(config_presets[size_key])
    
    if overrides:
        logger.debug("Applying %d config overrides", len(overrides))
        for key, value in overrides.items():
            config[key] = value
            logger.debug("Override applied: %s = %s", key, value)
    
    logger.debug("Report config generated successfully for size: %s", size)
    return config

###############################################################
# 3) Formatting a Prompt Based on Report Size
###############################################################

def format_prompt(prompt, size_choice):
    """
    Automatically formats any prompt by filling in placeholders with values
    from the report configuration.

    :param prompt: The prompt (either a string or a ChatPromptTemplate)
    :param size_choice: The report size ("Concise", "Standard", etc.)
    :return: Dictionary with the formatted prompt and statistics
    """
    logger.debug("Formatting prompt for size: %s", size_choice)
    
    stats = {
        "formatted_prompt": "",
        "placeholders_found": 0,
        "placeholders_replaced": 0,
        "warnings": 0,
        "unknown_placeholders": []
    }
    
    try:
        if isinstance(prompt, ChatPromptTemplate):
            prompt_text = prompt.messages[0].prompt.template
            logger.debug("Converted ChatPromptTemplate to string")
        else:
            prompt_text = prompt

        size_config = get_report_config(size=size_choice)
        placeholders = re.findall(r"\{(\w+)\}", prompt_text)
        stats["placeholders_found"] = len(placeholders)
        logger.debug("Found %d placeholders in prompt", stats["placeholders_found"])
        
        for placeholder in placeholders:
            if placeholder in size_config:
                prompt_text = prompt_text.replace(f"{{{placeholder}}}", str(size_config[placeholder]))
                stats["placeholders_replaced"] += 1
            else:
                stats["unknown_placeholders"].append(placeholder)
        
        logger.debug("Replaced %d/%d placeholders in prompt", 
                     stats["placeholders_replaced"], stats["placeholders_found"])
        
        if stats["placeholders_replaced"] < stats["placeholders_found"]:
            stats["warnings"] += 1
        
        stats["formatted_prompt"] = prompt_text
        return stats
    
    except Exception as e:
        logger.exception("Error formatting prompt for size '%s': %s", size_choice, str(e))
        raise

###############################################################
# 4) Lazy-loading Prompts Without Caching
###############################################################

def get_formatted_prompt(prompt_name, report_size):
    """
    Fetches a prompt from LangSmith and formats it based on the specified report size.
    No caching is performed so that each call results in a new API request (and usage is tracked).

    :param prompt_name: The name of the prompt to fetch.
    :param report_size: The report size to format the prompt for (e.g., "Standard").
    :return: The formatted prompt as a string, or None if fetching fails.
    """
    try:
        logger.info("Fetching prompt '%s' from LangSmith", prompt_name)
        prompt_template = client.pull_prompt(prompt_name)
        logger.info("Formatting prompt '%s' for report size '%s'", prompt_name, report_size)
        result = format_prompt(prompt_template, report_size)
        return result["formatted_prompt"]
    except Exception as e:
        logger.exception("Error getting formatted prompt '%s': %s", prompt_name, str(e))
        return None
