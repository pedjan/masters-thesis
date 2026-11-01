import { useEffect, useRef, useState } from "react";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".doc", ".docx"];
const PROMPTING_OPTIONS = [
  {
    value: "direct_prompting",
    label: "Direct-shot prompting",
    description: "Give the task directly, without worked examples.",
  },
  {
    value: "zero_shot_prompting",
    label: "Zero-shot prompting",
    description: "Generate questions from instructions and your material only.",
  },
  {
    value: "few_shot_prompting",
    label: "Few-shot prompting",
    description: "Use a sample question to demonstrate the desired style.",
  },
  {
    value: "structured_shot_prompting",
    label: "Structured-shot prompting",
    description: "Use a structured workflow to plan and check the questions.",
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
  const [inputMode, setInputMode] = useState("file");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState([""]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [strategy, setStrategy] = useState("direct_prompting");
  const [selectedStrategy, setSelectedStrategy] = useState("direct_prompting");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isNewQuestion, setIsNewQuestion] = useState(false);
  const [editError, setEditError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const newQuestionInputRef = useRef(null);

  useEffect(() => {
    if (isNewQuestion) {
      newQuestionInputRef.current?.focus();
    }
  }, [isNewQuestion]);

  const clearQuestionState = () => {
    setQuestions([]);
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
      setError("Enter a lesson title before generating questions.");
      return;
    }

    if (
      learningOutcomes.length === 0 ||
      learningOutcomes.some((outcome) => !outcome.trim())
    ) {
      setError("Enter at least one non-empty learning outcome.");
      return;
    }

    if (inputMode === "text" && !text.trim()) {
      setError("Enter some teaching material before generating questions.");
      return;
    }

    if (inputMode === "file" && !file) return;

    if (inputMode === "file") {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setError("Choose a PDF, TXT, DOC, or DOCX file.");
        return;
      }
    }

    setError("");
    clearQuestionState();
    const generationContext = {
      lesson_title: lessonTitle.trim(),
      learning_outcomes: learningOutcomes.map((outcome) => outcome.trim()),
      strategy: selectedStrategy,
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

      setQuestions(result.questions);
      setStrategy(result.strategy || selectedStrategy);
      setHasGenerated(true);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "Could not complete the backend request.");
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
      setEditError("Fill in the question, all four options, explanation, and concept.");
      return;
    }
    if (new Set(Object.values(draft.options).map((value) => value.trim())).size !== 4) {
      setEditError("Each answer option must be different.");
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

  const downloadFile = (contents, mimeType, filename) => {
    const downloadUrl = URL.createObjectURL(new Blob([contents], { type: mimeType }));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    setSavedMessage(`Your edited quiz was downloaded as ${filename}.`);
  };

  const saveQuiz = async () => {
    setError("");
    setSavedMessage("");

    if (exportFormat === "pdf") {
      setSavedMessage("In the print dialog, choose Save as PDF to download your quiz.");
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
            `Correct answer: ${question.correct_answer}`,
            `Explanation: ${question.explanation}`,
            `Source concept: ${question.source_concept}`,
          ].join("\n"))
          .join("\n\n");
        downloadFile(contents, "text/plain;charset=utf-8", "quiz.txt");
      } else {
        const paragraphs = [
          new Paragraph({
            text: "Generated Quiz",
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
                new TextRun({ text: "Correct answer: ", bold: true }),
                new TextRun(question.correct_answer),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Explanation: ", bold: true }),
                new TextRun(question.explanation),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Source concept: ", bold: true }),
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
      setError(saveError.message || "Could not save the quiz.");
    }
  };

  return (
    <main className="app">
      <header className="page-header">
        <p className="eyebrow">Study tool</p>
        <h1>Generate a quiz from your material</h1>
        <p className="subtitle">
          Enter text or upload a document to get five multiple-choice questions.
        </p>
      </header>

      <form className="upload-card" onSubmit={generateQuestions}>
        <div className="input-mode" aria-label="Choose material source">
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
            Write or paste text
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
            Upload a file
          </button>
        </div>

        {inputMode === "text" ? (
          <>
            <label className="file-label" htmlFor="material-text">
              Teaching material
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
              placeholder="Paste or type the text you want to use for your quiz..."
              rows={10}
              disabled={Boolean(busy)}
            />
          </>
        ) : (
          <>
            <label className="file-label" htmlFor="material-file">
              Teaching material
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
            <p className="file-help">PDF, TXT, DOC, or DOCX</p>
            {file && <p className="selected-file">Selected: {file.name}</p>}
          </>
        )}

        <label className="file-label strategy-label" htmlFor="lesson-title">
          Lesson title <span aria-hidden="true">*</span>
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
          placeholder="e.g. Introduction to cell biology"
          required
          disabled={Boolean(busy)}
        />

        <fieldset className="learning-outcomes">
          <legend className="file-label">
            Learning outcomes <span aria-hidden="true">*</span>
          </legend>
          <p className="strategy-help">
            Add at least one outcome; questions will be aligned with these goals.
          </p>
          <div className="outcome-list">
            {learningOutcomes.map((outcome, index) => (
              <div className="outcome-row" key={index}>
                <label className="visually-hidden" htmlFor={`learning-outcome-${index}`}>
                  Learning outcome {index + 1}
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
                  placeholder={`Learning outcome ${index + 1}`}
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
                    aria-label={`Remove learning outcome ${index + 1}`}
                  >
                    Remove
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
            Add learning outcome
          </button>
        </fieldset>

        <label className="file-label strategy-label" htmlFor="prompting-strategy">
          Prompting option
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
              {option.label}
            </option>
          ))}
        </select>
        <p className="strategy-help">
          {PROMPTING_OPTIONS.find((option) => option.value === selectedStrategy)?.description}
        </p>

        <button
          type="submit"
          disabled={
            Boolean(busy) || (inputMode === "file" && !file)
          }
        >
          {busy === "uploading"
            ? "Uploading..."
            : busy === "generating"
              ? "Generating questions..."
              : inputMode === "file"
                ? "Upload and generate"
                : "Generate questions"}
        </button>
        {busy && (
          <p className="progress" role="status">
            {busy === "uploading"
              ? "Uploading your file..."
              : "Creating questions. This may take a little while..."}
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </form>

      {hasGenerated && (
        <section className="questions" aria-labelledby="questions-heading">
          <div className="questions-header">
            <div>
              <h2 id="questions-heading">Your questions</h2>
              <p className="question-count">{questions.length} questions</p>
            </div>
            <div className="quiz-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={addQuestion}
                disabled={editingId !== null}
              >
                Add question
              </button>
              <button
                type="button"
                className="save-button"
                onClick={saveQuiz}
                disabled={editingId !== null || questions.length === 0}
              >
                Save quiz (.{exportFormat})
              </button>
              <label className="visually-hidden" htmlFor="export-format">
                Quiz file format
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
          {savedMessage && (
            <p className="saved-message" role="status">{savedMessage}</p>
          )}
          {questions.length === 0 && (
            <p className="empty-questions">
              No questions yet. Add a question to build your quiz.
            </p>
          )}
          {questions.map((question, index) => (
            <article className="question-card" key={question.id}>
              {editingId === question.id && draft ? (
                <form className="question-editor" onSubmit={saveQuestion}>
                  <label htmlFor={`question-${question.id}`}>Question</label>
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
                    <legend>Answer options</legend>
                    {["A", "B", "C", "D"].map((letter) => (
                      <div className="option-field" key={letter}>
                        <label htmlFor={`option-${question.id}-${letter}`}>
                          Option {letter}
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
                  <label htmlFor={`answer-${question.id}`}>Correct answer</label>
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
                  <label htmlFor={`explanation-${question.id}`}>Explanation</label>
                  <textarea
                    id={`explanation-${question.id}`}
                    value={draft.explanation}
                    rows={3}
                    onChange={(event) =>
                      setDraft({ ...draft, explanation: event.target.value })
                    }
                  />
                  <label htmlFor={`concept-${question.id}`}>Source concept</label>
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
                      Save changes
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={cancelEditing}
                    >
                      Cancel
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
                          <span className="answer-label">Correct answer</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="explanation">{question.explanation}</p>
                  <p className="source">Concept: {question.source_concept}</p>
                  <div className="question-actions">
                    <button
                      className="order-button"
                      type="button"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={editingId !== null || index === 0}
                      aria-label={`Move question ${question.id} up`}
                    >
                      Move up
                    </button>
                    <button
                      className="order-button"
                      type="button"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={
                        editingId !== null || index === questions.length - 1
                      }
                      aria-label={`Move question ${question.id} down`}
                    >
                      Move down
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => startEditing(question)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
          {editingId !== null && (
            <p className="progress" role="status">
              Save or cancel the current question before saving the quiz.
            </p>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
