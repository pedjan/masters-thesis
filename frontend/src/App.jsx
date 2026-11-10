import { useEffect, useRef, useState } from "react";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".doc", ".docx"];
const TRANSLATIONS = {
  en: {
    pageTitle: "Test generator",
    studyTool: "Study tool",
    heading: "Generate a test from your material",
    subtitle: "Enter text or upload a document to get five multiple-choice questions.",
    language: "Language",
    chooseSource: "Choose material source",
    writeText: "Write or paste text",
    uploadFile: "Upload a file",
    teachingMaterial: "Teaching material",
    textPlaceholder: "Paste or type the text you want to use for your test...",
    fileTypes: "PDF, TXT, DOC, or DOCX",
    selectedFile: "Selected: {filename}",
    lessonTitle: "Lesson title",
    lessonPlaceholder: "e.g. Introduction to cell biology",
    learningOutcomes: "Learning outcomes",
    addOutcomeHelp: "Add at least one outcome; questions will be aligned with these goals.",
    learningOutcome: "Learning outcome {number}",
    remove: "Remove",
    addOutcome: "Add learning outcome",
    promptingOption: "Prompting option",
    zeroShot: "Zero-shot prompting",
    zeroShotDescription: "Generate questions from instructions and your material only.",
    fewShot: "Few-shot prompting",
    fewShotDescription: "Use a sample question to demonstrate the desired style.",
    structuredShot: "Structured-shot prompting",
    structuredShotDescription: "Use a structured workflow to plan and check the questions.",
    uploading: "Uploading...",
    generating: "Generating questions...",
    uploadAndGenerate: "Upload and generate",
    generateQuestions: "Generate questions",
    uploadingFile: "Uploading your file...",
    creatingQuestions: "Creating questions. This may take a little while...",
    yourQuestions: "Your questions",
    questionCount: "{count} questions",
    addQuestion: "Add question",
    saveQuiz: "Save test (.{format})",
    quizFormat: "Test file format",
    automaticVerification: "Automatic verification: {status}",
    structure: "Structure",
    feasibilityFindings: "Feasibility findings",
    questionNumber: "Question {number}:",
    notAnswerable: " Not answerable from the supplied material.",
    unsupportedAnswer: " Correct answer not supported by the material.",
    notExactlyOne: " It may not have exactly one correct option.",
    potentialDuplicates: "Potential duplicate questions",
    questions: "Questions",
    and: "and",
    identical: "identical",
    similar: "similar",
    similarity: "similarity",
    noIssues: "No feasibility issues or duplicate questions were detected.",
    noQuestions: "No questions yet. Add a question to build your test.",
    question: "Question",
    answerOptions: "Answer options",
    option: "Option {letter}",
    correctAnswer: "Correct answer",
    explanation: "Explanation",
    sourceConcept: "Source concept",
    saveChanges: "Save changes",
    cancel: "Cancel",
    concept: "Concept",
    moveQuestionUp: "Move question {number} up",
    moveQuestionDown: "Move question {number} down",
    moveUp: "Move up",
    moveDown: "Move down",
    edit: "Edit",
    delete: "Delete",
    saveOrCancel: "Save or cancel the current question before saving the quiz.",
    evaluateQuality: "Evaluate question quality",
    evaluatorOptional: "Evaluator (optional)",
    qualityScore: "Quality score (0–100)",
    feedback: "Feedback",
    savingEvaluation: "Saving evaluation...",
    saveEvaluation: "Save evaluation",
    score: "Score",
    enterLessonTitle: "Enter a lesson title before generating questions.",
    enterOutcome: "Enter at least one non-empty learning outcome.",
    enterMaterial: "Enter some teaching material before generating questions.",
    chooseValidFile: "Choose a PDF, TXT, DOC, or DOCX file.",
    requestFailed: "Could not complete the backend request.",
    fillQuestion: "Fill in the question, all four options, explanation, and concept.",
    distinctOptions: "Each answer option must be different.",
    downloaded: "Your edited quiz was downloaded as {filename}.",
    saveAsPdf: "In the print dialog, choose Save as PDF to download your quiz.",
    saveQuizError: "Could not save the quiz.",
    saveEvaluationError: "Could not save evaluation.",
    passed: "passed",
    review_required: "review required",
    potential_duplicates: "potential duplicates",
  },
  sr: {
    pageTitle: "Generator testova",
    studyTool: "Alat za učenje",
    heading: "Generiši test od svog materijala",
    subtitle: "Unesite tekst ili otpremite dokument da biste dobili pet pitanja sa višestrukim izborom.",
    language: "Jezik",
    chooseSource: "Izaberite izvor materijala",
    writeText: "Unesite ili nalepite tekst",
    uploadFile: "Otpremite datoteku",
    teachingMaterial: "Nastavni materijal",
    textPlaceholder: "Nalepite ili unesite tekst koji želite da koristite za test...",
    fileTypes: "PDF, TXT, DOC ili DOCX",
    selectedFile: "Izabrano: {filename}",
    lessonTitle: "Naslov lekcije",
    lessonPlaceholder: "npr. Uvod u ćelijsku biologiju",
    learningOutcomes: "Ishodi učenja",
    addOutcomeHelp: "Dodajte bar jedan ishod; pitanja će biti usklađena sa ovim ciljevima.",
    learningOutcome: "Ishod učenja {number}",
    remove: "Ukloni",
    addOutcome: "Dodaj ishod učenja",
    promptingOption: "Način zadavanja upita",
    zeroShot: "Zero-shot prompting",
    zeroShotDescription: "Pravi pitanja samo na osnovu uputstava i vašeg materijala.",
    fewShot: "Few-shot prompting",
    fewShotDescription: "Koristi primer pitanja da prikaže željeni stil.",
    structuredShot: "Structured-shot prompting",
    structuredShotDescription: "Koristi strukturisan postupak za planiranje i proveru pitanja.",
    uploading: "Otpremanje...",
    generating: "Kreiranje pitanja...",
    uploadAndGenerate: "Otpremi i napravi test",
    generateQuestions: "Napravi pitanja",
    uploadingFile: "Otpremanje datoteke...",
    creatingQuestions: "Kreiranje pitanja je u toku. Može potrajati...",
    yourQuestions: "Vaša pitanja",
    questionCount: "{count} {noun}",
    addQuestion: "Dodaj pitanje",
    saveQuiz: "Sačuvaj test (.{format})",
    quizFormat: "Format datoteke testa",
    automaticVerification: "Automatska provera: {status}",
    structure: "Struktura",
    feasibilityFindings: "Nalazi o izvodljivosti",
    questionNumber: "Pitanje {number}:",
    notAnswerable: " Nije moguće odgovoriti na osnovu priloženog materijala.",
    unsupportedAnswer: " Tačan odgovor nije potkrepljen materijalom.",
    notExactlyOne: " Možda ne postoji tačno jedan tačan odgovor.",
    potentialDuplicates: "Moguća duplirana pitanja",
    questions: "Pitanja",
    and: "i",
    identical: "identična",
    similar: "slična",
    similarity: "sličnost",
    noIssues: "Nisu pronađeni problemi sa izvodljivošću niti duplirana pitanja.",
    noQuestions: "Još nema pitanja. Dodajte pitanje da biste napravili test.",
    question: "Pitanje",
    answerOptions: "Ponuđeni odgovori",
    option: "Odgovor {letter}",
    correctAnswer: "Tačan odgovor",
    explanation: "Objašnjenje",
    sourceConcept: "Pojam iz izvora",
    saveChanges: "Sačuvaj izmene",
    cancel: "Otkaži",
    concept: "Pojam",
    moveQuestionUp: "Pomeri pitanje {number} nagore",
    moveQuestionDown: "Pomeri pitanje {number} nadole",
    moveUp: "Pomeri nagore",
    moveDown: "Pomeri nadole",
    edit: "Izmeni",
    delete: "Obriši",
    saveOrCancel: "Sačuvajte ili otkažite izmenu pitanja pre čuvanja kviza.",
    evaluateQuality: "Oceni kvalitet pitanja",
    evaluatorOptional: "Ocenjivač (opciono)",
    qualityScore: "Ocena kvaliteta (0–100)",
    feedback: "Povratne informacije",
    savingEvaluation: "Čuvanje ocene...",
    saveEvaluation: "Sačuvaj ocenu",
    score: "Ocena",
    enterLessonTitle: "Unesite naslov lekcije pre pravljenja pitanja.",
    enterOutcome: "Unesite bar jedan ishod učenja.",
    enterMaterial: "Unesite nastavni materijal pre pravljenja pitanja.",
    chooseValidFile: "Izaberite PDF, TXT, DOC ili DOCX datoteku.",
    requestFailed: "Zahtev ka serveru nije uspeo.",
    fillQuestion: "Popunite pitanje, sva četiri odgovora, objašnjenje i pojam.",
    distinctOptions: "Svi ponuđeni odgovori moraju biti različiti.",
    downloaded: "Izmenjeni test je preuzet kao {filename}.",
    saveAsPdf: "U prozoru za štampu izaberite „Sačuvaj kao PDF“ da biste preuzeli test.",
    saveQuizError: "Čuvanje testa nije uspelo.",
    saveEvaluationError: "Čuvanje ocene nije uspelo.",
    passed: "uspešno",
    review_required: "potrebna je provera",
    potential_duplicates: "moguća duplirana pitanja",
  },
};
const PROMPTING_OPTIONS = [
  {
    value: "zero_shot_prompting",
    label: "zeroShot",
    description: "zeroShotDescription",
  },
  {
    value: "few_shot_prompting",
    label: "fewShot",
    description: "fewShotDescription",
  },
  {
    value: "structured_shot_prompting",
    label: "structuredShot",
    description: "structuredShotDescription",
  },
];

async function readApiResponse(response) {
  const body = await response.text();
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    if (!response.ok) {
      throw new Error(body || `Request failed (${response.status}).`);
    }
    throw new Error("The backend returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.detail || `Request failed (${response.status}).`);
  }

  return data;
}

function App() {
  const [language, setLanguage] = useState(
    () => window.localStorage.getItem("quiz-generator-language") === "en" ? "en" : "sr",
  );
  const t = (key, values = {}) =>
    (TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key).replace(
      /\{(\w+)\}/g,
      (placeholder, name) => values[name] ?? placeholder,
    );
  const questionCountLabel = (count) =>
    t("questionCount", {
      count,
      noun:
        count % 10 === 1 && count % 100 !== 11
          ? "pitanje"
          : "pitanja",
    });
  const [inputMode, setInputMode] = useState("file");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState([""]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [validation, setValidation] = useState(null);
  const [generationId, setGenerationId] = useState(null);
  const [strategy, setStrategy] = useState("zero_shot_prompting");
  const [selectedStrategy, setSelectedStrategy] = useState("zero_shot_prompting");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isNewQuestion, setIsNewQuestion] = useState(false);
  const [editError, setEditError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [evaluationScore, setEvaluationScore] = useState("");
  const [evaluationFeedback, setEvaluationFeedback] = useState("");
  const [evaluationEvaluator, setEvaluationEvaluator] = useState("");
  const [evaluations, setEvaluations] = useState([]);
  const [evaluationBusy, setEvaluationBusy] = useState(false);
  const [evaluationError, setEvaluationError] = useState("");
  const newQuestionInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = TRANSLATIONS[language].pageTitle;
    window.localStorage.setItem("quiz-generator-language", language);
  }, [language]);

  useEffect(() => {
    if (isNewQuestion) {
      newQuestionInputRef.current?.focus();
    }
  }, [isNewQuestion]);

  const clearQuestionState = () => {
    setQuestions([]);
    setValidation(null);
    setGenerationId(null);
    setEvaluations([]);
    setEvaluationError("");
    setEvaluationScore("");
    setEvaluationFeedback("");
    setEditingId(null);
    setDraft(null);
    setIsNewQuestion(false);
    setEditError("");
    setSavedMessage("");
    setHasGenerated(false);
  };

  const generateQuestions = async (event) => {
    event.preventDefault();
    if (busy) return;

    if (!lessonTitle.trim()) {
      setError("enterLessonTitle");
      return;
    }

    if (
      learningOutcomes.length === 0 ||
      learningOutcomes.some((outcome) => !outcome.trim())
    ) {
      setError("enterOutcome");
      return;
    }

    if (inputMode === "text" && !text.trim()) {
      setError("enterMaterial");
      return;
    }

    if (inputMode === "file" && !file) return;

    if (inputMode === "file") {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setError("chooseValidFile");
        return;
      }
    }

    setError("");
    clearQuestionState();
    const generationContext = {
      lesson_title: lessonTitle.trim(),
      learning_outcomes: learningOutcomes.map((outcome) => outcome.trim()),
      strategy: selectedStrategy,
      source_filename: inputMode === "file" ? file.name : null,
    };

    try {
      let generationResponse;
      if (inputMode === "text") {
        setBusy("generating");
        generationResponse = await fetch(`${API_URL}/generate-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...generationContext, text }),
        });
      } else {
        setBusy("uploading");
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData,
        });
        const upload = await readApiResponse(uploadResponse);

        if (!upload.stored_as) {
          throw new Error("The backend did not return the uploaded file name.");
        }

        setBusy("generating");
        generationResponse = await fetch(
          `${API_URL}/generate/${encodeURIComponent(upload.stored_as)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(generationContext),
          },
        );
      }

      const result = await readApiResponse(generationResponse);

      if (!Array.isArray(result.questions)) {
        throw new Error("The backend did not return any generated questions.");
      }
      if (!result.generation_id) {
        throw new Error("The backend did not save the generated questions.");
      }
      if (!result.validation) {
        throw new Error("The backend did not validate the generated questions.");
      }

      setQuestions(result.questions);
      setValidation(result.validation);
      setGenerationId(result.generation_id);
      setStrategy(result.strategy || selectedStrategy);
      setHasGenerated(true);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "requestFailed");
    } finally {
      setBusy("");
    }
  };

  const startEditing = (question) => {
    setEditingId(question.id);
    setDraft({
      ...question,
      options: { ...question.options },
    });
    setIsNewQuestion(false);
    setEditError("");
    setSavedMessage("");
  };

  const addQuestion = () => {
    const nextId = Math.max(0, ...questions.map((question) => question.id)) + 1;
    const newQuestion = {
      id: nextId,
      question: "",
      options: { A: "", B: "", C: "", D: "" },
      correct_answer: "A",
      explanation: "",
      source_concept: "",
    };
    setQuestions((current) => [...current, newQuestion]);
    setEditingId(nextId);
    setDraft({ ...newQuestion, options: { ...newQuestion.options } });
    setIsNewQuestion(true);
    setEditError("");
    setSavedMessage("");
  };

  const cancelEditing = () => {
    if (isNewQuestion) {
      setQuestions((current) =>
        current.filter((question) => question.id !== editingId),
      );
    }
    setEditingId(null);
    setDraft(null);
    setIsNewQuestion(false);
    setEditError("");
  };

  const saveQuestion = (event) => {
    event.preventDefault();
    const values = [
      draft.question,
      draft.options.A,
      draft.options.B,
      draft.options.C,
      draft.options.D,
      draft.explanation,
      draft.source_concept,
    ];

    if (values.some((value) => !value.trim())) {
      setEditError("fillQuestion");
      return;
    }
    if (new Set(Object.values(draft.options).map((value) => value.trim())).size !== 4) {
      setEditError("distinctOptions");
      return;
    }

    setQuestions((current) =>
      current.map((question) =>
        question.id === editingId ? draft : question,
      ),
    );
    setEditingId(null);
    setDraft(null);
    setIsNewQuestion(false);
    setEditError("");
  };

  const deleteQuestion = (questionId) => {
    const remaining = questions.filter((question) => question.id !== questionId);
    const renumbered = remaining.map((question, index) => ({
      ...question,
      id: index + 1,
    }));
    setQuestions(renumbered);

    if (editingId === questionId) {
      setEditingId(null);
      setDraft(null);
      setIsNewQuestion(false);
      setEditError("");
    } else if (editingId !== null) {
      const editingIndex = remaining.findIndex(
        (question) => question.id === editingId,
      );
      if (editingIndex !== -1) {
        const newEditingId = editingIndex + 1;
        setEditingId(newEditingId);
        setDraft((current) =>
          current ? { ...current, id: newEditingId } : current,
        );
      }
    }
    setSavedMessage("");
  };

  const moveQuestion = (index, offset) => {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const reordered = [...questions];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];
    setQuestions(
      reordered.map((question, questionIndex) => ({
        ...question,
        id: questionIndex + 1,
      })),
    );
    setSavedMessage("");
  };

  const submitEvaluation = async (event) => {
    event.preventDefault();
    if (!generationId || evaluationBusy) return;

    setEvaluationError("");
    setEvaluationBusy(true);
    try {
      const response = await fetch(`${API_URL}/evaluations/${generationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: Number(evaluationScore),
          feedback: evaluationFeedback,
          evaluator: evaluationEvaluator,
        }),
      });
      const evaluation = await readApiResponse(response);
      setEvaluations((current) => [...current, evaluation]);
      setEvaluationScore("");
      setEvaluationFeedback("");
    } catch (requestError) {
      console.error(requestError);
      setEvaluationError(requestError.message || "saveEvaluationError");
    } finally {
      setEvaluationBusy(false);
    }
  };

  const downloadFile = (contents, mimeType, filename) => {
    const downloadUrl = URL.createObjectURL(new Blob([contents], { type: mimeType }));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    setSavedMessage(t("downloaded", { filename }));
  };

  const saveQuiz = async () => {
    setError("");
    setSavedMessage("");

    if (exportFormat === "pdf") {
      setSavedMessage(t("saveAsPdf"));
      window.print();
      return;
    }

    try {
      if (exportFormat === "json") {
        downloadFile(
          JSON.stringify({ strategy, questions }, null, 2),
          "application/json",
          "quiz.json",
        );
      } else if (exportFormat === "txt") {
        const contents = questions
          .map((question) => [
            `${question.id}. ${question.question}`,
            ...Object.entries(question.options).map(
              ([letter, option]) => `${letter}. ${option}`,
            ),
            `${t("correctAnswer")}: ${question.correct_answer}`,
            `${t("explanation")}: ${question.explanation}`,
            `${t("sourceConcept")}: ${question.source_concept}`,
          ].join("\n"))
          .join("\n\n");
        downloadFile(contents, "text/plain;charset=utf-8", "quiz.txt");
      } else {
        const paragraphs = [
          new Paragraph({
            text: t("yourQuestions"),
            heading: HeadingLevel.TITLE,
          }),
        ];

        questions.forEach((question) => {
          paragraphs.push(
            new Paragraph({
              text: `${question.id}. ${question.question}`,
              heading: HeadingLevel.HEADING_1,
            }),
          );
          Object.entries(question.options).forEach(([letter, option]) => {
            paragraphs.push(new Paragraph(`${letter}. ${option}`));
          });
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t("correctAnswer")}: `, bold: true }),
                new TextRun(question.correct_answer),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${t("explanation")}: `, bold: true }),
                new TextRun(question.explanation),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${t("sourceConcept")}: `, bold: true }),
                new TextRun(question.source_concept),
              ],
            }),
          );
        });

        const document = new Document({
          sections: [{ children: paragraphs }],
        });
        const blob = await Packer.toBlob(document);
        downloadFile(blob, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "quiz.docx");
      }
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.message || "saveQuizError");
    }
  };

  return (
    <main className="app">
      <header className="page-header">
        <div className="language-switch" role="group" aria-label={t("language")}>
          <button
            type="button"
            className={language === "sr" ? "language-option selected" : "language-option"}
            aria-pressed={language === "sr"}
            onClick={() => setLanguage("sr")}
          >
            Srpski
          </button>
          <button
            type="button"
            className={language === "en" ? "language-option selected" : "language-option"}
            aria-pressed={language === "en"}
            onClick={() => setLanguage("en")}
          >
            English
          </button>
        </div>
        <p className="eyebrow">{t("studyTool")}</p>
        <h1>{t("heading")}</h1>
        <p className="subtitle">{t("subtitle")}</p>
      </header>

      <form className="upload-card" onSubmit={generateQuestions}>
        <div className="input-mode" aria-label={t("chooseSource")}>
          <button
            type="button"
            className={inputMode === "text" ? "mode-option selected" : "mode-option"}
            aria-pressed={inputMode === "text"}
            disabled={Boolean(busy)}
            onClick={() => {
              setInputMode("text");
              setError("");
              clearQuestionState();
            }}
          >
            {t("writeText")}
          </button>
          <button
            type="button"
            className={inputMode === "file" ? "mode-option selected" : "mode-option"}
            aria-pressed={inputMode === "file"}
            disabled={Boolean(busy)}
            onClick={() => {
              setInputMode("file");
              setError("");
              clearQuestionState();
            }}
          >
            {t("uploadFile")}
          </button>
        </div>

        {inputMode === "text" ? (
          <>
            <label className="file-label" htmlFor="material-text">
              {t("teachingMaterial")}
            </label>
            <textarea
              id="material-text"
              className="material-text"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setError("");
                clearQuestionState();
              }}
              placeholder={t("textPlaceholder")}
              rows={10}
              disabled={Boolean(busy)}
            />
          </>
        ) : (
          <>
            <label className="file-label" htmlFor="material-file">
              {t("teachingMaterial")}
            </label>
            <input
              id="material-file"
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setError("");
                clearQuestionState();
              }}
              disabled={Boolean(busy)}
            />
            <p className="file-help">{t("fileTypes")}</p>
            {file && <p className="selected-file">{t("selectedFile", { filename: file.name })}</p>}
          </>
        )}

        <label className="file-label strategy-label" htmlFor="lesson-title">
          {t("lessonTitle")} <span aria-hidden="true">*</span>
        </label>
        <input
          id="lesson-title"
          className="generation-text-input"
          type="text"
          value={lessonTitle}
          onChange={(event) => {
            setLessonTitle(event.target.value);
            setError("");
            clearQuestionState();
          }}
          placeholder={t("lessonPlaceholder")}
          required
          disabled={Boolean(busy)}
        />

        <fieldset className="learning-outcomes">
          <legend className="file-label">
            {t("learningOutcomes")} <span aria-hidden="true">*</span>
          </legend>
          <p className="strategy-help">
            {t("addOutcomeHelp")}
          </p>
          <div className="outcome-list">
            {learningOutcomes.map((outcome, index) => (
              <div className="outcome-row" key={index}>
                <label className="visually-hidden" htmlFor={`learning-outcome-${index}`}>
                  {t("learningOutcome", { number: index + 1 })}
                </label>
                <input
                  id={`learning-outcome-${index}`}
                  className="generation-text-input"
                  type="text"
                  value={outcome}
                  onChange={(event) => {
                    setLearningOutcomes((current) =>
                      current.map((value, outcomeIndex) =>
                        outcomeIndex === index ? event.target.value : value,
                      ),
                    );
                    setError("");
                    clearQuestionState();
                  }}
                  placeholder={t("learningOutcome", { number: index + 1 })}
                  required
                  disabled={Boolean(busy)}
                />
                {learningOutcomes.length > 1 && (
                  <button
                    className="remove-outcome-button"
                    type="button"
                    onClick={() => {
                      setLearningOutcomes((current) =>
                        current.filter((_, outcomeIndex) => outcomeIndex !== index),
                      );
                      setError("");
                      clearQuestionState();
                    }}
                    disabled={Boolean(busy)}
                    aria-label={`${t("remove")} ${t("learningOutcome", { number: index + 1 })}`}
                  >
                    {t("remove")}
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            className="add-outcome-button"
            type="button"
            onClick={() => {
              setLearningOutcomes((current) => [...current, ""]);
              setError("");
              clearQuestionState();
            }}
            disabled={Boolean(busy)}
          >
            {t("addOutcome")}
          </button>
        </fieldset>

        <label className="file-label strategy-label" htmlFor="prompting-strategy">
          {t("promptingOption")}
        </label>
        <select
          id="prompting-strategy"
          className="prompting-strategy"
          value={selectedStrategy}
          onChange={(event) => {
            setSelectedStrategy(event.target.value);
            setError("");
            clearQuestionState();
          }}
          disabled={Boolean(busy)}
        >
          {PROMPTING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </select>
        <p className="strategy-help">
          {t(PROMPTING_OPTIONS.find((option) => option.value === selectedStrategy)?.description)}
        </p>

        <button
          type="submit"
          disabled={
            Boolean(busy) || (inputMode === "file" && !file)
          }
        >
          {busy === "uploading"
            ? t("uploading")
            : busy === "generating"
              ? t("generating")
              : inputMode === "file"
                ? t("uploadAndGenerate")
                : t("generateQuestions")}
        </button>
        {busy && (
          <p className="progress" role="status">
            {busy === "uploading"
              ? t("uploadingFile")
              : t("creatingQuestions")}
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {t(error)}
          </p>
        )}
      </form>

      {hasGenerated && (
        <section className="questions" aria-labelledby="questions-heading">
          <div className="questions-header">
            <div>
              <h2 id="questions-heading">{t("yourQuestions")}</h2>
              <p className="question-count">{questionCountLabel(questions.length)}</p>
            </div>
            <div className="quiz-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={addQuestion}
                disabled={editingId !== null}
              >
                {t("addQuestion")}
              </button>
              <button
                type="button"
                className="save-button"
                onClick={saveQuiz}
                disabled={editingId !== null || questions.length === 0}
              >
                {t("saveQuiz", { format: exportFormat })}
              </button>
              <label className="visually-hidden" htmlFor="export-format">
                {t("quizFormat")}
              </label>
              <select
                id="export-format"
                className="export-format"
                value={exportFormat}
                onChange={(event) => {
                  setExportFormat(event.target.value);
                  setSavedMessage("");
                }}
                disabled={editingId !== null || questions.length === 0}
              >
                <option value="json">JSON</option>
                <option value="txt">TXT</option>
                <option value="docx">DOCX</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
          </div>
          <h1 className="print-title">{lessonTitle}</h1>
          {validation && (
            <section
              className={`validation-panel ${validation.status}`}
              aria-labelledby="validation-heading"
              role="status"
            >
              <h3 id="validation-heading">
                {t("automaticVerification", {
                  status: t(validation.status),
                })}
              </h3>
              <p>
                {t("structure")}: {t(validation.structure.status)} (
                {questionCountLabel(validation.structure.question_count)}).
              </p>
              {validation.feasibility.findings.length > 0 && (
                <div>
                  <strong>{t("feasibilityFindings")}</strong>
                  <ul>
                    {validation.feasibility.findings.map((finding) => (
                      <li key={finding.question_id}>
                        {t("questionNumber", { number: finding.question_id })} {finding.feedback}
                        {!finding.answerable_from_material
                          ? t("notAnswerable")
                          : ""}
                        {!finding.correct_answer_supported
                          ? t("unsupportedAnswer")
                          : ""}
                        {!finding.exactly_one_correct_option
                          ? t("notExactlyOne")
                          : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.duplicates.pairs.length > 0 && (
                <div>
                  <strong>{t("potentialDuplicates")}</strong>
                  <ul>
                    {validation.duplicates.pairs.map((pair) => (
                      <li key={pair.question_ids.join("-")}>
                        {t("questions")} {pair.question_ids.join(` ${t("and")} `)} (
                        {pair.identical ? t("identical") : t("similar")}, {t("similarity")}{" "}
                        {Math.round(pair.similarity * 100)}%).
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.status === "passed" && (
                <p>{t("noIssues")}</p>
              )}
            </section>
          )}
          {savedMessage && (
            <p className="saved-message" role="status">{savedMessage}</p>
          )}
          {questions.length === 0 && (
            <p className="empty-questions">{t("noQuestions")}</p>
          )}
          {questions.map((question, index) => (
            <article className="question-card" key={question.id}>
              {editingId === question.id && draft ? (
                <form className="question-editor" onSubmit={saveQuestion}>
                  <label htmlFor={`question-${question.id}`}>{t("question")}</label>
                  <textarea
                    id={`question-${question.id}`}
                    ref={isNewQuestion ? newQuestionInputRef : null}
                    value={draft.question}
                    rows={2}
                    onChange={(event) =>
                      setDraft({ ...draft, question: event.target.value })
                    }
                  />
                  <fieldset className="option-editor">
                    <legend>{t("answerOptions")}</legend>
                    {["A", "B", "C", "D"].map((letter) => (
                      <div className="option-field" key={letter}>
                        <label htmlFor={`option-${question.id}-${letter}`}>
                          {t("option", { letter })}
                        </label>
                        <input
                          id={`option-${question.id}-${letter}`}
                          value={draft.options[letter]}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              options: {
                                ...draft.options,
                                [letter]: event.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </fieldset>
                  <label htmlFor={`answer-${question.id}`}>{t("correctAnswer")}</label>
                  <select
                    id={`answer-${question.id}`}
                    value={draft.correct_answer}
                    onChange={(event) =>
                      setDraft({ ...draft, correct_answer: event.target.value })
                    }
                  >
                    {["A", "B", "C", "D"].map((letter) => (
                      <option key={letter} value={letter}>{letter}</option>
                    ))}
                  </select>
                  <label htmlFor={`explanation-${question.id}`}>{t("explanation")}</label>
                  <textarea
                    id={`explanation-${question.id}`}
                    value={draft.explanation}
                    rows={3}
                    onChange={(event) =>
                      setDraft({ ...draft, explanation: event.target.value })
                    }
                  />
                  <label htmlFor={`concept-${question.id}`}>{t("sourceConcept")}</label>
                  <input
                    id={`concept-${question.id}`}
                    value={draft.source_concept}
                    onChange={(event) =>
                      setDraft({ ...draft, source_concept: event.target.value })
                    }
                  />
                  {editError && (
                    <p className="error-message" role="alert">{editError}</p>
                  )}
                  <div className="question-actions">
                    <button className="save-button" type="submit">
                      {t("saveChanges")}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={cancelEditing}
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h3>
                    {question.id}. {question.question}
                  </h3>
                  <ul className="options">
                    {Object.entries(question.options).map(([letter, option]) => (
                      <li
                        className={
                          letter === question.correct_answer ? "correct-option" : ""
                        }
                        key={letter}
                      >
                        <span className="option-letter">{letter}.</span> {option}
                        {letter === question.correct_answer && (
                          <span className="answer-label">{t("correctAnswer")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="explanation">{question.explanation}</p>
                  <p className="source">{t("concept")}: {question.source_concept}</p>
                  <div className="question-actions">
                    <button
                      className="order-button"
                      type="button"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={editingId !== null || index === 0}
                      aria-label={t("moveQuestionUp", { number: question.id })}
                    >
                      {t("moveUp")}
                    </button>
                    <button
                      className="order-button"
                      type="button"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={
                        editingId !== null || index === questions.length - 1
                      }
                      aria-label={t("moveQuestionDown", { number: question.id })}
                    >
                      {t("moveDown")}
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => startEditing(question)}
                    >
                      {t("edit")}
                    </button>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      {t("delete")}
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
          {editingId !== null && (
            <p className="progress" role="status">
              {t("saveOrCancel")}
            </p>
          )}
          <section className="evaluation-panel" aria-labelledby="evaluation-heading">
            <h3 id="evaluation-heading">{t("evaluateQuality")}</h3>
            <form className="evaluation-form" onSubmit={submitEvaluation}>
              <label htmlFor="evaluation-evaluator">{t("evaluatorOptional")}</label>
              <input
                id="evaluation-evaluator"
                value={evaluationEvaluator}
                onChange={(event) => setEvaluationEvaluator(event.target.value)}
                maxLength={255}
              />
              <label htmlFor="evaluation-score">{t("qualityScore")}</label>
              <input
                id="evaluation-score"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={evaluationScore}
                onChange={(event) => setEvaluationScore(event.target.value)}
                required
              />
              <label htmlFor="evaluation-feedback">{t("feedback")}</label>
              <textarea
                id="evaluation-feedback"
                value={evaluationFeedback}
                onChange={(event) => setEvaluationFeedback(event.target.value)}
                rows={3}
                required
              />
              {evaluationError && (
                <p className="error-message" role="alert">{evaluationError}</p>
              )}
              <button type="submit" disabled={evaluationBusy || editingId !== null}>
                {evaluationBusy ? t("savingEvaluation") : t("saveEvaluation")}
              </button>
            </form>
            {evaluations.map((evaluation) => (
              <article className="saved-evaluation" key={evaluation.id}>
                <p>
                  {t("score")}: {evaluation.score}/100
                  {evaluation.evaluator ? ` — ${evaluation.evaluator}` : ""}
                </p>
                <p>{evaluation.feedback}</p>
              </article>
            ))}
          </section>
        </section>
      )}
    </main>
  );
}

export default App;
