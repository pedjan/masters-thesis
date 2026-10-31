import json
from pathlib import Path

from pydantic import ValidationError

from models import MCQSet


def validate_json(path: str | Path) -> bool:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        result = MCQSet.model_validate(data)

        print(
            f"VALID: {len(result.questions)} questions "
            "passed structural validation."
        )
        return True

    except (OSError, json.JSONDecodeError, ValidationError, ValueError) as exc:
        print(f"INVALID: {exc}")
        return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Validate generated multiple-choice questions."
    )
    parser.add_argument("path", type=Path, help="JSON file to validate")
    if not validate_json(parser.parse_args().path):
        raise SystemExit(1)