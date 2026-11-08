# Frontend deo aplikacije

## Pokretanje

Prvo je potrebni pokrenuti backend, uputstva na: [backend/README.md](../backend/README.md),
zatim pokrenuti frontend deo sledećim kodovima:

```powershell
npm install
npm run dev
```

## Opis frontenda

Aplikaciji se pristupa tako što se u veb pregledaču otvori link: `http://localhost:8080`. Na početnoj stranici se se nalazi forma za generisanje gde se ubacije nastavni materijal i dodaju ishodi. Nakon toga se bira vrsta promptinga i generiše se provera znanja.

Kada se izgeneriše dole se pojavljuje pregled testa sa mogučnostima izmene i dorade. Dok je na dnu stranice deo za evaluaciju gde se može oceniti kvalitet generisanog testa 0-100 i dodati opcioni feedback.

Nakon generisanja se pojavljuje i opcija za preuzimanje testa u podržanim formatima (JSON, PDF, DOCX, TXT)