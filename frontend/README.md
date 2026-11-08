# React + Vite

## Quiz generator

Start the backend using the instructions in [backend/README.md](../backend/README.md),
then run the frontend from this directory:

```powershell
npm install
npm run dev
```

Open the Vite URL and choose whether to paste teaching material or upload a
PDF, TXT, DOC, or DOCX file. Choose **Generate questions** or **Upload and
generate**, respectively, to display the generated questions. After generation,
edit or delete questions, add new ones, then choose **Save quiz (.json)** to
download the edited quiz. Use the format selector to save as JSON, TXT, or DOCX.
For PDF, choose PDF and save from the browser's print dialog. The backend URL
defaults to `http://localhost:8080`; set `VITE_API_URL` when using a different
URL.

Generated material, strategy, and questions are stored by the backend in
SQLite. After generation, the **Evaluate question quality** form submits a
0-100 quality score and written feedback, which can be retrieved through the
backend API.

Generated question sets also show structural, material-feasibility, and
duplicate-question validation findings. The LLM feasibility check requires an
additional configured-model call for each generated set.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
