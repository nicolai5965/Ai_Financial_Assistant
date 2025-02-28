import os
import datetime
from uuid import uuid4
from langchain_openai import ChatOpenAI  # type: ignore
from langchain_anthropic import ChatAnthropic  # type: ignore
from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore

class LLMHandler:
    """
    A handler for managing language models from different providers.
    """

    def __init__(self, llm_provider, max_tokens=1024, temperature=0.0, model_name=None):
        """
        Initialize the language model handler.

        Parameters:
        - llm_provider (str): The name of the language model provider ('openai', 'anthropic', or 'google').
        - max_tokens (int): Maximum number of tokens for the generated response.
        - temperature (float): Sampling temperature for the language model.
        - model_name (str, optional): The name of the model to use. If not provided, defaults will be used.
        """
        self.llm_provider = llm_provider  # Store the provider name
        self.max_tokens = max_tokens      # Store max tokens
        self.temperature = temperature    # Store temperature

        # Common metadata and tags
        self.common_metadata = {
            "session_id": str(uuid4()),
            "timestamp": datetime.datetime.now().isoformat(),
            "model_provider": self.llm_provider
        }
        self.common_tags = ["user_interaction", "query_handling", self.llm_provider]

        # Set default model names if not provided and initialize the language model
        if self.llm_provider == "openai":
            default_model_name = 'gpt-4o-mini'
            model_name = model_name or default_model_name

            # Initialize OpenAI's Chat model with additional tags and metadata
            self.language_model = ChatOpenAI(
                model_name=model_name,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                tags=self.common_tags,
                metadata=self.common_metadata,
                name="LLMChainOpenAI"
            )
        elif self.llm_provider == "anthropic":
            default_model_name = 'claude-3-haiku-20240307'
            model_name = model_name or default_model_name

            # Initialize Anthropic's Chat model with additional tags and metadata
            self.language_model = ChatAnthropic(
                model=model_name,
                max_tokens_to_sample=self.max_tokens,
                temperature=self.temperature,
                tags=self.common_tags,
                metadata=self.common_metadata,
                name="LLMChainAnthropic"
            )
        elif self.llm_provider == "google":
            default_model_name = 'gemini-2.0-flash'
            model_name = model_name or default_model_name
            google_api_key = os.getenv("GEMINI_API_KEY")

            # Initialize Google's ChatGenerative model with additional tags and metadata
            self.language_model = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=google_api_key,
                temperature=self.temperature,
                tags=self.common_tags,
                metadata=self.common_metadata,
                name="LLMChainGoogle"
            )
        else:
            # Raise error for invalid provider
            raise ValueError(
                f"Invalid llm_provider '{llm_provider}'. Must be either 'openai', 'anthropic', or 'google'."
            )

    def show_settings(self):
        """
        Display the current settings of the language model handler.

        Returns:
        - settings (dict): A dictionary containing the current settings.
        """
        # Access the model name attribute, which may differ depending on the provider
        if hasattr(self.language_model, 'model_name'):
            model_name = self.language_model.model_name
        elif hasattr(self.language_model, 'model'):
            model_name = self.language_model.model
        else:
            model_name = None

        # Access the max_tokens attribute, which may differ depending on the provider
        if hasattr(self.language_model, 'max_tokens'):
            max_tokens = self.language_model.max_tokens
        elif hasattr(self.language_model, 'max_tokens_to_sample'):
            max_tokens = self.language_model.max_tokens_to_sample
        else:
            max_tokens = self.max_tokens  # Default value

        settings = {
            "llm_provider": self.llm_provider,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "common_metadata": self.common_metadata,
            "common_tags": self.common_tags,
            "language_model": {
                "model_name": model_name,
                "max_tokens": max_tokens,
                "temperature": self.language_model.temperature,
                "tags": self.language_model.tags,
                "metadata": self.language_model.metadata,
                "name": self.language_model.name
            }
        }
        return settings
