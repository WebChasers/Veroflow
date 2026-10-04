import re

TAP = {"tap", "click", "press", "select", "choose", "open", "toggle", "tick"}
TYPE = {"type", "enter", "input", "fill", "write"}
VERIFY = {"verify", "assert", "confirm", "check", "expect"}

SPLIT = re.compile(r"\s*(?:,|;|\n|\.\s|\band then\b|\bthen\b)\s*", re.IGNORECASE)
TYPE_RE = re.compile(r'^(?:type|enter|input|fill|write)\s+"?(.+?)"?\s+(?:in|into|on)\s+(?:the\s+)?(.+)$', re.IGNORECASE)


def quick_parse(instruction):
    """Rule-based parser for simple step lists like 'Tap Skip, tap Continue, ...'.
    Returns a list of {"action", "target"} or None if the text isn't a simple step list
    (then the caller falls back to the LLM parser)."""
    actions = []
    for part in SPLIT.split(instruction.strip()):
        part = re.sub(r"^(?:and|then)\s+", "", part.strip(), flags=re.IGNORECASE).strip(" .")
        if not part:
            continue
        words = part.split()
        verb = words[0].lower()
        rest = " ".join(words[1:]).strip().strip('"\'')
        if verb in TYPE:
            m = TYPE_RE.match(part)
            if not m:
                return None
            actions.append({"action": "type", "target": m.group(2).strip().strip('"\''), "value": m.group(1)})
        elif verb in TAP and rest and len(rest.split()) <= 8:
            actions.append({"action": "tap", "target": rest})
        elif verb in VERIFY and rest and len(rest.split()) <= 8:
            actions.append({"action": "verify", "target": rest})
        elif verb == "back":
            actions.append({"action": "back", "target": ""})
        elif verb == "wait":
            actions.append({"action": "wait", "target": ""})
        else:
            return None
    return actions or None
