#!/bin/bash
cd ~/Documents/veroflow/backend
source venv/bin/activate
export VEROFLOW_API_KEY=$(cat ~/.secrets/gemini_key)
export VEROFLOW_LLM=openai VEROFLOW_MODE=agent
export VEROFLOW_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
export VEROFLOW_MODEL=gemini-3.1-flash-lite
export VEROFLOW_MAX_TOKENS=8000 VEROFLOW_RETRIES=4 VEROFLOW_REASONING_EFFORT=low VEROFLOW_NO_IDLE_WAIT=1
uvicorn main:app --host 0.0.0.0 --port 8000
