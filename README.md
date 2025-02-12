# Project Overview
This project aims to become a **financial assistant** that can:
- Research potential stocks, funds, and ETFs
- Generate detailed, structured reports about these findings
- Eventually make automated or semi-automated decisions based on the data/analysis

It uses **LLMs** (initially OpenAI and Anthropic) to craft reports and a **web search** component (currently Tavily) to gather data. Over time, we plan to add:
- Integration with graph databases (e.g., Neo4j) or SQL databases for persistence
- Langsmith for better LLM logging, prompt management, and debugging
- Additional external APIs for market data, advanced analytics, or alternative search

**Long-term** roadmap includes features like broader financial analysis, real-time data ingestion, and more sophisticated modeling (e.g., for trading or portfolio management).

---

# Core Functionalities

1. **Report Generation**  
   - **Plan** an outline for a report on a given financial or technical topic.  
   - **Research** relevant data through a web API (Tavily).  
   - **Write** individual sections based on the outline (with or without additional research).  
   - **Assemble** all sections into a final report.

2. **LLM Handler**  
   - A centralized class (`LLMHandler`) to manage different LLM providers (OpenAI, Anthropic, etc.) with customizable settings (model name, temperature, max tokens, etc.).

3. **API Keys & Environment**  
   - Uses a `.env` file for storing and validating API keys.  
   - Also loads other environment variables. The file `validate_api_keys.py` already handles environment-based checks.

4. **Pipeline-Oriented Architecture**  
   - `StateGraph` and node-based approach for controlling the flow: from planning sections → searching the web → drafting each section.  
   - Allows easy extension or modification of the workflow.

5. **(Planned) Databases & Logging**  
   - Potential integration with a graph database (e.g., Neo4j) or SQL for storing large amounts of financial data.  
   - Integrate with Langsmith for advanced prompt and LLM logging, versioning, and debugging.

---

# Doc

## Intended Usage & Environment
- **Development** is primarily in **Cursor IDE**, leveraging its AI-assisted features.  
- **Colab Notebooks** may be used for experimental testing of partial functionality before merging back into the main codebase.  
- Currently, the project runs on a local machine with LLM calls via external APIs (OpenAI, Anthropic). Future expansions may involve running continuously on a cloud VM.

## File/Module Organization
- **`main.py`**: The entry point that orchestrates the overall pipeline, including environment validation, building state graphs, and executing the final report process.
- **`validate_api_keys.py`**: Contains logic for validating `.env` secrets (OpenAI, Anthropic, Tavily, etc.).
- **`llm_handler.py`**: `LLMHandler` for easy management of various LLM providers.
- **`fetch_project_prompts.py`**: Pulls prompts from LangSmith, applies dynamic formatting for different report sizes.
- **Pipeline & Models**:  
   - **`report_graph_builders.py`**: Constructs the pipeline (using `StateGraph`) for section creation and final report assembly.  
   - **`report_models.py`**: Defines typed dictionaries and Pydantic models for sections, states, and final output.  
   - **`structured_report_nodes.py`**: Contains individual node functions (e.g., generating queries, searching the web, writing sections).  
- **`search_results_formatter.py`**: Utility for deduplicating and formatting Tavily search results.

## Deployment/Distribution
- **Future Dockerization**: Not currently a priority, but planned for better portability and potential cloud deployment.  
- **CI/CD**: GitHub Actions or similar services may be added once the project stabilizes, aiding in testing and versioning.

## User Interaction
- Currently, **no multi-user** or role-based flow; the developer runs the code directly.  
- Potential for a **Streamlit** or other web-based front end in the future for more interactive use.

## API Keys & Secrets
- All secrets (OpenAI, Anthropic, Tavily, etc.) reside in the **`.env`** file.  
- `.env` is not committed to version control. `validate_api_keys.py` ensures each key is set properly.

## Other Integrations
- **Tavily** is used for web search. Other search or data APIs may be included in the future.  
- Plans to add **Langsmith** for advanced prompt management, experiment tracking, and debugging.  
- Potential addition of a database integration (Neo4j/SQL) for storing and querying financial data at scale.

---

# Current File Structure

Here’s an overview of the present files and directories (this may grow or change as functionality is added):

1. **main.py**: Orchestrates the overall code flow (report generation, searching, etc.).  
2. **validate_api_keys.py**: Validates environment variables and API keys.  
3. **llm_handler.py**: Manages multiple LLM providers via a consistent interface.  
4. **fetch_project_prompts.py**: Retrieves and formats prompts from LangSmith.  
5. **report_graph_builders.py**: Builds a pipeline (using `StateGraph`) for step-by-step report generation.  
6. **report_models.py**: Defines typed dictionaries and Pydantic models for sections, states, etc.  
7. **structured_report_nodes.py**: Node functions (writing sections, searching, final compilation).  
8. **search_results_formatter.py**: Deduplicates and formats web search results.  
9. **requirements.txt**: Lists Python dependencies.  
10. **.env**: Stores API keys and environment variables (excluded from version control).

Additional modules or reorganized directories may emerge as the project expands (e.g., a `database.py` for future integrations, or a `docs/` folder for more extensive project documentation).
