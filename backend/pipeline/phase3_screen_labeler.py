import base64
import json
import os
import time
import urllib.error
import urllib.request

PROMPT = """
    Look at this app screenshot. Answer in this format:

    Screen Name: (short name for this screen, e.g. "Login Screen")
    Elements: (list buttons, text fields, and labels you can see)
    """


def _label_with_ollama(image_bytes: bytes) -> str:
    """Original local model (unchanged behaviour)."""
    import ollama
    response = ollama.chat(
        model=os.environ.get("VEROFLOW_VISION_MODEL", "qwen2.5vl:3b"),
        messages=[{
            'role': 'user',
            'content': PROMPT,
            'images': [image_bytes]
        }]
    )
    return response['message']['content']


def _label_with_api(image_bytes: bytes) -> str:
    """Hosted model through an OpenAI-compatible endpoint (Gemini, Kimi, ...). Settings come from env vars."""
    base_url = os.environ.get("VEROFLOW_BASE_URL", "").strip().rstrip("/")
    model = os.environ.get("VEROFLOW_MODEL", "").strip()
    key = os.environ.get("VEROFLOW_API_KEY", "").strip()
    if not (base_url and model and key):
        raise RuntimeError("screen labeler: VEROFLOW_BASE_URL, VEROFLOW_MODEL and VEROFLOW_API_KEY must be set")

    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    body = {
        "model": model,
        # Gemini 2.5 models may spend tokens on internal reasoning first, so leave enough room for the answer.
        "max_tokens": max(2048, int(os.environ.get("VEROFLOW_MAX_TOKENS", "800"))),
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}},
            ],
        }],
    }
    request = urllib.request.Request(
        base_url + "/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )

    retries = max(1, int(os.environ.get("VEROFLOW_RETRIES", "3")))
    last_error = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            text = (data["choices"][0]["message"].get("content") or "").strip()
            if text:
                return text
            last_error = RuntimeError("screen labeler: empty answer from the model")
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            last_error = RuntimeError(f"screen labeler: HTTP {e.code}: {detail}")
            if e.code not in (429, 500, 502, 503, 504):
                break                       # wrong key / model / request: retrying will not help
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError) as e:
            last_error = RuntimeError(f"screen labeler: {e}")
        time.sleep(2 * (attempt + 1))       # wait 2 s, 4 s, ... before the next try
    raise last_error


def label_screen(screenshot_path: str):
    """
    Sends a screenshot to the vision AI model.
    Asks it to describe the screen and list visible elements.
    Uses the provider in VEROFLOW_LLM (default: ollama), like the rest of VeroFlow.
    """
    with open(screenshot_path, 'rb') as img_file:
        image_bytes = img_file.read()

    provider = os.environ.get("VEROFLOW_LLM", "ollama").strip().lower()
    if provider == "ollama":
        return _label_with_ollama(image_bytes)
    return _label_with_api(image_bytes)


if __name__ == "__main__":
    import sys
    # Usage: python3 pipeline/phase3_screen_labeler.py <screenshot.png>
    path = sys.argv[1] if len(sys.argv) > 1 else "../storage/screenshots/screen_test.png"
    print(label_screen(path))
