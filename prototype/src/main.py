import json
from pathlib import Path
from openai import APIConnectionError

from generator import load_material, generate_questions
from validator import validate_json

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def main():
    fileName = input("Insert file name (with .txt extension): ")
    outputFile = fileName[:-4] + ".json"

    material = load_material(PROJECT_ROOT / "materials" / fileName)
    try:
        result = generate_questions(material)
    except ConnectionError as exc:
        raise SystemExit(str(exc)) from None
    except APIConnectionError:
        raise SystemExit(
            "Could not connect to the configured LLM provider. Check that "
            "the local server is running and its URL in .env is correct."
        ) from None

    output_path = PROJECT_ROOT / "outputs" / outputFile
    output_path.parent.mkdir(parents=True, exist_ok=True)

    output_path.write_text(
        result.model_dump_json(indent=2),
        encoding="utf-8",
    )

    print(f"Saved: {output_path}")

    if not validate_json(str(output_path)):
        raise SystemExit("Generated questions failed validation.")


if __name__ == "__main__":
    main()