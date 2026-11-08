from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

PromptingStrategy = Literal[
    "zero_shot_prompting",
    "few_shot_prompting",
    "structured_shot_prompting",
]


class MCQQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int = Field(ge=1)
    question: str = Field(min_length=1)
    options: dict[str, str]
    correct_answer: Literal["A", "B", "C", "D"]
    explanation: str = Field(min_length=1)
    source_concept: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_options(self):
        expected = {"A", "B", "C", "D"}
        if set(self.options) != expected:
            raise ValueError("Question must have exactly options A, B, C and D")

        text_fields = {
            "question": self.question,
            "explanation": self.explanation,
            "source_concept": self.source_concept,
            **self.options,
        }
        if any(not value.strip() for value in text_fields.values()):
            raise ValueError("Question fields must not be empty")
        if len(set(self.options.values())) != 4:
            raise ValueError("All four options must be distinct")
        return self


class MCQSet(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    strategy: PromptingStrategy
    questions: list[MCQQuestion] = Field(min_length=5, max_length=5)

    @model_validator(mode="after")
    def validate_question_ids(self):
        ids = [question.id for question in self.questions]
        if len(set(ids)) != 5:
            raise ValueError("Question IDs must be unique")
        return self
