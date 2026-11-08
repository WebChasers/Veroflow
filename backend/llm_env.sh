# VeroFlow settings. The key is read from ~/.secrets/gemini_key and is never stored here.
export VEROFLOW_API_KEY="$(tr -d ' \r\n' < ~/.secrets/gemini_key)"
export VEROFLOW_LLM=openai
export VEROFLOW_MODE=agent
export VEROFLOW_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
export VEROFLOW_MODEL=gemini-3-flash-preview
export VEROFLOW_MAX_TOKENS=8000
export VEROFLOW_RETRIES=4
export VEROFLOW_REASONING_EFFORT=low
export VEROFLOW_NO_IDLE_WAIT=1
