import sys
import json
import os
from google import genai
from google.genai import types
import PIL.Image

MODEL_NAME = "gemini-2.5-flash"


def publish(event):
    """Print a JSON event to stdout for Node.js to read line-by-line."""
    print(json.dumps(event), flush=True)


# ── Validate CLI arguments ────────────────────────────────────────────────────

if len(sys.argv) < 4:
    publish({"error": "Missing args. Usage: python geminiGrader.py <extracted_data_json> <assignment_id> <submission_id> [context_json]"})
    sys.exit(1)

extracted_data_json = sys.argv[1]
assignment_id = sys.argv[2]
submission_id = sys.argv[3]
context_json = sys.argv[4] if len(sys.argv) > 4 else "{}"

# ── Validate API key ──────────────────────────────────────────────────────────

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    publish({"error": "GEMINI_API_KEY not found in environment"})
    sys.exit(1)

publish({"info": f"API key present (length: {len(api_key)})", "step": "initialization"})

# ── Main grading logic ────────────────────────────────────────────────────────

try:
    client = genai.Client(api_key=api_key)

    extracted_data = json.loads(extracted_data_json)
    context = json.loads(context_json)

    rubric = context.get("rubric")
    description = context.get("description", "")
    title = context.get("title", "Assignment")
    context_max_score = context.get("maxScore")

    total_images = sum(len(page.get("images", [])) for page in extracted_data)
    publish({"info": f"Parsed {len(extracted_data)} pages with {total_images} images", "step": "data_parsed"})
    publish({"step": "gemini_started", "percent": 85})

    try:
        max_score = int(context_max_score) if context_max_score else 100
    except (ValueError, TypeError):
        max_score = 100

    # ── Build rubric text ─────────────────────────────────────────────────────

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

    # ── Build prompt ──────────────────────────────────────────────────────────

    prompt_text = f"""You are an academic assignment evaluator. Grade MODERATELY.

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
            prompt_text += f"\n[Page {page.get('page_number', 0)} Text]:\n{text}\n"

    prompt_text += f"""
=== END OF SUBMISSION TEXT ===

EVALUATION INSTRUCTIONS:
1. Score MUST be an integer between 0 and {max_score}.
2. Analyze the provided text and all attached images (diagrams, handwritten work, charts).
3. If the submission is completely off-topic, score 0.

Respond with ONLY a valid JSON object in this exact shape:
{{
    "score": <integer from 0 to {max_score}>,
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "feedback": "detailed feedback text",
    "summary": "brief summary"
}}
"""

    # ── Build multimodal content list ─────────────────────────────────────────

    contents = [prompt_text]

    for page in extracted_data:
        for image_path in page.get("images", []):
            if os.path.exists(image_path):
                try:
                    img = PIL.Image.open(image_path)
                    contents.append(img)
                    publish({"info": f"Loaded image: {image_path}", "step": "image_loaded"})
                except Exception as img_err:
                    publish({"warning": f"Could not load image {image_path}: {str(img_err)}"})

    publish({"step": "gemini_processing", "percent": 90, "info": f"Sending request to {MODEL_NAME}"})

    # ── Call Gemini API ───────────────────────────────────────────────────────

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
            system_instruction="You are a STRICT academic grader. Always return a single valid JSON object matching the requested schema. No markdown, no commentary.",
        ),
    )

    response_text = response.text if response else ""

    if not response_text:
        publish({"error": "Gemini API returned empty response"})
        sys.exit(1)

    # ── Parse and emit result ─────────────────────────────────────────────────

    try:
        evaluation = json.loads(response_text)
        # Normalize score to int in case Gemini returns a string
        if isinstance(evaluation.get("score"), str):
            evaluation["score"] = int(evaluation["score"])

        publish({
            "step": "gemini_completed",
            "percent": 95,
            "evaluation": evaluation,
        })

    except (json.JSONDecodeError, ValueError) as parse_err:
        # Gemini returned something but it wasn't valid JSON — still emit it
        publish({
            "step": "gemini_completed",
            "percent": 95,
            "evaluation": {
                "score": 50,
                "feedback": response_text,
                "summary": "Evaluation completed but response format was non-standard.",
                "strengths": [],
                "weaknesses": [],
            },
            "warning": f"Could not parse JSON response: {str(parse_err)}",
        })

except Exception as e:
    import traceback
    publish({
        "error": f"Evaluation failed: {str(e)}",
        "step": "gemini_failed",
        "traceback": traceback.format_exc(),
    })
    sys.exit(1)