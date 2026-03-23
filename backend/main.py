from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from backend.routes import generate, opportunities

app = FastAPI(title="GovPreneurs AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/generate")
app.include_router(opportunities.router, prefix="/opportunities")


@app.get("/")
def root():
    return {"message": "GovPreneurs AI Backend Running 🚀"}
