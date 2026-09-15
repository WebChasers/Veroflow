from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy
import os
from datetime import datetime

def run_full_test(apk_path: str, instruction: str):
    from pipeline.test_generator import generate_appium_code
    from pipeline.phase1_nlp_parser import parse_instruction
    from pipeline.phase3_screen_labeler import label_screen
    from pipeline.phase4_clip_encoder import get_image_vector
    from pipeline.phase6_chromadb_rag import find_similar_screen, store_screen

    os.makedirs("storage/screenshots", exist_ok=True)
    os.makedirs("storage/chroma_data", exist_ok=True)

    options = UiAutomator2Options()
    options.platform_name = "Android"
    options.device_name = "emulator-5554"
    options.app = apk_path
    options.automation_name = "UiAutomator2"

    driver = webdriver.Remote("http://127.0.0.1:4723", options=options)

    result = {
        "instruction": instruction,
        "parsed_actions": [],
        "screen_label": "",
        "screen_source": "",
        "status": "unknown",
        "generated_code": "",
        "error": None,
        "before_screenshot": "",
        "after_screenshot": ""
    }

    try:
        # PHASE 1: Parse instruction
        parsed_actions = parse_instruction(instruction)
        result["parsed_actions"] = parsed_actions

        if not parsed_actions:
            raise ValueError("NLP parser could not extract any actions from the instruction")

        # Screenshot BEFORE action
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        before_path = f"storage/screenshots/before_{timestamp}.png"
        driver.get_screenshot_as_file(before_path)
        result["before_screenshot"] = before_path

        # PHASE 4: Get CLIP vector for this screen
        vector = get_image_vector(before_path)

        # PHASE 6: Check ChromaDB — have we seen this screen before?
        existing_screen = find_similar_screen(vector)

        if existing_screen:
            screen_label = existing_screen["label"]
            result["screen_source"] = f"Reused from memory (similarity: {existing_screen['similarity']})"
        else:
            # PHASE 3: Not seen before — label it fresh with vision AI
            screen_label = label_screen(before_path)
            store_screen(vector, screen_label, before_path)
            result["screen_source"] = "New screen — labeled and stored"

        result["screen_label"] = screen_label

        # Generate code, now WITH the screen label as extra context
        generated_code = generate_appium_code(parsed_actions, before_path, screen_label)
        result["generated_code"] = generated_code

        # Execute the generated code
        exec(generated_code, {"driver": driver, "AppiumBy": AppiumBy})

        # Screenshot AFTER action
        after_path = f"storage/screenshots/after_{timestamp}.png"
        driver.get_screenshot_as_file(after_path)
        result["after_screenshot"] = after_path

        result["status"] = "passed"

    except Exception as e:
        result["status"] = "failed"
        result["error"] = str(e)
        try:
            error_path = f"storage/screenshots/error_{timestamp}.png"
            driver.get_screenshot_as_file(error_path)
            result["after_screenshot"] = error_path
        except:
            pass

    finally:
        driver.quit()

    return result


if __name__ == "__main__":
    result = run_full_test(
        apk_path=r"/path/to/your/app.apk",   # change this
        instruction="tap the login button"
    )
    print(result)