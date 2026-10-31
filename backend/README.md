# Backend API

## Run

From the backend directory:

```powershell
uv sync
Copy-Item .env.example .env
# Configure the LLM provider in .env
uv run uvicorn backend.main:app --reload --port 8080 --app-dir src
```

The API documentation is available at `http://127.0.0.1:8080/docs`.

## Upload material and generate questions

Upload a PDF, TXT, DOC, or DOCX file using `POST /upload` with a multipart
form field named `file`. The response contains `stored_as`; pass that value
to `POST /generate/{stored_filename}` to generate five validated
multiple-choice questions. The generated JSON is saved in `outputs/` and
returned in the response.

Alternatively, send `POST /generate-text` with a JSON body containing a
`text` field to generate questions directly from pasted teaching material.
The generated JSON is also saved in `outputs/` and returned in the response.

PDF, TXT, and DOCX text is extracted by the backend. Generating questions
from legacy DOC files requires LibreOffice to be installed; if its executable
is not on `PATH`, set `LIBREOFFICE_PATH` in `.env`.

By default, generation uses LM Studio at `http://localhost:1235/v1`.
Ollama and OpenAI can be selected in `.env`; do not commit API keys.