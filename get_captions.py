import base64
import json
import os
import sys
import requests
import logging
from dotenv import load_dotenv

load_dotenv()
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
CAPTIONS_FILE = os.getenv("CAPTIONS_FILE", "captions.txt")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def list_files(folder_path="."):
    current_dir = os.path.abspath(folder_path)
    parent_dir = os.path.basename(os.path.dirname(current_dir))
    current_dir_name = os.path.basename(current_dir)
    relative_path = (
        f"{parent_dir}/{current_dir_name}" if parent_dir else current_dir_name
    )

    file_list = []
    for file in os.listdir(folder_path):
        if os.path.isfile(os.path.join(folder_path, file)) and file != "file_list.txt":
            file_list.append(file)

    return file_list


def upload_to_mistral(filename, platform):
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

    prompt_file = f"{platform}-prompt.txt" 
    if not os.path.isfile(prompt_file):
        logger.error(f"File not found: {prompt_file}")
        return {
            "error": f"File not found: {prompt_file}",
            "success": False,
            "filename": filename,
        }

    with open(prompt_file, "r") as f:
        prompt = f.read()

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
                    {"type": "text", "text": prompt},
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

    def process_response(response, filename):
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

    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            response = requests.post(url, headers=headers, json=data)
            if DEBUG:
                logger.debug(response.text)

            return process_response(response, filename)
        except json.decoder.JSONDecodeError as e:
            retry_count += 1
            if retry_count < max_retries:
                logger.warning(f"JSONDecodeError occurred. Retrying... (Attempt {retry_count}/{max_retries})")
                continue
            else:
                return {
                    "error": f"JSONDecodeError: {str(e)}",
                    "success": False,
                    "filename": filename,
                }
    else:
        return {
            "error": f"Error: {response.status_code} - {response.text}",
            "success": False,
            "filename": filename,
        }


def captions_for_all_files(folder_path, platform):
    logger.info("Starting caption generation for all files")
    file_list = list_files(folder_path)
    mistral_outputs = {}

    for file in file_list:
        logger.info(f"Processing file: {file}")
        mistral_outputs[file] = upload_to_mistral(os.path.join(folder_path, file), platform)

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
    platform = sys.argv[1].lower()
    folder_path = sys.argv[2] if len(sys.argv) > 2 else "."
    captions = captions_for_all_files(folder_path, platform)
    save_captions(captions)
