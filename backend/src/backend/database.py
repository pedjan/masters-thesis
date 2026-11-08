import json
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from backend.models import MCQSet

PROJECT_ROOT = Path(__file__).resolve().parents[2]

SCHEMA = """
CREATE TABLE IF NOT EXISTS teaching_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_filename TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL REFERENCES teaching_materials(id),
    lesson_title TEXT NOT NULL,
    learning_outcomes TEXT NOT NULL,
    strategy TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_set_id INTEGER NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_set_id INTEGER NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
    evaluator TEXT,
    score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
    feedback TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_set_id INTEGER NOT NULL UNIQUE
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
        _migrate_integer_ids(connection)
        connection.executescript(SCHEMA)


def _migrate_integer_ids(connection: sqlite3.Connection) -> None:
    tables = (
        "teaching_materials",
        "question_sets",
        "questions",
        "evaluations",
        "question_validations",
    )
    integer_columns = {
        "teaching_materials": {"id"},
        "question_sets": {"id", "material_id"},
        "questions": {"id", "question_set_id"},
        "evaluations": {"id", "question_set_id"},
        "question_validations": {"id", "question_set_id"},
    }
    column_types = {
        table: {
            row["name"]: row["type"].upper()
            for row in connection.execute(f"PRAGMA table_info({table})")
        }
        for table in tables
    }
    if all(
        column_types[table][column] == "INTEGER"
        for table, columns in integer_columns.items()
        for column in columns
    ):
        return

    connection.execute("PRAGMA foreign_keys = OFF")
    try:
        connection.execute("BEGIN IMMEDIATE")
        records = {
            table: connection.execute(f"SELECT * FROM {table} ORDER BY rowid").fetchall()
            for table in tables
        }
        id_maps = {
            table: {
                row["id"]: new_id
                for new_id, row in enumerate(records[table], start=1)
            }
            for table in tables
        }

        connection.execute(
            """
            CREATE TABLE teaching_materials_integer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_filename TEXT,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE question_sets_integer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                material_id INTEGER NOT NULL REFERENCES teaching_materials(id),
                lesson_title TEXT NOT NULL,
                learning_outcomes TEXT NOT NULL,
                strategy TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE questions_integer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_set_id INTEGER NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
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
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE evaluations_integer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_set_id INTEGER NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
                evaluator TEXT,
                score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
                feedback TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE question_validations_integer (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_set_id INTEGER NOT NULL UNIQUE
                    REFERENCES question_sets(id) ON DELETE CASCADE,
                report TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        connection.executemany(
            """
            INSERT INTO teaching_materials_integer
                (id, source_filename, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            [
                (
                    id_maps["teaching_materials"][row["id"]],
                    row["source_filename"],
                    row["content"],
                    row["created_at"],
                )
                for row in records["teaching_materials"]
            ],
        )
        connection.executemany(
            """
            INSERT INTO question_sets_integer
                (id, material_id, lesson_title, learning_outcomes, strategy, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    id_maps["question_sets"][row["id"]],
                    id_maps["teaching_materials"][row["material_id"]],
                    row["lesson_title"],
                    row["learning_outcomes"],
                    row["strategy"],
                    row["created_at"],
                )
                for row in records["question_sets"]
            ],
        )
        connection.executemany(
            """
            INSERT INTO questions_integer (
                id, question_set_id, position, question, option_a, option_b, option_c,
                option_d, correct_answer, explanation, source_concept
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    id_maps["questions"][row["id"]],
                    id_maps["question_sets"][row["question_set_id"]],
                    row["position"],
                    row["question"],
                    row["option_a"],
                    row["option_b"],
                    row["option_c"],
                    row["option_d"],
                    row["correct_answer"],
                    row["explanation"],
                    row["source_concept"],
                )
                for row in records["questions"]
            ],
        )
        connection.executemany(
            """
            INSERT INTO evaluations_integer
                (id, question_set_id, evaluator, score, feedback, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    id_maps["evaluations"][row["id"]],
                    id_maps["question_sets"][row["question_set_id"]],
                    row["evaluator"],
                    row["score"],
                    row["feedback"],
                    row["created_at"],
                )
                for row in records["evaluations"]
            ],
        )
        connection.executemany(
            """
            INSERT INTO question_validations_integer
                (id, question_set_id, report, created_at)
            VALUES (?, ?, ?, ?)
            """,
            [
                (
                    id_maps["question_validations"][row["id"]],
                    id_maps["question_sets"][row["question_set_id"]],
                    row["report"],
                    row["created_at"],
                )
                for row in records["question_validations"]
            ],
        )

        for table in reversed(tables):
            connection.execute(f"DROP TABLE {table}")
        for table in tables:
            connection.execute(
                f"ALTER TABLE {table}_integer RENAME TO {table}"
            )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.execute("PRAGMA foreign_keys = ON")


def save_generation(
    content: str,
    source_filename: str | None,
    lesson_title: str,
    learning_outcomes: list[str],
    questions: MCQSet,
    validation: dict[str, object],
) -> int:
    initialize_database()
    created_at = datetime.now(timezone.utc).isoformat()

    with closing(_connect()) as connection, connection:
        material_cursor = connection.execute(
            """
            INSERT INTO teaching_materials (source_filename, content, created_at)
            VALUES (?, ?, ?)
            """,
            (source_filename, content, created_at),
        )
        material_id = material_cursor.lastrowid
        question_set_cursor = connection.execute(
            """
            INSERT INTO question_sets
                (material_id, lesson_title, learning_outcomes, strategy, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                material_id,
                lesson_title,
                json.dumps(learning_outcomes, ensure_ascii=False),
                questions.strategy,
                created_at,
            ),
        )
        question_set_id = question_set_cursor.lastrowid
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
                (question_set_id, report, created_at)
            VALUES (?, ?, ?)
            """,
            (
                question_set_id,
                json.dumps(validation, ensure_ascii=False),
                created_at,
            ),
        )

    return question_set_id


def save_evaluation(
    question_set_id: int,
    score: float,
    feedback: str,
    evaluator: str | None,
) -> dict[str, object] | None:
    initialize_database()
    evaluation = {
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
        cursor = connection.execute(
            """
            INSERT INTO evaluations
                (question_set_id, evaluator, score, feedback, created_at)
            VALUES (:question_set_id, :evaluator, :score, :feedback, :created_at)
            """,
            evaluation,
        )
        evaluation["id"] = cursor.lastrowid

    return evaluation


def get_evaluations(question_set_id: int) -> list[dict[str, object]]:
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


def generation_exists(question_set_id: int) -> bool:
    initialize_database()
    with closing(_connect()) as connection:
        return (
            connection.execute(
                "SELECT 1 FROM question_sets WHERE id = ?",
                (question_set_id,),
            ).fetchone()
            is not None
        )
