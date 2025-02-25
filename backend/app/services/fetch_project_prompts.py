###############################################################
# 1) Importing LangSmith and LangChain
############################################################### 

from langchain import hub
from langsmith import Client
from langchain.prompts import ChatPromptTemplate
import re
from dotenv import load_dotenv
import os


load_dotenv()  # This loads the variables from .env

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

    # Check if the requested size exists
    if size_key not in config_presets:
        valid_sizes = ", ".join([s.capitalize() for s in config_presets.keys()])
        raise ValueError(f"Unknown report size '{size}'. Valid options: {valid_sizes}.")

    # Copy the selected size config
    config = dict(config_presets[size_key])

    # If there are overrides, apply them
    if overrides:
        for key, value in overrides.items():
            config[key] = value

    return config


def format_prompt(prompt, size_choice):
    """
    Automatically formats any prompt by filling in placeholders
    with values from the report configuration.

    :param prompt: The prompt (either a string or a ChatPromptTemplate)
    :param size_choice: The report size ("Concise", "Standard", etc.)
    :return: The formatted prompt with values inserted.
    """
    
    # Convert ChatPromptTemplate to string if needed
    if isinstance(prompt, ChatPromptTemplate):
        prompt = prompt.messages[0].prompt.template  # Extract the actual text

    # Get the appropriate config for the selected size
    size_config = get_report_config(size=size_choice)
    
    # Find all placeholders in the prompt (e.g., {min_word_limit})
    placeholders = re.findall(r"\{(\w+)\}", prompt)
    
    # Replace only known placeholders (leave unknown ones unchanged)
    for placeholder in placeholders:
        if placeholder in size_config:
            prompt = prompt.replace(f"{{{placeholder}}}", str(size_config[placeholder]))
    
    return prompt  # Return with unknown placeholders intact


###############################################################
# 3) Pulling All Prompts from LangSmith
###############################################################


# Pull raw prompts (before formatting)
raw_prompts = {
    "report_structure": hub.pull("report_structure"),
    "query_writer_instructions": hub.pull("query_writer_instructions"),
    "section_writer_instructions": hub.pull("section_writer_instructions"),
    "final_section_writer_instructions": hub.pull("final_section_writer_instructions"),
    "report_planner_instructions": hub.pull("report_planner_instructions"),
    "report_planner_query_writer_instructions": hub.pull("report_planner_query_writer_instructions"),
}

# Global dictionary for formatted prompts
formatted_prompts = {}

def set_report_size(report_size):
    """
    Formats all prompts based on the selected report size.
    This function should be called from `main.py` before importing formatted prompts.
    """
    global formatted_prompts  # Ensure we modify the global dictionary

    size_config = get_report_config(report_size)

    for prompt_name, prompt_template in raw_prompts.items():
        formatted_prompts[prompt_name] = format_prompt(prompt_template, report_size)

    print(f"Prompts formatted for report size: {report_size}")


# Ensure formatted_prompts is initialized with default size to avoid errors
#set_report_size("Standard")

# # Export formatted prompts as individual variables
# report_structure = formatted_prompts["report_structure"]
# query_writer_instructions = formatted_prompts["query_writer_instructions"]
# section_writer_instructions = formatted_prompts["section_writer_instructions"]
# final_section_writer_instructions = formatted_prompts["final_section_writer_instructions"]
# report_planner_instructions = formatted_prompts["report_planner_instructions"]
# report_planner_query_writer_instructions = formatted_prompts["report_planner_query_writer_instructions"]











# ------------------------------------------------------------------------------------------------

# # 1) Pull your 6 prompts by name
# report_structure_prompt = hub.pull("report_structure")
# report_planner_query_writer_instructions_prompt = hub.pull("report_planner_query_writer_instructions")
# report_planner_instructions_prompt = hub.pull("report_planner_instructions")
# query_writer_instructions_prompt = hub.pull("query_writer_instructions")
# section_writer_instructions_prompt = hub.pull("section_writer_instructions")
# final_section_writer_instructions_prompt = hub.pull("final_section_writer_instructions")


# # 2) Format the prompt dynamically
# report_structure = format_prompt(report_structure_prompt, size_choice)
# report_planner_query_writer_instructions = format_prompt(report_planner_query_writer_instructions_prompt, size_choice)
# report_planner_instructions = format_prompt(report_planner_instructions_prompt, size_choice)
# query_writer_instructions = format_prompt(query_writer_instructions_prompt, size_choice)
# section_writer_instructions = format_prompt(section_writer_instructions_prompt, size_choice)
# final_section_writer_instructions = format_prompt(final_section_writer_instructions_prompt, size_choice)