from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import httpx, hashlib
from datetime import datetime

from app.database import SessionLocal, ZiweiPayment
from app.services.gpt_service import generate_ziwei_reading
from app.services.cache_service import (
    get_mingban_cache, set_mingban_cache,
    get_reading_cache, set_reading_cache,
)
import os

router = APIRouter(prefix="/api/ziwei", tags=["ziwei"])
NODE_URL = os.getenv("NODE_SERVICE_URL", "http://localhost:3003")


class ZiweiInput(BaseModel):
    year:         int           = Field(..., ge=1900, le=2010)
    month:        int           = Field(..., ge=1, le=12)
    day:          int           = Field(..., ge=1, le=31)
    hour:         int           = Field(..., ge=0, le=23)
    minute:       int           = Field(default=0)
    is_male:      bool
    current_year: Optional[int] = None
    age:          Optional[int] = None
    # 서비스 타입: ziwei_free | ziwei_year | ziwei_day
    service_type: str
    payment_key:  Optional[str] = None
    # 특정일 운세 전용
    query_month:  Optional[int] = None
    query_day:    Optional[int] = None
    calendar:     str = "solar"
    is_leap:      bool = False


def _cache_key(inp: ZiweiInput) -> str:
    qm = inp.query_month or 0
    qd = inp.query_day or 0
    raw = f"ziwei_{inp.year}_{inp.month}_{inp.day}_{inp.hour}_{inp.minute}_{'M' if inp.is_male else 'F'}_{qm}_{qd}_{inp.calendar}"
    return hashlib.md5(raw.encode()).hexdigest()


def _verify_payment(payment_key, service_type, cache_key) -> bool:
    db = SessionLocal()
    try:
        pay = db.query(ZiweiPayment).filter(
            ZiweiPayment.payment_key == payment_key,
            ZiweiPayment.service_type == service_type,
            ZiweiPayment.cache_key == cache_key,
            ZiweiPayment.status == "completed",
        ).first()
        return pay is not None
    finally:
        db.close()


async def _call_node(inp: ZiweiInput, current_year: int) -> dict:
    payload = dict(
        year=inp.year, month=inp.month, day=inp.day,
        hour=inp.hour, minute=inp.minute, isMale=inp.is_male,
        currentYear=current_year, age=inp.age,
        queryMonth=inp.query_month, queryDay=inp.query_day,
        calendar=inp.calendar, isLeap=inp.is_leap,
    )
    async with httpx.AsyncClient(timeout=10.0) as c:
        r = await c.post(f"{NODE_URL}/ziwei/calculate", json=payload)
        r.raise_for_status()
        return r.json()


@router.post("/calculate")
async def calculate(inp: ZiweiInput):
    cache_key    = _cache_key(inp)
    current_year = inp.current_year or datetime.now().year
    is_paid      = inp.service_type != "ziwei_free"

    # 유료 결제 검증 (TEST_MODE=true 이면 건너뜀)
    test_mode = os.getenv("TEST_MODE", "false").lower() == "true"
    if is_paid and not test_mode:
        if not inp.payment_key:
            raise HTTPException(status_code=402, detail="결제가 필요합니다.")
        if not _verify_payment(inp.payment_key, inp.service_type, cache_key):
            raise HTTPException(status_code=403, detail="결제 정보를 확인할 수 없습니다.")

    # 명반 계산 (캐시 우선)
    mingban = get_mingban_cache(cache_key)
    if not mingban:
        try:
            mingban = await _call_node(inp, current_year)
            set_mingban_cache(cache_key, inp.model_dump(), mingban)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"명반 계산 오류: {e}")

    # 무료 — GPT 호출 (캐시 없이 매번, 토큰 적음)
    if inp.service_type == "ziwei_free":
        reading = await generate_ziwei_reading(mingban, "ziwei_free", current_year)
        return {"service_type": "ziwei_free", "cache_key": cache_key,
                "mingban": mingban, "reading": reading}

    # 특정일 캐시 키 — 날짜 포함
    reading_key = cache_key
    if inp.service_type == "ziwei_day":
        reading_key = f"{cache_key}_{current_year}_{inp.query_month}_{inp.query_day}"

    cached = get_reading_cache(reading_key, inp.service_type, current_year)
    if cached:
        return {"service_type": inp.service_type, "cache_key": cache_key,
                "mingban": mingban, "reading": cached}

    # GPT 풀이 생성
    liuri = mingban.get("liuri")
    reading = await generate_ziwei_reading(mingban, inp.service_type, current_year, liuri)
    set_reading_cache(reading_key, inp.service_type, current_year, reading)

    return {"service_type": inp.service_type, "cache_key": cache_key,
            "mingban": mingban, "reading": reading}
