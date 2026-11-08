import json
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from backend.models import MCQSet

PROJECT_ROOT = Path(__file__).resolve().parents[2]

SCHEMA = """
CREATE TABLE IF NOT EXISTS teaching_materials (
    id TEXT PRIMARY KEY,
    source_filename TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_sets (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL REFERENCES teaching_materials(id),
    lesson_title TEXT NOT NULL,
    learning_outcomes TEXT NOT NULL,
    strategy TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY,
    question_set_id TEXT NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    source_concept TEXT NOT NULL,
    UNIQUE (question_set_id, position)
);

CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    question_set_id TEXT NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
    evaluator TEXT,
    score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
    feedback TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_validations (
    id TEXT PRIMARY KEY,
    question_set_id TEXT NOT NULL UNIQUE
        REFERENCES question_sets(id) ON DELETE CASCADE,
    report TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_question_sets_material
    ON question_sets(material_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_question_set
    ON evaluations(question_set_id);
"""


def database_path() -> Path:
    configured_path = os.getenv("DATABASE_PATH")
    if configured_path:
        return Path(configured_path)
    return PROJECT_ROOT / "app.sqlite3"


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(database_path())
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(_connect()) as connection:
        connection.executescript(SCHEMA)


def save_generation(
    content: str,
    source_filename: str | None,
    lesson_title: str,
    learning_outcomes: list[str],
    questions: MCQSet,
    validation: dict[str, object],
) -> str:
    initialize_database()
    material_id = uuid4().hex
    question_set_id = uuid4().hex
    created_at = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection, connection:
        connection.execute(
            """
            INSERT INTO teaching_materials (id, source_filename, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (material_id, source_filename, content, created_at),
        )
        connection.execute(
            """
            INSERT INTO question_sets
                (id, material_id, lesson_title, learning_outcomes, strategy, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                question_set_id,
                material_id,
                lesson_title,
                json.dumps(learning_outcomes, ensure_ascii=False),
                questions.strategy,
                created_at,
            ),
        )
        connection.executemany(
            """
            INSERT INTO questions (
                question_set_id, position, question, option_a, option_b, option_c,
                option_d, correct_answer, explanation, source_concept
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    question_set_id,
                    position,
                    question.question,
                    question.options["A"],
                    question.options["B"],
                    question.options["C"],
                    question.options["D"],
                    question.correct_answer,
                    question.explanation,
                    question.source_concept,
                )
                for position, question in enumerate(questions.questions, start=1)
            ],
        )
        connection.execute(
            """
            INSERT INTO question_validations
                (id, question_set_id, report, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                uuid4().hex,
                question_set_id,
                json.dumps(validation, ensure_ascii=False),
                created_at,
            ),
        )

    return question_set_id


def save_evaluation(
    question_set_id: str,
    score: float,
    feedback: str,
    evaluator: str | None,
) -> dict[str, object] | None:
    initialize_database()
    evaluation = {
        "id": uuid4().hex,
        "question_set_id": question_set_id,
        "evaluator": evaluator,
        "score": score,
        "feedback": feedback,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    with closing(_connect()) as connection, connection:
        exists = connection.execute(
            "SELECT 1 FROM question_sets WHERE id = ?",
            (question_set_id,),
        ).fetchone()
        if exists is None:
            return None
        connection.execute(
            """
            INSERT INTO evaluations
                (id, question_set_id, evaluator, score, feedback, created_at)
            VALUES (:id, :question_set_id, :evaluator, :score, :feedback, :created_at)
            """,
            evaluation,
        )

    return evaluation


def get_evaluations(question_set_id: str) -> list[dict[str, object]]:
    initialize_database()
    with closing(_connect()) as connection:
        rows = connection.execute(
            """
            SELECT id, question_set_id, evaluator, score, feedback, created_at
            FROM evaluations
            WHERE question_set_id = ?
            ORDER BY created_at, id
            """,
            (question_set_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def generation_exists(question_set_id: str) -> bool:
    initialize_database()
    with closing(_connect()) as connection:
        return (
            connection.execute(
                "SELECT 1 FROM question_sets WHERE id = ?",
                (question_set_id,),
            ).fetchone()
            is not None
        )
