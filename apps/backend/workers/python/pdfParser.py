import json
import sys
from pathlib import Path

import pymupdf


pymupdf.TOOLS.mupdf_display_errors(False)

MAX_IMAGE_BYTES = 5 * 1024 * 1024


def publish(event):
    print(json.dumps(event), flush=True)


def extract_images(document, page, page_number, output_dir):
    image_paths = []

    for image_number, image_info in enumerate(page.get_images(full=True), start=1):
        try:
            image = document.extract_image(image_info[0])
            if not image:
                continue

            width = image.get("width", 0)
            height = image.get("height", 0)
            data = image.get("image")
            if width < 24 or height < 24 or not data:
                continue

            if len(data) > MAX_IMAGE_BYTES:
                size_kb = len(data) // 1024
                publish({
                    "warning": f"Skipped oversized image {image_number} on page {page_number} ({size_kb}KB)"
                })
                continue

            image_path = output_dir / f"p{page_number}_img{image_number}.{image.get('ext', 'png')}"
            image_path.write_bytes(data)
            image_paths.append(str(image_path))
        except Exception as error:
            publish({
                "warning": f"Skipped image {image_number} on page {page_number}: {error}"
            })

    return image_paths


def parse_pdf(pdf_path, submission_id):
    try:
        document = pymupdf.open(pdf_path)
    except Exception as error:
        publish({"error": f"Failed to open PDF: {error}"})
        return None

    with document:
        total_pages = len(document)
        if total_pages == 0:
            publish({"error": "PDF is empty"})
            return None

        publish({"step": "parsing_started", "total_pages": total_pages})

        output_dir = Path(pdf_path).resolve().parent / "extracted_images" / submission_id
        output_dir.mkdir(parents=True, exist_ok=True)
        pages = []

        for page_index in range(total_pages):
            page_number = page_index + 1
            try:
                page = document[page_index]
                pages.append({
                    "page_number": page_number,
                    "text": page.get_text(),
                    "images": extract_images(document, page, page_number, output_dir),
                })
                publish({
                    "step": "page_parsed",
                    "page": page_number,
                    "total_pages": total_pages,
                })
            except Exception as error:
                publish({"warning": f"Page {page_number} skipped: {error}"})

    publish({"step": "parsing_completed", "result": pages})
    return pages


def main():
    if len(sys.argv) != 3:
        publish({"error": "Usage: python pdfParser.py <pdf_path> <submission_id>"})
        return 1

    result = parse_pdf(sys.argv[1], sys.argv[2])
    return 0 if result is not None else 1


if __name__ == "__main__":
    raise SystemExit(main())
