import time
import sys
import json
import os
import io
import logging

# Suppress noisy SDK automatic function calling warning
logging.getLogger("google.genai").setLevel(logging.ERROR)

from google import genai
from google.genai import types
import PIL.Image

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

def publish(event):
    """Prints a single-line JSON event to stdout for the Node.js worker."""
    print(json.dumps(event), flush=True)

def parse_inputs():
    """Reads streaming JSON payload directly from sys.stdin."""
    stdin_data = sys.stdin.read().strip()
    if not stdin_data:
        publish({"error": "No input payload received via stdin"})
        sys.exit(1)

    try:
        payload = json.loads(stdin_data)
    except json.JSONDecodeError as e:
        publish({"error": f"Invalid JSON payload on stdin: {str(e)}"})
        sys.exit(1)

    return payload.get("extractedData", []), payload.get("context", {})

def format_rubric(context):
    """Builds formatted rubric text and gets max score."""
    rubric = context.get("rubric") or []
    max_score = int(context.get("maxScore") or 100)

    if not rubric:
        return "", max_score

    rubric_text = f"""
=== RUBRIC ===
Total Points: {max_score}
Criteria:
{json.dumps(rubric, indent=2)}
=== END RUBRIC ===
"""
    return rubric_text, max_score

MAX_CHARS_PER_PAGE = 4000   # cap per page so we don't blow up token budget
MAX_IMAGES = 8             # max images sent inline to Gemini
MAX_IMAGE_DIM = 1024       # resize any image larger than this (to stay under 20MB req limit)

def resize_image(img: PIL.Image.Image) -> PIL.Image.Image:
    """Resizes a PIL image so its longest side is at most MAX_IMAGE_DIM px."""
    if max(img.size) <= MAX_IMAGE_DIM:
        return img
    img = img.copy()
    img.thumbnail((MAX_IMAGE_DIM, MAX_IMAGE_DIM), PIL.Image.LANCZOS)
    return img

def build_prompt(title, description, rubric_text, extracted_data, max_score):
    """Assembles prompt with title, description, rubric, page text, and evaluation schema."""
    prompt = f"""You are an expert academic evaluator. Grade rigorously, constructively, and objectively according to the rubric.

=== ASSIGNMENT TITLE ===
{title}
=== END TITLE ===

=== ASSIGNMENT DESCRIPTION ===
{description if description else "No description provided."}
=== END DESCRIPTION ===
{rubric_text}
=== STUDENT SUBMISSION TEXT ===
"""

    for page in extracted_data:
        text = page.get("text", "")[:MAX_CHARS_PER_PAGE]  # cap per page to avoid huge prompts
        if text.strip():
            prompt += f"\n[Page {page.get('page_number', 0)} Text]:\n{text}\n"

    prompt += f"""
=== END OF SUBMISSION TEXT ===

EVALUATION INSTRUCTIONS:
1. Score MUST be an integer between 0 and {max_score}.
2. Inspect both the extracted text and all attached diagram/chart images carefully.
3. If the submission is blank or completely off-topic, score 0.
4. "summary": A clear 2-3 sentence executive summary of the student's submission and key findings.
5. "strengths": Array of 3-5 specific bullet points highlighting what the student executed well.
6. "weaknesses": Array of 3-5 specific bullet points highlighting technical errors, omissions, or gaps.
7. "feedback": Rich Markdown text. DO NOT write a single plain paragraph. Structure it with clean subheadings and bullet points:
   - ### Rubric Breakdown (Points earned per rubric criterion with brief justification)
   - ### Technical Analysis (Review of logic, calculations, diagrams, and code/structure)
   - ### Key Suggestions for Improvement (Actionable, point-wise guidance)

Respond with ONLY a valid JSON object in this exact schema:
{{
    "score": <integer from 0 to {max_score}>,
    "summary": "2-3 sentence overview",
    "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
    "weaknesses": ["specific weakness 1", "specific weakness 2", "specific weakness 3"],
    "feedback": "Detailed structured markdown with ### headings and bullet points"
}}
"""
    return prompt

def load_images(extracted_data):
    """Loads extracted images from disk, resizes them, and caps total count at MAX_IMAGES."""
    images = []
    for page in extracted_data:
        if len(images) >= MAX_IMAGES:
            break
        for image_path in page.get("images", []):
            if len(images) >= MAX_IMAGES:
                break
            if os.path.exists(image_path):
                try:
                    img = PIL.Image.open(image_path).convert("RGB")
                    img = resize_image(img)
                    images.append(img)
                except Exception as img_err:
                    publish({"warning": f"Could not load image {image_path}: {str(img_err)}"})
    return images

def map_api_error(error_str):
    """Translates raw API errors into clean, user-friendly messages."""
    if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
        return "API Quota Exceeded. Please wait a moment and try again."
    if "404" in error_str or "NOT_FOUND" in error_str:
        return f"Model configuration error. '{MODEL_NAME}' is unavailable."
    if "403" in error_str or "PERMISSION_DENIED" in error_str:
        return "API Key is invalid or lacks required permissions."
    if "400" in error_str or "INVALID_ARGUMENT" in error_str:
        return "Bad Request. The PDF content might be too large or unsupported."
    return error_str.split("{")[0].strip()[:150] or "An unexpected error occurred during AI evaluation."

def main():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        publish({"error": "GEMINI_API_KEY not found in environment"})
        sys.exit(1)

    extracted_data, context = parse_inputs()
    title = context.get("title", "Assignment")
    description = context.get("description", "")

    rubric_text, max_score = format_rubric(context)
    prompt_text = build_prompt(title, description, rubric_text, extracted_data, max_score)
    images = load_images(extracted_data)

    publish({"step": "gemini_started"})
    publish({"step": "gemini_processing"})

    try:
        client = genai.Client(api_key=api_key)
        response = None
        for attempt in range(1, 4):
            try:
                response = client.models.generate_content(
                    model=MODEL_NAME,
                    contents=[prompt_text, *images],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        system_instruction=(
                            "You are an expert academic evaluator. Evaluate assignments strictly and objectively against the provided rubric. "
                            "Always return a single valid JSON object adhering precisely to the requested schema with detailed, actionable, and point-wise feedback. "
                            "No markdown fences around the JSON."
                        ),
                    ),
                )
                break
            except Exception as call_err:
                err_str = str(call_err)
                if ("503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str) and attempt < 3:
                    time.sleep(2 * attempt)
                    continue
                raise call_err

        response_text = response.text if response else ""
        if not response_text:
            publish({"error": "Gemini API returned empty response"})
            sys.exit(1)

        try:
            evaluation = json.loads(response_text)
            evaluation["score"] = max(0, min(max_score, int(evaluation.get("score", 0))))
            evaluation = {
                "score": evaluation.get("score", 0),
                "summary": evaluation.get("summary", ""),
                "strengths": evaluation.get("strengths", []),
                "weaknesses": evaluation.get("weaknesses", []),
                "feedback": evaluation.get("feedback", ""),
            }

            publish({
                "step": "gemini_completed",
                "evaluation": evaluation,
            })

        except (json.JSONDecodeError, ValueError) as parse_err:
            publish({
                "step": "gemini_failed",
                "error": f"Could not parse JSON response: {str(parse_err)}",
            })
            sys.exit(1)

    except Exception as e:
        raw = str(e)
        publish({
            "step": "gemini_failed",
            "error": map_api_error(raw),
            "detail": raw[:300],  # raw error logged for debugging
        })
        sys.exit(1)

if __name__ == "__main__":
    main()
