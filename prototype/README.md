# masters-thesis

Prototype for the master's thesis **Comparative analysis of approaches for
automatic generation of educational content using large language models**.

## What it doess

The prototype loads material from `materials`, generates exactly five
multiple-choice questions using the `direct_prompting` strategy, saves them to
`outputs/direct_prompting.json`, and validates the saved JSON against the
Pydantic schema in `src/models.py`. By default it uses a local model served by
LM Studio. Ollama and OpenAI are also available as configurable providers.

Each question must have a non-empty question, four distinct options named
`A`–`D`, one correct-answer label, an explanation, and a source concept. The
top-level object must contain the `direct_prompting` strategy and exactly five
questions. Structural validation does not independently verify the factual
correctness of the generated answers.

## Setup

From the repository root, create and activate a virtual environment, then
install the dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Install [LM Studio](https://lmstudio.ai/) and download a compatible model from
its Discover tab. Load that model in the Chat or Developer tab, then start the
local server from the Developer tab. The configured server address is
`http://localhost:1235`.

Make the `.env` file, edit it rather than replacing it. Set
`LLM_PROVIDER=lm_studio`, set `LM_STUDIO_BASE_URL` to your LM Studio server
address, and set `LM_STUDIO_MODEL` to the model identifier shown by LM Studio's
server. For example:

```text
LLM_PROVIDER=lm_studio
LM_STUDIO_BASE_URL=http://localhost:1235/v1
LM_STUDIO_MODEL=qwen/qwen3.5-9b
```

No OpenAI API key or API credits are needed for local generation. If API
authentication is enabled in LM Studio, set `LM_STUDIO_API_KEY` as well.

For Ollama, set `LLM_PROVIDER=ollama`; for OpenAI, set
`LLM_PROVIDER=openai` and provide `OPENAI_API_KEY` (`OPENAI_MODEL` defaults to
`gpt-4o-mini`). Do not commit `.env` or share API keys.


## Run

```powershell
python src\main.py
```

The generated file is `outputs/direct_prompting.json`. The program validates
the response before saving and validates the saved JSON again afterward.
