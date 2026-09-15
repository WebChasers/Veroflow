import ollama

def label_screen(screenshot_path: str):
    """
    Sends a screenshot to the vision AI model.
    Asks it to describe the screen and list visible elements.
    """
    
    with open(screenshot_path, 'rb') as img_file:
        image_bytes = img_file.read()
    
    prompt = """
    Look at this app screenshot. Answer in this format:
    
    Screen Name: (short name for this screen, e.g. "Login Screen")
    Elements: (list buttons, text fields, and labels you can see)
    """
    
    response = ollama.chat(
        model='qwen2.5vl:3b',
        messages=[{
            'role': 'user',
            'content': prompt,
            'images': [image_bytes]
        }]
    )
    
    return response['message']['content']


if __name__ == "__main__":
    # Point this at a real screenshot file you already have
    result = label_screen("../storage/screenshots/screen_test.png")
    print(result)