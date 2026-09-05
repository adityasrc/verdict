import pymupdf
import os
import sys
import json
from pathlib import Path

pymupdf.TOOLS.mupdf_display_errors(False)

def publish(event):
    """Prints a single-line JSON event to stdout for the Node.js worker."""
    print(json.dumps(event), flush=True)

def extract_page_images(doc, page, page_num, output_dir):
    """Extracts diagrams and charts from a page, skipping tiny icons (<24x24)."""
    page_images = []
    for img_index, img in enumerate(page.get_images(full=True)):
        try:
            xref = img[0]
            base_image = doc.extract_image(xref)
            if not base_image:
                continue

            width = base_image.get("width", 0)
            height = base_image.get("height", 0)
            if width < 24 and height < 24:
                continue  # Skip bullet icons and decorative spacers

            image_bytes = base_image.get("image")
            ext = base_image.get("ext", "png")

            if image_bytes:
                image_filename = f"p{page_num}_img{img_index + 1}.{ext}"
                image_path = os.path.join(output_dir, image_filename)
                with open(image_path, "wb") as f:
                    f.write(image_bytes)
                page_images.append(image_path)
        except Exception as e:
            publish({"warning": f"Skipped image {img_index} on page {page_num}: {str(e)}"})

    return page_images

def main():
    if len(sys.argv) < 3:
        publish({"error": "Missing args. Usage: python pdfParser.py <pdf_path> <submission_id>"})
        sys.exit(1)

    pdf_path = sys.argv[1]
    submission_id = sys.argv[2]

    try:
        doc = pymupdf.open(pdf_path)
    except Exception as e:
        publish({"error": f"Failed to open PDF: {str(e)}"})
        sys.exit(1)

    total_pages = len(doc)
    if total_pages == 0:
        publish({"error": "PDF is empty"})
        sys.exit(1)

    publish({"step": "parsing_started", "total_pages": total_pages})

    # Output directory for diagrams: apps/backend/tmp/extracted_images/<submission_id>
    output_dir = Path(__file__).resolve().parents[2] / "tmp" / "extracted_images" / submission_id
    output_dir.mkdir(parents=True, exist_ok=True)

    extracted_data = []

    for page_num in range(total_pages):
        current_page = page_num + 1
        try:
            page = doc[page_num]
            text = page.get_text()
            images = extract_page_images(doc, page, current_page, str(output_dir))

            extracted_data.append({
                "page_number": current_page,
                "text": text,
                "images": images,
            })

            # Emit progress every 5 pages or on the last page
            if current_page % 5 == 0 or current_page == total_pages:
                publish({"step": "page_parsed", "page": current_page, "total_pages": total_pages})

        except Exception as page_err:
            publish({"warning": f"Page {current_page} skipped due to error: {str(page_err)}"})

    doc.close()

    publish({
        "step": "parsing_completed",
        "result": extracted_data,
    })

if __name__ == "__main__":
    main()