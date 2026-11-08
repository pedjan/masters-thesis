import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from importlib import import_module
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend import database as persistence
from backend.models import MCQQuestion, MCQSet

main = import_module("backend.main")


def sample_question_set() -> MCQSet:
    return MCQSet(
        strategy="zero_shot_prompting",
        questions=[
            MCQQuestion(
                id=question_id,
                question=f"Question {question_id}?",
                options={
                    "A": "Option A",
                    "B": "Option B",
                    "C": "Option C",
                    "D": "Option D",
                },
                correct_answer="A",
                explanation="The material supports option A.",
                source_concept="Sample concept",
            )
            for question_id in range(1, 6)
        ],
    )


class PersistenceApiTests(unittest.TestCase):
    def test_generation_request_defaults_to_zero_shot_only(self):
        request = main.QuestionGenerationRequest(
            lesson_title="Sample lesson",
            learning_outcomes=["Understand sample facts"],
        )
        self.assertEqual(request.strategy, "zero_shot_prompting")

        with self.assertRaises(ValidationError):
            main.QuestionGenerationRequest(
                lesson_title="Sample lesson",
                learning_outcomes=["Understand sample facts"],
                strategy="direct_prompting",
            )

    def test_existing_text_ids_are_migrated_and_relationships_preserved(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            database = Path(temporary_directory) / "legacy.sqlite3"
            with closing(sqlite3.connect(database)) as connection:
                connection.executescript(
                    """
                    PRAGMA foreign_keys = ON;
                    CREATE TABLE teaching_materials (
                        id TEXT PRIMARY KEY, source_filename TEXT, content TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );
                    CREATE TABLE question_sets (
                        id TEXT PRIMARY KEY,
                        material_id TEXT NOT NULL REFERENCES teaching_materials(id),
                        lesson_title TEXT NOT NULL, learning_outcomes TEXT NOT NULL,
                        strategy TEXT NOT NULL, created_at TEXT NOT NULL
                    );
                    CREATE TABLE questions (
                        id INTEGER PRIMARY KEY,
                        question_set_id TEXT NOT NULL REFERENCES question_sets(id)
                            ON DELETE CASCADE,
                        position INTEGER NOT NULL, question TEXT NOT NULL,
                        option_a TEXT NOT NULL, option_b TEXT NOT NULL,
                        option_c TEXT NOT NULL, option_d TEXT NOT NULL,
                        correct_answer TEXT NOT NULL, explanation TEXT NOT NULL,
                        source_concept TEXT NOT NULL,
                        UNIQUE (question_set_id, position)
                    );
                    CREATE TABLE evaluations (
                        id TEXT PRIMARY KEY,
                        question_set_id TEXT NOT NULL REFERENCES question_sets(id)
                            ON DELETE CASCADE,
                        evaluator TEXT, score REAL NOT NULL, feedback TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );
                    CREATE TABLE question_validations (
                        id TEXT PRIMARY KEY,
                        question_set_id TEXT NOT NULL UNIQUE
                            REFERENCES question_sets(id) ON DELETE CASCADE,
                        report TEXT NOT NULL, created_at TEXT NOT NULL
                    );
                    INSERT INTO teaching_materials VALUES
                        ('material-uuid', 'lesson.txt', 'Saved material', 'time');
                    INSERT INTO question_sets VALUES
                        ('set-uuid', 'material-uuid', 'Lesson', '[]',
                         'direct_prompting', 'time');
                    INSERT INTO questions VALUES
                        (10, 'set-uuid', 1, 'Question?', 'A', 'B', 'C', 'D',
                         'A', 'Explanation', 'Concept');
                    INSERT INTO evaluations VALUES
                        ('evaluation-uuid', 'set-uuid', 'Reviewer', 90,
                         'Looks good', 'time');
                    INSERT INTO question_validations VALUES
                        ('validation-uuid', 'set-uuid', '{}', 'time');
                    """
                )
                connection.commit()

            with patch.dict(os.environ, {"DATABASE_PATH": str(database)}):
                persistence.initialize_database()

            with closing(sqlite3.connect(database)) as connection:
                id_types = {
                    table: next(
                        column[2]
                        for column in connection.execute(
                            f"PRAGMA table_info({table})"
                        )
                        if column[1] == "id"
                    )
                    for table in (
                        "teaching_materials",
                        "question_sets",
                        "questions",
                        "evaluations",
                        "question_validations",
                    )
                }
                saved_rows = connection.execute(
                    """
                    SELECT m.content, s.lesson_title, q.question, e.feedback, v.report
                    FROM teaching_materials m
                    JOIN question_sets s ON s.material_id = m.id
                    JOIN questions q ON q.question_set_id = s.id
                    JOIN evaluations e ON e.question_set_id = s.id
                    JOIN question_validations v ON v.question_set_id = s.id
                    """
                ).fetchone()
                foreign_key_errors = connection.execute(
                    "PRAGMA foreign_key_check"
                ).fetchall()

            self.assertTrue(all(kind == "INTEGER" for kind in id_types.values()))
            self.assertEqual(
                saved_rows,
                ("Saved material", "Lesson", "Question?", "Looks good", "{}"),
            )
            self.assertEqual(foreign_key_errors, [])

    def test_generation_and_evaluation_are_saved_and_retrievable(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            database = root / "test.sqlite3"
            with (
                patch.dict(os.environ, {"DATABASE_PATH": str(database)}),
                patch.object(main, "OUTPUT_DIR", root / "outputs"),
                patch.object(main, "generate_questions", return_value=sample_question_set()),
                patch.object(
                    main,
                    "validate_generated_questions",
                    return_value={"status": "passed"},
                ),
                TestClient(main.app) as client,
            ):
                response = client.post(
                    "/generate-text",
                    json={
                        "lesson_title": "Sample lesson",
                        "learning_outcomes": ["Understand sample facts"],
                        "text": "The stored teaching material.",
                    },
                )
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json()["strategy"], "zero_shot_prompting")
                generation_id = response.json()["generation_id"]
                self.assertIsInstance(generation_id, int)
                self.assertEqual(response.json()["validation"], {"status": "passed"})

                evaluation_response = client.post(
                    f"/evaluations/{generation_id}",
                    json={
                        "score": 87.5,
                        "feedback": "  Clear questions, but vary the distractors.  ",
                        "evaluator": "  Reviewer  ",
                    },
                )
                self.assertEqual(
                    evaluation_response.status_code, 200, evaluation_response.text
                )
                self.assertEqual(
                    evaluation_response.json()["feedback"],
                    "Clear questions, but vary the distractors.",
                )
                self.assertIsInstance(evaluation_response.json()["id"], int)
                self.assertIsInstance(
                    evaluation_response.json()["question_set_id"], int
                )
                self.assertEqual(evaluation_response.json()["evaluator"], "Reviewer")

                retrieved_response = client.get(f"/evaluations/{generation_id}")
                self.assertEqual(retrieved_response.status_code, 200)
                self.assertEqual(
                    retrieved_response.json()["evaluations"],
                    [evaluation_response.json()],
                )

                with closing(sqlite3.connect(database)) as connection:
                    material = connection.execute(
                        "SELECT content FROM teaching_materials"
                    ).fetchone()
                    question_set = connection.execute(
                        "SELECT lesson_title, strategy FROM question_sets"
                    ).fetchone()
                    question_count = connection.execute(
                        "SELECT COUNT(*) FROM questions"
                    ).fetchone()[0]
                    validation = connection.execute(
                        "SELECT report FROM question_validations"
                    ).fetchone()[0]

                self.assertEqual(material[0], "The stored teaching material.")
                self.assertEqual(
                    question_set, ("Sample lesson", "zero_shot_prompting")
                )
                self.assertEqual(question_count, 5)
                self.assertEqual(validation, '{"status": "passed"}')

    def test_evaluation_requires_an_existing_question_set(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            database = Path(temporary_directory) / "test.sqlite3"
            with (
                patch.dict(os.environ, {"DATABASE_PATH": str(database)}),
                TestClient(main.app) as client,
            ):
                invalid_score = client.post(
                    "/evaluations/missing",
                    json={"score": 101, "feedback": "Outside the allowed range"},
                )
                self.assertEqual(invalid_score.status_code, 422)

                response = client.post(
                    "/evaluations/999",
                    json={"score": 90, "feedback": "Good questions"},
                )
                self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
