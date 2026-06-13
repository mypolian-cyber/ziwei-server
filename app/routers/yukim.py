"""
자미두수 육임 프록시 라우터
후아모 육임 API(localhost:8001)를 내부 호출해서 결과 반환
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import httpx
import os

router = APIRouter(prefix="/api/yukim", tags=["yukim"])
FORTUNE_URL = os.getenv("FORTUNE_API_URL", "http://localhost:8001")


class YukimRequest(BaseModel):
    year:           int
    month:          int
    day:            int
    hour:           Optional[int] = 12
    gender:         str
    question_type:  str
    question_items: List[str]
    question_text:  Optional[str] = None
    mbti_type:      Optional[str] = None
    payment_key:    Optional[str] = None


@router.post("/calculate")
async def calculate(req: YukimRequest):
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{FORTUNE_URL}/api/yukim/calculate",
                json=req.model_dump(exclude={'payment_key'}),
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"육임 서비스 오류: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
