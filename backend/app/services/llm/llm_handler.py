import os
import datetime
from uuid import uuid4
from app.core.logging_config import get_logger

logger = get_logger()

# Base class for lazy initialization and caching of the language model.
class BaseLLMHandler:
    """
    Base handler for language models with lazy initialization.
    """
    def __init__(self, max_tokens=1024, temperature=0.0, model_name=None):
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.model_name = model_name
        self.language_model = None  # Cached instance; initialized on first use

        # Common metadata and tags (to be augmented by provider-specific handlers)
        self.common_metadata = {
            "session_id": str(uuid4()),
            "timestamp": datetime.datetime.now().isoformat(),
        }
        self.common_tags = []

    def initialize_model(self):
        """
        Provider-specific initialization logic.
        Must be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement initialize_model()")

    def get_model(self):
        """
        Return the language model, initializing it if necessary.
        """
        if self.language_model is None:
            self.initialize_model()
        return self.language_model

    def show_settings(self):
        """
        Retrieve the current settings of the language model handler.
        """
        model = self.get_model()

        # Dynamically get model attributes
        if hasattr(model, 'model_name'):
            model_name = model.model_name
        elif hasattr(model, 'model'):
            model_name = model.model
        else:
            model_name = None
            logger.warning("Unable to determine model name from language model instance")

        if hasattr(model, 'max_tokens'):
            max_tokens = model.max_tokens
        elif hasattr(model, 'max_tokens_to_sample'):
            max_tokens = model.max_tokens_to_sample
        else:
            max_tokens = self.max_tokens
            logger.warning("Unable to determine max_tokens from language model instance, using default")

        settings = {
            "llm_provider": self.provider,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "common_metadata": self.common_metadata,
            "common_tags": self.common_tags,
            "language_model": {
                "model_name": model_name,
                "max_tokens": max_tokens,
                "temperature": model.temperature,
                "tags": model.tags,
                "metadata": model.metadata,
                "name": model.name
            }
        }
        logger.info(f"Retrieved settings for {self.provider} model: {model_name}")
        logger.debug(f"LLM settings details: provider={self.provider}, model={model_name}, temperature={self.temperature}")
        return settings

# Provider-specific handler for OpenAI.
class OpenAIHandler(BaseLLMHandler):
    def __init__(self, max_tokens=1024, temperature=0.0, model_name=None):
        super().__init__(max_tokens, temperature, model_name)
        self.provider = "openai"
        self.common_tags.append("openai")
        self.common_metadata["model_provider"] = "openai"
        logger.info("OpenAIHandler created. Model initialization is pending until first use.")

    def initialize_model(self):
        # Import the heavy dependency only when needed.
        from langchain_openai import ChatOpenAI
        default_model_name = 'gpt-4o-mini'
        chosen_model_name = self.model_name or default_model_name
        logger.info(f"Initializing OpenAI model: {chosen_model_name}")

        if not os.getenv("OPENAI_API_KEY"):
            logger.error("OPENAI_API_KEY environment variable not found")
            raise ValueError("OPENAI_API_KEY environment variable not found")

        try:
            self.language_model = ChatOpenAI(
                model_name=chosen_model_name,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                tags=self.common_tags,
                metadata=self.common_metadata,
                name="LLMChainOpenAI"
            )
            logger.debug(f"OpenAI model {chosen_model_name} initialized successfully")
        except Exception as e:
            logger.exception(f"Failed to initialize OpenAI model: {str(e)}")
            raise

# Provider-specific handler for Anthropic.
class AnthropicHandler(BaseLLMHandler):
    def __init__(self, max_tokens=1024, temperature=0.0, model_name=None):
        super().__init__(max_tokens, temperature, model_name)
        self.provider = "anthropic"
        self.common_tags.append("anthropic")
        self.common_metadata["model_provider"] = "anthropic"
        logger.info("AnthropicHandler created. Model initialization is pending until first use.")

    def initialize_model(self):
        from langchain_anthropic import ChatAnthropic
        default_model_name = 'claude-3-haiku-20240307'
        chosen_model_name = self.model_name or default_model_name
        logger.info(f"Initializing Anthropic model: {chosen_model_name}")

        if not os.getenv("ANTHROPIC_API_KEY"):
            logger.error("ANTHROPIC_API_KEY environment variable not found")
            raise ValueError("ANTHROPIC_API_KEY environment variable not found")

        try:
            self.language_model = ChatAnthropic(
                model=chosen_model_name,
                max_tokens_to_sample=self.max_tokens,
                temperature=self.temperature,
                tags=self.common_tags,
                metadata=self.common_metadata,
                name="LLMChainAnthropic"
            )
            logger.debug(f"Anthropic model {chosen_model_name} initialized successfully")
        except Exception as e:
            logger.exception(f"Failed to initialize Anthropic model: {str(e)}")
            raise

# Provider-specific handler for Google.
class GoogleHandler(BaseLLMHandler):
    def __init__(self, max_tokens=1024, temperature=0.0, model_name=None):
        super().__init__(max_tokens, temperature, model_name)
        self.provider = "google"
        self.common_tags.append("google")
        self.common_metadata["model_provider"] = "google"
        logger.info("GoogleHandler created. Model initialization is pending until first use.")

    def initialize_model(self):
        from langchain_google_genai import ChatGoogleGenerativeAI
        default_model_name = 'gemini-2.5-flash-preview-05-20'
        chosen_model_name = self.model_name or default_model_name
        logger.info(f"Initializing Google model: {chosen_model_name}")

        google_api_key = os.getenv("GEMINI_API_KEY")
        if not google_api_key:
            logger.error("GEMINI_API_KEY environment variable not found")
            raise ValueError("GEMINI_API_KEY environment variable not found")

        try:
            self.language_model = ChatGoogleGenerativeAI(
                model=chosen_model_name,
                google_api_key=google_api_key,
                temperature=self.temperature,
                tags=self.common_tags,
                metadata=self.common_metadata,
                name="LLMChainGoogle"
            )
            logger.debug(f"Google model {chosen_model_name} initialized successfully")
        except Exception as e:
            logger.exception(f"Failed to initialize Google model: {str(e)}")
            raise

# Factory class that returns a provider-specific LLM handler.
class LLMHandler:
    """
    A factory class that returns a provider-specific LLM handler.
    Usage:
        llm_handler = LLMHandler(config["llm_provider"])
    """
    def __new__(cls, llm_provider, max_tokens=1024, temperature=0.0, model_name=None):
        provider = llm_provider.lower()
        if provider == "openai":
            return OpenAIHandler(max_tokens, temperature, model_name)
        elif provider == "anthropic":
            return AnthropicHandler(max_tokens, temperature, model_name)
        elif provider == "google":
            return GoogleHandler(max_tokens, temperature, model_name)
        else:
            error_msg = f"Invalid llm_provider '{llm_provider}'. Must be either 'openai', 'anthropic', or 'google'."
            logger.error(error_msg)
            raise ValueError(error_msg)
