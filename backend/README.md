# Backend API

## Pokretanje

Pre samog pokretanje potrebno je podesiti LLM provajdera tako što se napravi .env fajl i unesu određeni parametri primeri se nalaze u [.env.example](./.env.example)
```powershell
uv sync
Copy-Item .env.example .env
# Podesi llm provajedra u .env
```

Za pokretanje u terminal upisati:

```powershell
uv run uvicorn backend.main:app --reload --port 8080 --app-dir src
```

Dokumentacija se nalazi na linku: `http://127.0.0.1:8080/docs`.

## Upload materiala i generisanje pitanja

Ubacivanje PDF, TXT, DOC, ili DOCX fila ide preko `POST /upload` preko forme i polja koji se zove `file`. Odgovor sadrži `stored_as`; šalje fajl preko `POST /generate/{stored_filename}` i generiše se pet MCQ. Generisani JSON se čuva u `outputs/` i vraća se kao odgovor.

Druga opcija je da se koristi `POST /generate-text` gde se iz teksta koji ima polje
`text` generiše zalepljeni materijal za učenje.


Oba endpointa zahtevaju `lesson_title` i
`learning_outcomes` kao i da se izabere vrta prompta.
Za zalepljen tekst se koristi `text` iz body; za ubačene fajlove se koristi `POST /generate/{stored_filename}`.
Podrzani promptovi su: `zero_shot_prompting` (podrtazumevni),
`few_shot_prompting`, i `structured_shot_prompting`.
Generisani JSON fajlovi se čuvaju u `outputs/` i vračaju kao odgovor.


Svako uspešno generisanje pitanja se čuva u SQLite bazi podataka sa svim informacijama.


Generisana pitanja prolaze kroz strukturnu validaciju, proveravaju se u pomoć konfigurisanog LLMa za izbegavanje sličnih i duplih odgovora.


Evaluacija ima ocenu (0-100) i feedbak koji su obavezni, tu je i ime ocenjivača koje je opcioni, api za to je `POST /evaluations/{generation_id}`. Primer jedne evaluacije:

```json
{
  "score": 87.5,
  "feedback": "Pitanja su dobro postavljena naspram ishoda učenja.",
  "evaluator": "Predrag"
}
```