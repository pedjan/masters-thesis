import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from importlib import import_module
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

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
                        "strategy": "zero_shot_prompting",
                        "text": "The stored teaching material.",
                    },
                )
                self.assertEqual(response.status_code, 200, response.text)
                generation_id = response.json()["generation_id"]
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
                    "/evaluations/missing",
                    json={"score": 90, "feedback": "Good questions"},
                )
                self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
