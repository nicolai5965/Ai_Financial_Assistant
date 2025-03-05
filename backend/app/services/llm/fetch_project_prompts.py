###############################################################
# 1) Importing LangSmith and LangChain
############################################################### 

from langchain import hub
from langsmith import Client
from langchain.prompts import ChatPromptTemplate
import re
import os
from dotenv import load_dotenv
from app.core.logging_config import get_logger  # Use the new get_logger function
from collections import defaultdict  # For collecting statistics

# Get the configured logger
logger = get_logger()

# Only load environment variables once during initial import
# This prevents multiple log entries during module reloading
_env_loaded = False

def _load_environment():
    """Load environment variables once and log the result."""
    global _env_loaded
    if not _env_loaded:
        try:
            load_dotenv()  # This loads the variables from .env
            logger.info("Environment variables loaded successfully")
            _env_loaded = True
        except Exception as e:
            logger.exception("Failed to load environment variables: %s", str(e))
            raise  # Re-raise the exception as this is critical for configuration

# Load environment during module import
_load_environment()

###############################################################
# 2) Getting Report Configuration
###############################################################

def get_report_config(size="Standard", overrides=None, log_level="DEBUG"):
    """
    Returns a dictionary of placeholder values for the specified report size.
    
    :param size: One of ["Concise", "Standard", "Detailed", "Comprehensive"] (case-insensitive).
    :param overrides: An optional dict to override specific placeholder values.
    :param log_level: The level at which to log (INFO, DEBUG, etc.)
    :return: A dict of placeholder-value pairs.
    """
    # Only log at DEBUG level to reduce verbosity
    if log_level == "INFO":
        logger.info("Getting report configuration for size: %s", size)
    else:
        logger.debug("Getting report configuration for size: %s", size)
    
    # Define the four presets
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

    # Normalize the size string
    size_key = size.strip().lower()

    try:
        # Check if the requested size exists
        if size_key not in config_presets:
            valid_sizes = ", ".join([s.capitalize() for s in config_presets.keys()])
            error_msg = f"Unknown report size '{size}'. Valid options: {valid_sizes}."
            logger.error(error_msg)
            raise ValueError(error_msg)

        # Copy the selected size config
        config = dict(config_presets[size_key])
        
        # If there are overrides, apply them
        if overrides:
            logger.debug("Applying %d config overrides", len(overrides))
            for key, value in overrides.items():
                config[key] = value
                logger.debug("Override applied: %s = %s", key, value)
        
        if log_level == "INFO":
            logger.info("Report config generated successfully for size: %s", size)
        else:
            logger.debug("Report config generated successfully for size: %s", size)
        return config
        
    except Exception as e:
        logger.exception("Error generating report config for size '%s': %s", size, str(e))
        raise  # Re-raise after logging


def format_prompt(prompt, size_choice, verbose_logging=False):
    """
    Automatically formats any prompt by filling in placeholders
    with values from the report configuration.

    :param prompt: The prompt (either a string or a ChatPromptTemplate)
    :param size_choice: The report size ("Concise", "Standard", etc.)
    :param verbose_logging: Whether to log detailed formatting information
    :return: Dictionary with formatted prompt and statistics
    """
    # Only log at DEBUG level and only if verbose_logging is enabled
    if verbose_logging:
        logger.debug("Formatting prompt for size: %s", size_choice)
    
    # Statistics to collect
    stats = {
        "formatted_prompt": "",
        "placeholders_found": 0,
        "placeholders_replaced": 0,
        "warnings": 0,
        "unknown_placeholders": []
    }
    
    try:
        # Convert ChatPromptTemplate to string if needed
        if isinstance(prompt, ChatPromptTemplate):
            prompt_text = prompt.messages[0].prompt.template  # Extract the actual text
            if verbose_logging:
                logger.debug("Converted ChatPromptTemplate to string")
        else:
            prompt_text = prompt

        # Get the appropriate config for the selected size (use DEBUG level logging)
        # Pass verbose_logging to control logging in get_report_config
        log_level = "DEBUG" if verbose_logging else "NONE"
        size_config = get_report_config(size=size_choice, log_level=log_level)
        
        # Find all placeholders in the prompt (e.g., {min_word_limit})
        placeholders = re.findall(r"\{(\w+)\}", prompt_text)
        stats["placeholders_found"] = len(placeholders)
        
        if verbose_logging:
            logger.debug("Found %d placeholders in prompt", stats["placeholders_found"])
        
        # Replace only known placeholders (leave unknown ones unchanged)
        for placeholder in placeholders:
            if placeholder in size_config:
                prompt_text = prompt_text.replace(f"{{{placeholder}}}", str(size_config[placeholder]))
                stats["placeholders_replaced"] += 1
            else:
                stats["unknown_placeholders"].append(placeholder)
        
        if verbose_logging:
            logger.debug("Replaced %d/%d placeholders in prompt", 
                        stats["placeholders_replaced"], stats["placeholders_found"])
        

        if stats["placeholders_replaced"] < stats["placeholders_found"]:
            stats["warnings"] += 1
        
        stats["formatted_prompt"] = prompt_text
        return stats
    
    except Exception as e:
        logger.exception("Error formatting prompt for size '%s': %s", size_choice, str(e))
        raise  # Re-raise after logging


###############################################################
# 3) Pulling All Prompts from LangSmith
###############################################################

# Initialize with empty dict - only filled when fetch_prompts is called
raw_prompts = {}

# Global dictionary for formatted prompts
formatted_prompts = {}

def fetch_prompts():
    """
    Pull prompts from LangChain Hub.
    This function should be called explicitly when prompts are needed.
    
    :return: A dictionary with the raw prompts or an empty dict if fetch fails
    """
    global raw_prompts
    
    # If we already have prompts, return them
    if raw_prompts:
        return raw_prompts
    
    try:
        logger.info("Pulling prompts from LangChain Hub")
        raw_prompts = {
            "report_structure": hub.pull("report_structure"),
            "query_writer_instructions": hub.pull("query_writer_instructions"),
            "section_writer_instructions": hub.pull("section_writer_instructions"),
            "final_section_writer_instructions": hub.pull("final_section_writer_instructions"),
            "report_planner_instructions": hub.pull("report_planner_instructions"),
            "report_planner_query_writer_instructions": hub.pull("report_planner_query_writer_instructions"),
        }
        logger.info("Successfully pulled %d prompts from LangChain Hub", len(raw_prompts))
        return raw_prompts
    except Exception as e:
        logger.exception("Failed to pull prompts from LangChain Hub: %s", str(e))
        # Initialize with empty dict and let the application handle the missing prompts
        raw_prompts = {}
        return raw_prompts
        # Not raising here as this might not be immediately critical - the application
        # can detect missing prompts later and handle accordingly

###############################################################
# 4) Formatting Prompts Based on Report Size
###############################################################

def set_report_size(report_size, verbose_logging=False):
    """
    Formats all prompts based on the selected report size.
    This function should be called from `main.py` before importing formatted prompts.
    
    :param report_size: One of ["Concise", "Standard", "Detailed", "Comprehensive"]
    :param verbose_logging: Whether to log detailed formatting information
    :return: A dictionary with success status and error message if applicable
    """
    logger.info("Setting report size to: %s", report_size)
    global formatted_prompts, raw_prompts  # Ensure we modify the global dictionaries
    
    # First ensure we have the raw prompts
    if not raw_prompts:
        fetch_prompts()
        
    if not raw_prompts:
        return {"success": False, "error": "Failed to fetch prompts from LangChain Hub"}

    # Statistics to collect
    stats = {
        "prompts_formatted": 0,
        "total_placeholders_found": 0,
        "total_placeholders_replaced": 0,
        "warnings": 0
    }
    
    # Collect all missing placeholders by prompt name for consolidated warning
    missing_placeholders_by_prompt = {}

    try:
        # Validate report size early (use INFO level for this important check)
        size_config = get_report_config(report_size, log_level="INFO")
        
        # BATCH PROCESSING APPROACH:
        # First, process all prompts and collect statistics
        for prompt_name, prompt_template in raw_prompts.items():
            result = format_prompt(prompt_template, report_size, verbose_logging)
            formatted_prompts[prompt_name] = result["formatted_prompt"]
            
            # Update statistics
            stats["prompts_formatted"] += 1
            stats["total_placeholders_found"] += result["placeholders_found"]
            stats["total_placeholders_replaced"] += result["placeholders_replaced"]
            stats["warnings"] += result["warnings"]
            
            # Collect missing placeholders by prompt name
            if result["unknown_placeholders"]:
                missing_placeholders_by_prompt[prompt_name] = result["unknown_placeholders"]
        
        # CONSOLIDATED WARNING MESSAGES:
        # Log a single warning with all missing placeholders if any
        if missing_placeholders_by_prompt:
            warning_msg = "Missing placeholders in prompts:\n"
            for prompt_name, placeholders in missing_placeholders_by_prompt.items():
                warning_msg += f"  - {prompt_name}: {', '.join(placeholders)}\n"
            logger.warning(warning_msg)
        
        # Log a summary instead of individual messages
        logger.info("Successfully formatted %d prompts for report size: %s", 
                   stats["prompts_formatted"], report_size)
        
        # Only log detailed statistics if verbose logging is enabled
        if verbose_logging:
            logger.info("Formatting details: %d placeholders found, %d replaced, %d warnings", 
                       stats["total_placeholders_found"], 
                       stats["total_placeholders_replaced"], 
                       stats["warnings"])
            
            # Log additional details about each prompt if verbose
            for prompt_name in formatted_prompts:
                logger.debug("Formatted prompt: %s", prompt_name)
        
        return {"success": True}
    
    except Exception as e:
        error_msg = f"Failed to set report size '{report_size}': {str(e)}"
        logger.exception(error_msg)
        return {"success": False, "error": error_msg}
