from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.database import init_db
from app.routers import ziwei, payment, contact, yukim, admin

load_dotenv()

app = FastAPI(title="자미두수 예언소 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ziwei.adelante-properties.com",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ziwei.router)
app.include_router(payment.router)
app.include_router(contact.router)
app.include_router(yukim.router)
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.on_event("startup")
def startup():
    init_db()
    print("[ziwei-api] 시작 — 포트 8003")

@app.get("/health")
def health():
    return {"status": "ok", "service": "ziwei-api"}

@app.get("/api/config")
def config():
    return {"beta_mode": os.getenv("BETA_MODE", "false").lower() == "true"}
