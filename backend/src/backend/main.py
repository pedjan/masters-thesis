import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory
from uuid import uuid4

from docx import Document
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAIError
from pydantic import BaseModel, ValidationError
from pypdf import PdfReader, errors as pdf_errors
from docx.opc.exceptions import PackageNotFoundError

from backend.generator import (
    LLMConfigurationError,
    generate_questions,
)
from backend.models import MCQSet

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "materials"
OUTPUT_DIR = Path(__file__).resolve().parents[2] / "outputs"
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".doc", ".docx"}


class TextMaterialRequest(BaseModel):
    text: str


def _read_material(path: Path) -> str:
    extension = path.suffix.lower()

    if extension == ".txt":
        material = path.read_text(encoding="utf-8")
    elif extension == ".pdf":
        reader = PdfReader(path)
        if reader.is_encrypted:
            raise ValueError("Encrypted PDF files are not supported.")
        material = "\n".join(page.extract_text() or "" for page in reader.pages)
    elif extension == ".docx":
        document = Document(path)
        parts = [paragraph.text for paragraph in document.paragraphs]
        parts.extend(
            "\n".join(" | ".join(cell.text for cell in row.cells) for row in table.rows)
            for table in document.tables
        )
        material = "\n".join(parts)
    elif extension == ".doc":
        converter = os.getenv("LIBREOFFICE_PATH")
        converter_command = (
            converter
            or shutil.which("soffice")
            or shutil.which("libreoffice")
        )
        if not converter_command:
            raise RuntimeError(
                "LibreOffice is required to process .doc files. Install it or "
                "set LIBREOFFICE_PATH to the soffice executable."
            )
        with TemporaryDirectory() as temporary_directory:
            try:
                subprocess.run(
                    [
                        converter_command,
                        "--headless",
                        "--convert-to",
                        "txt:Text",
                        "--outdir",
                        temporary_directory,
                        str(path),
                    ],
                    check=True,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
            except subprocess.CalledProcessError as error:
                raise ValueError(
                    "LibreOffice could not convert this DOC file."
                ) from error
            except subprocess.TimeoutExpired as error:
                raise ValueError("Converting this DOC file timed out.") from error
            except FileNotFoundError as error:
                raise RuntimeError(
                    "The configured LibreOffice executable was not found."
                ) from error

            converted_path = Path(temporary_directory) / f"{path.stem}.txt"
            if not converted_path.is_file():
                raise ValueError("LibreOffice did not produce text from this DOC file.")
            material = converted_path.read_text(encoding="utf-8")
    else:
        raise ValueError("Unsupported teaching material format.")

    if not material.strip():
        raise ValueError("Teaching material is empty or contains no extractable text.")
    return material


def _generate_and_save(material: str, output_filename: str):
    try:
        questions: MCQSet = generate_questions(material)
    except LLMConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (OpenAIError, ConnectionError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (json.JSONDecodeError, ValidationError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"Question generation returned invalid data: {error}",
        ) from error

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / output_filename).write_text(
        questions.model_dump_json(indent=2),
        encoding="utf-8",
    )
    return {"saved_as": output_filename, **questions.model_dump()}


@app.get("/")
def read_root():
    return {"message": "Hello World"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    original_filename = file.filename or ""
    extension = Path(original_filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Only PDF, TXT, DOC, and DOCX files are allowed.",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / stored_filename
    size_bytes = 0

    with destination.open("xb") as uploaded_file:
        while chunk := await file.read(1024 * 1024):
            uploaded_file.write(chunk)
            size_bytes += len(chunk)

    return {
        "filename": original_filename,
        "stored_as": stored_filename,
        "size_bytes": size_bytes,
    }


@app.post("/generate/{stored_filename}")
def generate_file_questions(stored_filename: str):


    material_path = UPLOAD_DIR / stored_filename
    if not material_path.is_file():
        raise HTTPException(status_code=404, detail="Uploaded file was not found.")

    try:
        material = _read_material(material_path)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (
        OSError,
        UnicodeError,
        ValueError,
        PackageNotFoundError,
        pdf_errors.PdfReadError,
    ) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    output_filename = f"{Path(stored_filename).stem}.json"
    return _generate_and_save(material, output_filename)


@app.post("/generate-text")
def generate_text_questions(request: TextMaterialRequest):
    if not request.text.strip():
        raise HTTPException(
            status_code=422,
            detail="Teaching material must not be empty.",
        )

    output_filename = f"text-{uuid4().hex}.json"
    return _generate_and_save(request.text, output_filename)