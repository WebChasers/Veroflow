import ollama
import json

def parse_instruction(user_text: str):
    """
    Takes plain English like:
    "Open app, tap login, enter email test@test.com, verify dashboard"
    
    Returns a list like:
    [
        {"action": "tap", "target": "login"},
        {"action": "type", "target": "email", "value": "test@test.com"},
        {"action": "verify", "target": "dashboard"}
    ]
    """
    
    prompt = f"""
    Convert this test instruction into a JSON list of actions.
    Each action must have: "action" (tap/type/verify/scroll), "target" (what element), 
    and "value" (only if typing text).
    
    Instruction: "{user_text}"
    
    Return ONLY valid JSON, nothing else. Example format:
    [{{"action": "tap", "target": "login_button"}}]
    """
    
    response = ollama.chat(
        model='llama3.2',
        messages=[{'role': 'user', 'content': prompt}]
    )
    
    raw_output = response['message']['content']
    
    try:
        start = raw_output.find('[')
        end = raw_output.rfind(']') + 1
        json_text = raw_output[start:end]
        actions = json.loads(json_text)
        return actions
    except Exception as e:
        print(f"Could not parse AI response: {e}")
        return []


if __name__ == "__main__":
    result = parse_instruction(
        "Open app, tap login button, enter email test@test.com, verify dashboard appears"
    )
    print(result)