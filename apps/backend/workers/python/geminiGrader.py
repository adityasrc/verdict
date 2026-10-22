import json
import os
import sys
import time

from google import genai
from google.genai import types
from PIL import Image


MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
MAX_CHARS_PER_PAGE = 4000
MAX_IMAGES = 8
MAX_IMAGE_DIMENSION = 1024
RETRY_DELAYS = (4, 8, 12)


def publish(event):
    print(json.dumps(event), flush=True)


def read_input():
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON payload: {error}") from error

    return payload.get("extractedData", []), payload.get("context", {})


def build_prompt(pages, context):
    max_score = int(context.get("maxScore") or 100)
    rubric = context.get("rubric") or []
    if not rubric:
        raise ValueError("This assignment needs a grading rubric before it can be graded.")

    criteria = [
        {
            "id": index,
            "name": criterion["name"],
            "max_points": int(criterion["points"]),
            "description": criterion["description"],
        }
        for index, criterion in enumerate(rubric, start=1)
    ]
    rubric_total = sum(criterion["max_points"] for criterion in criteria)
    if rubric_total <= 0:
        raise ValueError("The grading rubric must have at least one point.")

    page_text = []
    for page in pages:
        text = page.get("text", "")[:MAX_CHARS_PER_PAGE]
        if text.strip():
            page_text.append(f"Page {page.get('page_number', 0)}:\n{text}")

    submission_text = "\n".join(page_text) or "No text was extracted."
    prompt = f"""Grade the student submission using only the provided rubric.

Assignment: {context.get('title', 'Assignment')}
Description: {context.get('description') or 'No description provided.'}
Final score scale: 0 to {max_score}
Rubric criteria (the score for each criterion must be an integer from 0 to its max_points):
{json.dumps(criteria, indent=2)}

Submission text:
{submission_text}

Review the attached page images too. Return one JSON object with this shape:
{{
  "criteria": [
    {{"id": 1, "score": 0, "feedback": "Reason for this criterion score"}}
  ],
  "summary": "A short summary of the work",
  "strengths": ["specific strength"],
  "weaknesses": ["specific area to improve"],
  "feedback": "Concise overall feedback"
}}
Include one criteria entry for every rubric criterion, using its exact id. Do not add criteria.
"""
    return prompt, max_score, criteria, rubric_total


def load_images(pages):
    images = []

    for page in pages:
        for image_path in page.get("images", []):
            try:
                with Image.open(image_path) as source:
                    image = source.convert("RGB")
                    image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))
                    images.append(image)
            except Exception as error:
                publish({"warning": f"Could not load image {image_path}: {error}"})

            if len(images) == MAX_IMAGES:
                return images

    return images


def friendly_error(error):
    message = str(error)
    if "429" in message or "RESOURCE_EXHAUSTED" in message:
        return "AI service quota exceeded. Please try again later."
    if "404" in message or "NOT_FOUND" in message:
        return f"The configured Gemini model '{MODEL_NAME}' is unavailable."
    if "403" in message or "PERMISSION_DENIED" in message:
        return "The Gemini API key is invalid or lacks permission."
    if "400" in message or "INVALID_ARGUMENT" in message:
        return "Gemini could not process this submission. Check that the PDF is supported."
    return message.split("{")[0].strip()[:150] or "AI grading failed."


def grade(prompt, images, api_key):
    client = genai.Client(api_key=api_key)

    for attempt in range(len(RETRY_DELAYS) + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=[prompt, *images],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0,
                ),
            )
            if not response.text:
                raise ValueError("Gemini returned an empty response")
            return response.text
        except Exception as error:
            message = str(error)
            retryable = "503" in message or "UNAVAILABLE" in message or "429" in message
            if not retryable or attempt == len(RETRY_DELAYS):
                raise
            time.sleep(RETRY_DELAYS[attempt])


def build_evaluation(result, max_score, criteria, rubric_total):
    returned_scores = result.get("criteria")
    if not isinstance(returned_scores, list) or len(returned_scores) != len(criteria):
        raise ValueError("Gemini did not return one score for every rubric criterion.")

    expected_ids = {criterion["id"] for criterion in criteria}
    scores_by_id = {}
    for item in returned_scores:
        criterion_id = int(item["id"])
        if criterion_id not in expected_ids or criterion_id in scores_by_id:
            raise ValueError("Gemini returned an invalid rubric criterion.")
        scores_by_id[criterion_id] = item

    scored_criteria = []
    points_earned = 0
    for criterion in criteria:
        criterion_id = criterion["id"]
        if criterion_id not in scores_by_id:
            raise ValueError("Gemini did not score every rubric criterion.")

        response = scores_by_id[criterion_id]
        max_points = criterion["max_points"]
        score = max(0, min(max_points, int(response["score"])))
        points_earned += score
        scored_criteria.append({
            "name": criterion["name"],
            "score": score,
            "maxPoints": max_points,
            "feedback": str(response.get("feedback", "")),
        })

    final_score = round(points_earned * max_score / rubric_total)
    return {
        "score": final_score,
        "criteria": scored_criteria,
        "summary": str(result.get("summary", "")),
        "strengths": [str(item) for item in result.get("strengths", []) if item is not None]
        if isinstance(result.get("strengths"), list) else [],
        "weaknesses": [str(item) for item in result.get("weaknesses", []) if item is not None]
        if isinstance(result.get("weaknesses"), list) else [],
        "feedback": str(result.get("feedback", "")),
    }


def main():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        publish({"error": "GEMINI_API_KEY is not set"})
        return 1

    try:
        pages, context = read_input()
        prompt, max_score, criteria, rubric_total = build_prompt(pages, context)
        images = load_images(pages)

        publish({"step": "gemini_started"})
        publish({"step": "gemini_processing"})
        response_text = grade(prompt, images, api_key).strip()
        if response_text.startswith("```"):
            response_text = response_text.removeprefix("```json").removeprefix("```")
            response_text = response_text.removesuffix("```").strip()

        result = json.loads(response_text)
        evaluation = build_evaluation(result, max_score, criteria, rubric_total)
    except json.JSONDecodeError as error:
        publish({"step": "gemini_failed", "error": f"Could not parse Gemini response: {error}"})
        return 1
    except Exception as error:
        publish({"step": "gemini_failed", "error": friendly_error(error), "detail": str(error)[:300]})
        return 1

    publish({"step": "gemini_completed", "evaluation": evaluation})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
