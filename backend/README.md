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
Both generation endpoints require `lesson_title` and a non-empty
`learning_outcomes` array in the JSON body, and accept a prompting strategy.
For pasted text, include `text` in the body; for uploaded files, send the
context body to `POST /generate/{stored_filename}`.
Supported values are `direct_prompting` (the default), `zero_shot_prompting`,
`few_shot_prompting`, and `structured_shot_prompting`.
The generated JSON is also saved in `outputs/` and returned in the response.
Each successful generation is also saved in SQLite, including the extracted
teaching material, lesson title, learning outcomes, selected strategy, and all
generated question fields. The response includes a `generation_id` for linking
quality evaluations. By default, the database is `backend/app.sqlite3`; set
`DATABASE_PATH` to choose another location.

Generated question sets are also structurally validated, checked by the
configured LLM for answerability and support in the teaching material, and
compared for identical or highly similar question wording. Validation findings
are returned with the generated set and stored in SQLite. Duplicate and
feasibility findings are reported for review; they do not automatically discard
the question set. Similarity scores of 85% or higher are flagged as potential
duplicates.

Submit an evaluator's quality score (0-100) and feedback with
`POST /evaluations/{generation_id}`. An optional `evaluator` name can also be
included:

```json
{
  "score": 87.5,
  "feedback": "Questions align well with the learning outcomes.",
  "evaluator": "Reviewer"
}
```

Retrieve saved evaluation results with `GET /evaluations/{generation_id}`.
The API stores submitted evaluations; it does not calculate quality scores.

PDF, TXT, and DOCX text is extracted by the backend. Generating questions
from legacy DOC files requires LibreOffice to be installed; if its executable
is not on `PATH`, set `LIBREOFFICE_PATH` in `.env`.

By default, generation uses LM Studio at `http://localhost:1235/v1`.
Ollama and OpenAI can be selected in `.env`; do not commit API keys.