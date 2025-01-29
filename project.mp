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
   - Future expansions will include more environment variables and integrations.

4. **Pipeline-Oriented Architecture**  
   - `StateGraph` and Node-based approach for controlling the flow: outline → search → drafting.  
   - Allows easy extension or modification of the workflow.

5. **(Planned) Databases & Logging**  
   - Potential integration with a graph database (e.g., Neo4j) or SQL for storing large amounts of financial data.  
   - Integrate with Langsmith for prompt and LLM log management, versioning, and debugging.

---

# Doc

## Intended Usage & Environment
- **Development** is primarily in **Cursor IDE**, leveraging its AI-assisted features.  
- **Colab Notebooks** may be used for experimental testing of partial functionality before merging back into the main codebase.  
- Currently, the project runs on a local machine with LLM calls via external APIs (OpenAI, Anthropic). Future expansions may involve running continuously on a cloud VM.

## File/Module Organization
- **Main file**: Orchestrates the high-level pipeline (loading environment variables, building state graphs, etc.).  
- **`validate_api_keys.py`** (planned): Contains logic for validating `.env` secrets.  
- **`llm_handler.py`**: Contains `LLMHandler` for easy management of various LLM providers.  
- **`report_generation.py`** (or similar): Contains all code for creating outlines, searching the web (Tavily), and writing the final sections. This includes:
  - `SectionState`, `ReportState`, typed dicts and Pydantic models  
  - Functions for query generation, section writing, final compilation  
  - Removal of NVIDIA Chat endpoint in favor of OpenAI & Anthropic

You may keep some of the above functionality together in one or two larger Python files initially. As the project grows, we can split code into more granular modules.

## Deployment/Distribution
- **Future Dockerization**: Not currently a priority, but planned for better portability and potential cloud deployment.  
- **CI/CD**: May add GitHub Actions or a similar service once the project stabilizes. This would help with testing, versioning, and potential staged deployments.

## User Interaction
- Currently, **no multi-user** or role-based flow; you (the sole developer) run the code.  
- Potential **Streamlit** (or other web) front-end in the future for a more interactive interface.

## API Keys & Secrets
- All secrets and keys (OpenAI, Anthropic, Tavily, etc.) will reside in a **`.env`** file.  
- Ensure `.env` is excluded from source control to avoid leaking credentials.

## Other Integrations
- **Tavily** is used for web search. Future expansions may include other search/data APIs.  
- **NVIDIA Chat** endpoints have been removed for now due to past performance issues.  
- Plans for **Langsmith** integration are underway, allowing centralized prompt management and advanced logging.

---

# Current File Structure

Below is the *planned* organization. This may evolve as we add more functionality:

1. **main.py** (placeholder name):  
   - Coordinates the overall flow (report generation, searching, etc.).  
   - Calls into other modules as needed.

2. **validate_api_keys.py**:  
   - Contains logic to validate API keys and environment variables.  
   - Will read from `.env` in the future.

3. **llm_handler.py**:  
   - Holds the `LLMHandler` class to manage different LLM providers (OpenAI, Anthropic).

4. **report_generation.py** (or similar):
   - All code related to generating structured reports:
     - State machine graphs (`StateGraph` usage).
     - `ReportState`, `SectionState`, `Section` models.
     - Tavily search functionality.
     - Final compilation logic.
   - Formerly included the NVIDIA Chat integration, but that has been removed.

Additional modules may be introduced (e.g., a dedicated `database.py` for future Neo4j or SQL integrations).

---


