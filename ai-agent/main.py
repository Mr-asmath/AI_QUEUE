from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from priority import calculate_priority
from prediction import predict_wait, predict_completion_time
from optimizer import optimize_queue
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
)

@app.get("/")
def home():
    return {
        "AI": "Running",
        "services": ["priority", "predict-wait", "optimize", "predict-completion"]
    }

@app.post("/priority")
async def priority(data: dict):
    return {
        "priority_score": calculate_priority(
            data["age"], 
            data["emergency"], 
            data["waiting_time"],
            data.get("token_type", "regular")
        )
    }

@app.post("/predict-wait")
async def wait(data: dict):
    time_of_day = datetime.now() if data.get("use_current_time") else None
    return {
        "estimated_wait": predict_wait(
            data["patients_before"], 
            data["avg_service_time"],
            time_of_day
        ),
        "unit": "minutes"
    }

@app.post("/predict-completion")
async def completion(data: dict):
    token_time = datetime.fromisoformat(data["token_time"])
    return {
        "completion_time": predict_completion_time(
            token_time,
            data["position"],
            data["avg_service_time"]
        )
    }

@app.post("/optimize")
async def optimize(data: dict):
    return {"queue": optimize_queue(data["tokens"])}