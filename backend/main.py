from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import shutil

from pipeline.phase1_nlp_parser import parse_instruction
from pipeline.test_executor import run_full_test

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("storage/apks", exist_ok=True)
os.makedirs("storage/screenshots", exist_ok=True)
os.makedirs("storage/chroma_data", exist_ok=True)


@app.get("/")
def home():
    return {"message": "VeroFlow backend is working!"}


@app.post("/upload-apk")
async def upload_apk(file: UploadFile = File(...)):
    save_path = f"storage/apks/{file.filename}"
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"message": "APK uploaded successfully", "path": save_path}


@app.post("/submit-test")
async def submit_test(instruction: str = Form(...)):
    actions = parse_instruction(instruction)
    return {"instruction": instruction, "parsed_actions": actions}


@app.post("/run-test")
async def run_test(apk_path: str = Form(...), instruction: str = Form(...)):
    result = run_full_test(apk_path, instruction)
    return result


# Serves screenshot images so the Next.js dashboard can display them
app.mount("/screenshots", StaticFiles(directory="storage/screenshots"), name="screenshots")