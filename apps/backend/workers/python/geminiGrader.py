import sys
import json
import os
from google import genai
from google.genai import types
import PIL.Image

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

def publish(event):
    """Prints a single-line JSON event to stdout for the Node.js worker."""
    print(json.dumps(event), flush=True)

def parse_inputs():
    """Reads inputs from stdin (streaming) or falls back to sys.argv (CLI)."""
    stdin_data = ""
    if not sys.stdin.isatty():
        stdin_data = sys.stdin.read().strip()

    if stdin_data:
        if len(sys.argv) < 3:
            publish({"error": "Missing args. Usage: python geminiGrader.py <assignment_id> <submission_id>"})
            sys.exit(1)
        assignment_id = sys.argv[1]
        submission_id = sys.argv[2]
        payload = json.loads(stdin_data)
        return assignment_id, submission_id, payload.get("extractedData", []), payload.get("context", {})

    if len(sys.argv) < 4:
        publish({"error": "Missing args. Usage: python geminiGrader.py <extracted_data_json> <assignment_id> <submission_id> [context_json]"})
        sys.exit(1)

    extracted_data = json.loads(sys.argv[1])
    assignment_id = sys.argv[2]
    submission_id = sys.argv[3]
    context = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    return assignment_id, submission_id, extracted_data, context

def format_rubric(context):
    """Builds formatted rubric text and calculates max_score from rubric criteria."""
    rubric = context.get("rubric")
    context_max_score = context.get("maxScore")

    try:
        max_score = int(context_max_score) if context_max_score else 100
    except (ValueError, TypeError):
        max_score = 100

    rubric_text = ""
    if rubric:
        criteria_list = rubric if isinstance(rubric, list) else rubric.get("criteria", [])
        rubric_name = "Assignment Rubric" if isinstance(rubric, list) else rubric.get("name", "Rubric")

        if not context_max_score:
            rubric_total = sum(int(c.get("points", 0)) for c in criteria_list)
            if rubric_total > 0:
                max_score = rubric_total

        rubric_text = f"""
=== RUBRIC ===
Name: {rubric_name}
Total Points: {max_score}
Criteria:
{json.dumps(criteria_list, indent=2)}
=== END RUBRIC ===
"""
    return rubric_text, max_score

def build_prompt(assignment_id, submission_id, title, description, rubric_text, extracted_data, max_score):
    """Assembles prompt with title, description, rubric, page text, and evaluation schema."""
    prompt = f"""You are an expert academic evaluator. Grade rigorously, constructively, and objectively according to the rubric.

Assignment ID: {assignment_id}
Submission ID: {submission_id}

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
        text = page.get("text", "")
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
    """Loads extracted diagram/chart images from disk into PIL Images."""
    images = []
    for page in extracted_data:
        for image_path in page.get("images", []):
            if os.path.exists(image_path):
                try:
                    images.append(PIL.Image.open(image_path))
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

    assignment_id, submission_id, extracted_data, context = parse_inputs()
    title = context.get("title", "Assignment")
    description = context.get("description", "")

    rubric_text, max_score = format_rubric(context)
    prompt_text = build_prompt(assignment_id, submission_id, title, description, rubric_text, extracted_data, max_score)
    images = load_images(extracted_data)

    publish({"step": "gemini_started"})
    publish({"step": "gemini_processing"})

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=[prompt_text, *images],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                system_instruction=(
                    "You are an expert academic evaluator. Evaluate assignments strictly and objectively against the provided rubric. "
                    "Always return a single valid JSON object adhering precisely to the requested schema with detailed, actionable, and point-wise feedback. "
                    "No markdown fences around the JSON."
                ),
            ),
        )

        response_text = response.text if response else ""
        if not response_text:
            publish({"error": "Gemini API returned empty response"})
            sys.exit(1)

        try:
            evaluation = json.loads(response_text)
            if isinstance(evaluation.get("score"), str):
                evaluation["score"] = int(evaluation["score"])

            publish({
                "step": "gemini_completed",
                "evaluation": evaluation,
            })

        except (json.JSONDecodeError, ValueError) as parse_err:
            publish({
                "step": "gemini_completed",
                "evaluation": {
                    "score": 0,
                    "feedback": response_text,
                    "summary": "SYSTEM ERROR: AI failed to format response correctly. Manual review required.",
                    "strengths": [],
                    "weaknesses": [],
                },
                "warning": f"Could not parse JSON response: {str(parse_err)}",
            })

    except Exception as e:
        publish({
            "step": "gemini_failed",
            "error": map_api_error(str(e)),
        })
        sys.exit(1)

if __name__ == "__main__":
    main()
