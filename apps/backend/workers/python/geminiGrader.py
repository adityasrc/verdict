import sys
import json
import os
import google.generativeai as genai
import PIL.Image

MODEL_NAME = "gemini-1.5-flash"

def publish(event):
    """Print JSON event to stdout for Node.js to capture"""
    print(json.dumps(event), flush=True)

# Validate args
if len(sys.argv) < 4:
    publish({"error": "Missing args. Usage: python script.py <extracted_data_json> <assignment_id> <submission_id> [context_json]"})
    sys.exit(1)

extracted_data_json = sys.argv[1]
assignment_id = sys.argv[2]
submission_id = sys.argv[3]
context_json = sys.argv[4] if len(sys.argv) > 4 else "{}"

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    publish({"error": "GEMINI_API_KEY not found in environment"})
    sys.exit(1)

publish({"info": f"API key length: {len(api_key)}", "step": "initialization"})

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        MODEL_NAME,
        system_instruction="You are a STRICT academic grader. Always return a single valid JSON object matching the requested schema. No markdown, no commentary."
    )

    extracted_data = json.loads(extracted_data_json)
    context = json.loads(context_json)

    rubric = context.get("rubric")
    description = context.get("description", "")
    title = context.get("title", "Assignment")
    context_max_score = context.get("maxScore")

    total_images = sum(len(page.get('images', [])) for page in extracted_data)
    publish({"info": f"Parsed {len(extracted_data)} pages with {total_images} images", "step": "data_parsed"})
    publish({"step": "gemini_started", "percent": 85})

    try:
        max_score = int(context_max_score) if context_max_score else 100
    except ValueError:
        max_score = 100

    rubric_text = ""
    if rubric:
        if isinstance(rubric, list):
            criteria_list = rubric
            rubric_name = "Assignment Rubric"
        else:
            criteria_list = rubric.get('criteria', [])
            rubric_name = rubric.get('name', 'Rubric')

        if not context_max_score:
            rubric_total = sum(int(c.get('points', 0)) for c in criteria_list)
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

    prompt_string = f"""You are an academic assignment evaluator. Grade MODERATELY.

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
    
    # List to hold text and PIL Image objects for the single API call
    multimodal_payload = []
    
    for page in extracted_data:
        text = page.get('text', '')
        if text.strip():
            prompt_string += f"\n[Page {page.get('page_number', 0)} Text]:\n{text}\n"

    prompt_string += f"""
=== END OF SUBMISSION TEXT ===

EVALUATION INSTRUCTIONS:
1. Score MUST be between 0 and {max_score}. 
2. Analyze both the provided text and all attached images (which may contain diagrams, handwritten work, or charts).
3. If the submission is completely off-topic based on the rubric, score 0.

Respond with ONLY a valid JSON object in this exact shape:
{{
    "score": <integer from 0 to {max_score}>,
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "feedback": "detailed feedback text",
    "summary": "brief summary"
}}
"""
    # Append the full text prompt first
    multimodal_payload.append(prompt_string)

    # Append all images directly to the payload
    for page in extracted_data:
        images = page.get('images', [])
        for image_path in images:
            if os.path.exists(image_path):
                try:
                    img = PIL.Image.open(image_path)
                    multimodal_payload.append(img)
                    publish({"info": f"Loaded image {image_path}", "step": "image_loaded"})
                except Exception as e:
                    publish({"warning": f"Could not load image {image_path}: {str(e)}"})

    publish({"step": "gemini_processing", "percent": 90, "info": f"Sending multimodal payload to {MODEL_NAME}"})

    response = model.generate_content(
        multimodal_payload,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    )

    response_text = response.text if response else ""

    if not response_text:
        publish({"error": "API returned empty text"})
        sys.exit(1)

    try:
        evaluation = json.loads(response_text)
        if isinstance(evaluation.get("score"), str):
            evaluation["score"] = int(evaluation["score"])

        publish({
            "step": "gemini_completed",
            "percent": 95,
            "evaluation": evaluation
        })

    except (json.JSONDecodeError, ValueError) as e:
        publish({
            "step": "gemini_completed",
            "percent": 95,
            "evaluation": {
                "raw_response": response_text,
                "score": 50,
                "feedback": response_text,
                "summary": "Evaluation completed but format was non-standard"
            },
            "warning": f"Could not parse JSON: {str(e)}"
        })

except Exception as e:
    import traceback
    publish({
        "error": f"Evaluation failed: {str(e)}",
        "step": "gemini_failed",
        "traceback": traceback.format_exc()
    })
    sys.exit(1)