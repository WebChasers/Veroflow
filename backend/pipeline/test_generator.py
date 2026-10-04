import ollama
import re
import json
import time


def generate_appium_code(parsed_actions: list, screenshot_path: str, screen_label: str = None):
    """
    Sends the structured action list + screenshot (+ optional known screen label
    from ChromaDB memory) to the vision AI, and gets back Appium Python code.
    """

    with open(screenshot_path, 'rb') as img_file:
        image_bytes = img_file.read()

    actions_text = json.dumps(parsed_actions, indent=2)

    context_line = ""
    if screen_label:
        context_line = f'\nThis screen has been seen before and was identified as: "{screen_label}"\n'

    prompt = f"""
    You are a mobile test automation expert. Look at this Android app screenshot.
    {context_line}
    Perform these actions, in order:
    {actions_text}

    Generate Python code using Appium's "driver" object to perform these actions.
    Rules:
    - Only use: driver.find_element(AppiumBy.XPATH, "...")
    - Use .click() for "tap" actions, .send_keys("text") for "type" actions
    - For "verify" actions, use: assert driver.find_element(...) is not None
    - Return ONLY the Python code, no explanations, no markdown formatting
    - Do not include imports, just the action lines, one line per action

    Example output:
    driver.find_element(AppiumBy.XPATH, "//android.widget.Button[@text='Login']").click()
    """

    response = None
    last_error = None
    for attempt in range(3):
        try:
            response = ollama.chat(
                model='qwen2.5vl:3b',
                messages=[{
                    'role': 'user',
                    'content': prompt,
                    'images': [image_bytes]
                }],
                keep_alive='10m'
            )
            break
        except Exception as e:
            last_error = e
            print(f"[test_generator] Ollama attempt {attempt + 1}/3 failed: {e}")
            time.sleep(5)

    if response is None:
        raise last_error

    code = response['message']['content']
    code = re.sub(r'```python', '', code)
    code = re.sub(r'```', '', code)
    code = code.strip()

    return code


if __name__ == "__main__":
    sample_actions = [{"action": "tap", "target": "login button"}]
    code = generate_appium_code(sample_actions, "storage/screenshots/screen_test.png")
    print(code)