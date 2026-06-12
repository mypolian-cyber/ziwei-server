from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx, uuid, os
from datetime import datetime
from app.database import SessionLocal, ZiweiPayment

router = APIRouter(prefix="/api/payment", tags=["payment"])

TOSS_SECRET  = os.getenv("TOSS_SECRET_KEY", "")
PRICE_YEAR   = int(os.getenv("PRICE_ZIWEI_YEAR", "1990"))  # VAT포함 최종가
PRICE_DAY    = int(os.getenv("PRICE_ZIWEI_DAY",  "1990"))

PRICE_YUKIM = int(os.getenv("PRICE_YUKIM", "1990"))
PRICES = { "ziwei_year": PRICE_YEAR, "ziwei_day": PRICE_DAY, "yukim": PRICE_YUKIM }
NAMES  = { "ziwei_year": "자미두수 해별 운세", "ziwei_day": "자미두수 특정일 운세", "yukim": "간절한 소망 하늘의 뜻은",
 }


class OrderReq(BaseModel):
    service_type: str
    cache_key:    str = ""

class ConfirmReq(BaseModel):
    payment_key: str
    order_id:    str
    amount:      int


@router.post("/order")
def create_order(req: OrderReq):
    if req.service_type not in PRICES:
        raise HTTPException(status_code=400, detail="유효하지 않은 서비스입니다.")
    order_id = f"ziwei_{req.service_type}_{uuid.uuid4().hex[:12]}"
    amount   = PRICES[req.service_type]
    db = SessionLocal()
    try:
        db.add(ZiweiPayment(order_id=order_id, service_type=req.service_type,
                             amount=amount, cache_key=req.cache_key, status="pending"))
        db.commit()
    finally:
        db.close()
    return { "order_id": order_id, "amount": amount,
             "order_name": NAMES[req.service_type],
             "client_key": os.getenv("TOSS_CLIENT_KEY",""),
             "success_url": os.getenv("TOSS_SUCCESS_URL",""),
             "fail_url":    os.getenv("TOSS_FAIL_URL","") }


@router.post("/confirm")
async def confirm(req: ConfirmReq):
    db = SessionLocal()
    try:
        pay = db.query(ZiweiPayment).filter(ZiweiPayment.order_id==req.order_id).first()
        if not pay:
            raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")
        if pay.amount != req.amount:
            raise HTTPException(status_code=400, detail="결제 금액 불일치.")
        async with httpx.AsyncClient() as c:
            r = await c.post(
                "https://api.tosspayments.com/v1/payments/confirm",
                json={"paymentKey":req.payment_key,"orderId":req.order_id,"amount":req.amount},
                auth=(TOSS_SECRET,""), timeout=10.0,
            )
            if r.status_code != 200:
                raise HTTPException(status_code=400, detail=f"결제 승인 실패: {r.text}")
        pay.payment_key  = req.payment_key
        pay.status       = "completed"
        pay.completed_at = datetime.utcnow()
        db.commit()
        return {"status":"completed","payment_key":req.payment_key,"cache_key":pay.cache_key}
    finally:
        db.close()
