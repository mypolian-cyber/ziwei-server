from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx, uuid, os
from datetime import datetime
from app.database import SessionLocal, ZiweiPayment

router = APIRouter(prefix="/api/payment", tags=["payment"])

PORTONE_SECRET = os.getenv("PORTONE_SECRET_KEY", "")
PORTONE_STORE_ID = os.getenv("PORTONE_STORE_ID", "")

PRICE_YEAR  = int(os.getenv("PRICE_ZIWEI_YEAR", "1990"))
PRICE_YUKIM = int(os.getenv("PRICE_YUKIM", "1990"))

PRICES = {"ziwei_year": PRICE_YEAR, "yukim": PRICE_YUKIM}
NAMES  = {"ziwei_year": "자미두수 해별 운세", "yukim": "간절한 소망 하늘의 뜻은"}

class OrderReq(BaseModel):
    service_type: str
    cache_key: str = ""

class ConfirmReq(BaseModel):
    payment_id: str
    service_type: str
    cache_key: str = ""

@router.post("/order")
def create_order(req: OrderReq):
    if req.service_type not in PRICES:
        raise HTTPException(status_code=400, detail="유효하지 않은 서비스입니다.")
    merchant_uid = f"ziwei-{req.service_type.replace("_", "-")}-{uuid.uuid4().hex[:12]}"
    amount = PRICES[req.service_type]
    db = SessionLocal()
    try:
        db.add(ZiweiPayment(order_id=merchant_uid, service_type=req.service_type,
                            amount=amount, cache_key=req.cache_key, status="pending"))
        db.commit()
    finally:
        db.close()
    return {
        "merchant_uid": merchant_uid,
        "amount": amount,
        "order_name": NAMES[req.service_type],
        "store_id": PORTONE_STORE_ID,
    }

@router.post("/confirm")
async def confirm(req: ConfirmReq):
    if req.service_type not in PRICES:
        raise HTTPException(status_code=400, detail="유효하지 않은 서비스입니다.")

    # 포트원 V2 결제 단건 조회
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(
            f"https://api.portone.io/payments/{req.payment_id}",
            headers={"Authorization": f"PortOne {PORTONE_SECRET}"}
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="포트원 결제 조회 실패")

    payment = r.json()
    if payment.get("status") != "PAID":
        raise HTTPException(status_code=400, detail=f"결제 미완료: {payment.get('status')}")

    paid_amount = payment.get("amount", {}).get("total", 0)
    if paid_amount != PRICES[req.service_type]:
        raise HTTPException(status_code=400, detail="결제 금액 불일치")

    merchant_uid = payment.get("merchantPaymentId", "")

    db = SessionLocal()
    try:
        pay = db.query(ZiweiPayment).filter(ZiweiPayment.order_id == merchant_uid).first()
        if pay:
            pay.payment_key = req.payment_id
            pay.status = "completed"
            pay.completed_at = datetime.utcnow()
            db.commit()
            cache_key = pay.cache_key
        else:
            cache_key = req.cache_key
    finally:
        db.close()

    return {"status": "completed", "payment_key": req.payment_id, "cache_key": cache_key}
