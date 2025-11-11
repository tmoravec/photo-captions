import base64
import json
import os
import requests
import logging
from dotenv import load_dotenv

load_dotenv()
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
CAPTIONS_FILE = os.getenv("CAPTIONS_FILE", "captions.txt")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

PROMPT = """
# Core Instructions

You are an experienced photographer specialising in moody, atmospheric imagery that captures the darker aspects of nature and abandoned spaces. Your goal is to create authentic captions and tags for Flickr that resonate with viewers who appreciate melancholic beauty, decay, and the haunting qualities found in forgotten places.

# Content Guidelines

## CAPTION Requirements
It's natural: like talking to a friend. Primarily describes what's in the picture, but can mention the gloominess of the subject. Focus on:

- Common language. Avoid lyrical words like "beckons", "forgotten"
- The sense of abandonment, decay, or melancholy in the scene
- Atmospheric details (mist, shadows, fading light, silence)
- Emotional resonance with themes of withering or loss
- Connection to the quiet, forgotten aspects of places
- Avoid clichéd phrases like "captures the essence" or "hauntingly beautiful", "dark embrace", "where ... once ...", "Empty corridors echo with ghosts"
- Keep it under 15 words, preferably around 7.
- Make it sound like natural speech so that it's not clearly AI generated.
- Primarily describe what's in the image. Use the photo context below.
- Prefer nouns and verbs to adjectives.

## TAGS Strategy
Generate 12-15 tags covering:

- Specific location details (forest names, abandoned areas, nearby towns)
- Weather/atmospheric conditions (fog, overcast, twilight)
- Mood descriptors (melancholic, somber, desolate, forgotten)
- Photographic techniques emphasising darkness/mood
- Emotional atmosphere words that convey withering or decay
- Tags are always single words

# Photo Context

These are photos of castle ruins in southern Bohemia. It was a bit of an urbex, crawling in through broken window, etc.

# Output Format (JSON)

{
    "caption": <caption>,
    "tags", [tag1, tag2, tag3]
}

"""

logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def list_files():
    current_dir = os.getcwd()
    parent_dir = os.path.basename(os.path.dirname(current_dir))
    current_dir_name = os.path.basename(current_dir)
    relative_path = (
        f"{parent_dir}/{current_dir_name}" if parent_dir else current_dir_name
    )

    file_list = []
    for file in os.listdir("."):
        if os.path.isfile(file) and file != "file_list.txt":
            file_list.append(file)

    return file_list


def upload_to_mistral(filename):
    logger.info(f"Processing file: {filename}")
    if not os.path.isfile(filename):
        logger.error(f"File not found: {filename}")
        return {
            "error": f"File not found: {filename}",
            "success": False,
            "filename": filename,
        }

    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        logger.error(f"Unsupported file type: {filename}")
        return {
            "error": f"Unsupported file type: {filename}",
            "success": False,
            "filename": filename,
        }

    url = "https://api.mistral.ai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    }

    data = {
        "model": "pixtral-large-latest",
        "temperature": 0.9,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64.b64encode(open(filename, 'rb').read()).decode('utf-8')}"
                        },
                    },
                ],
            }
        ],
    }

    response = requests.post(url, headers=headers, json=data)
    if DEBUG:
        logger.debug(response.text)

    if response.status_code == 200:
        # Parse the response
        result = response.json()
        choices = result.get("choices", [])
        if choices:
            message = choices[0].get("message", {})
            content = message.get("content", "")

            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]

            json_response = json.loads(content)
            caption = json_response.get("caption", "")
            tags = json_response.get("tags", [])

        return {"caption": caption, "tags": tags, "success": True, "filename": filename}
    else:
        return {
            "error": f"Error: {response.status_code} - {response.text}",
            "success": False,
            "filename": filename,
        }


def captions_for_all_files():
    logger.info("Starting caption generation for all files")
    file_list = list_files()
    mistral_outputs = {}

    for file in file_list:
        logger.info(f"Processing file: {file}")
        mistral_outputs[file] = upload_to_mistral(file)

    logger.info("Finished caption generation for all files")
    return mistral_outputs


def save_captions(captions_dict):
    with open(CAPTIONS_FILE, "w") as f:
        for file, data in captions_dict.items():
            if data.get("success", False):
                caption = data.get("caption", "")
                tags = " ".join(data.get("tags", []))
                f.write(f"{file}\n{caption}\n{tags}\n---\n")


if __name__ == "__main__":
    captions = captions_for_all_files()
    save_captions(captions)
