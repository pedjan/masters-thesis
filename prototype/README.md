# Prototip za master rad

Ovoo je prototip za veb aplikaciju za master rad na temu **Projektovanje i evaluacija sistema za automatsko generisanje pitanja za proveru znanja primenom velikih jezickih modela**

## Šta radi?

Protitip učitava materijal iz `materials`, generiše tačno pet MCQ korišćenjem `direct_prompting` strategije, čuva ih u
`outputs/direct_prompting.json`, i validira sačuvaj JSON po Pzdantic šemi u `src/models.py`. Podrazumevno koristi lokalni model preko LM Studija. Ollama i OpenAI su dostupni za konfigurisanje.


Svako pitanje mora da bude neprazno, sa četiri ponuđena odgovore od kojih je samo jedan tačan. Postoji pet takvih pitanja. Trenutna strukturna validacija ne garantuje tačnost generisanih pitanja.


## Setup

Pokretanje:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Instalirati i podesiti [LM Studio](https://lmstudio.ai/), ubaciti željeni model i pokrenuti lokalni server.


Napravtiti `.env` fajl, u njega ubaciti primer:

```text
LLM_PROVIDER=lm_studio
LM_STUDIO_BASE_URL=http://localhost:1235/v1
LM_STUDIO_MODEL=qwen/qwen3.5-9b
```


Moguće je i iskorisiti neki drugi llm koji nije lokalni samo je potrebno ubaciti API ključ. Primeri su u [.env.example](./.env.example)


## Pokretanje

```powershell
python src\main.py
```

Generisani fajlovi se nalaze u `outputs/direct_prompting.json`. Program validira generisani rezultat pre čuvanja.
