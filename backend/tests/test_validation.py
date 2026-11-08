import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from backend.models import MCQQuestion, MCQSet
from backend.validation import (
    _find_duplicate_questions,
    validate_generated_questions,
)


def question_set(stems: list[str]) -> MCQSet:
    return MCQSet(
        strategy="direct_prompting",
        questions=[
            MCQQuestion(
                id=question_id,
                question=stem,
                options={
                    "A": f"Answer one {question_id}",
                    "B": f"Answer two {question_id}",
                    "C": f"Answer three {question_id}",
                    "D": f"Answer four {question_id}",
                },
                correct_answer="A",
                explanation="The material supports answer A.",
                source_concept=f"Concept {question_id}",
            )
            for question_id, stem in enumerate(stems, start=1)
        ],
    )


class QuestionValidationTests(unittest.TestCase):
    def test_detects_identical_and_similar_question_stems(self):
        questions = question_set(
            [
                "What does a plant need to grow?",
                "What does a plant need to grow?!",
                "What does the plant need to grow?",
                "How does a battery store energy?",
                "What is the boiling point of water?",
            ]
        )

        duplicates = _find_duplicate_questions(questions)

        self.assertEqual(duplicates[0]["question_ids"], [1, 2])
        self.assertTrue(duplicates[0]["identical"])
        self.assertIn([1, 3], [pair["question_ids"] for pair in duplicates])

    def test_semantic_review_findings_are_reported(self):
        questions = question_set(
            [
                "What is fact one?",
                "What is fact two?",
                "What is fact three?",
                "What is fact four?",
                "What is fact five?",
            ]
        )
        review = {
            "reviews": [
                {
                    "question_id": question_id,
                    "answerable_from_material": question_id != 1,
                    "correct_answer_supported": True,
                    "exactly_one_correct_option": True,
                    "feedback": "Not stated in material" if question_id == 1 else "",
                }
                for question_id in range(1, 6)
            ]
        }
        response = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=json.dumps(review))
                )
            ]
        )
        client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(create=lambda **kwargs: response)
            )
        )

        with patch("backend.validation.create_client", return_value=(client, "test-model")):
            result = validate_generated_questions("The material states facts two through five.", questions)

        self.assertEqual(result["status"], "review_required")
        self.assertEqual(result["structure"]["status"], "passed")
        self.assertEqual(result["feasibility"]["findings"][0]["question_id"], 1)


if __name__ == "__main__":
    unittest.main()
