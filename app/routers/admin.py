from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, func, extract
from app.database import get_db, ZiweiCache, ZiweiPayment
from datetime import datetime, date
import os
import secrets
import csv
import io
import json

router = APIRouter()
security = HTTPBasic()

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "adelante2026")


def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    is_correct = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not is_correct:
        raise HTTPException(
            status_code=401,
            detail="비밀번호가 틀렸습니다",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: HTTPBasicCredentials = Depends(verify_admin)
):
    now = datetime.now()
    today = date.today()

    # 오늘 이용자
    today_result = db.execute(
        select(func.count()).where(
            func.date(ZiweiCache.created_at) == today
        )
    )
    today_count = today_result.scalar() or 0

    # 이번달 이용자
    month_result = db.execute(
        select(func.count()).where(
            extract('year',  ZiweiCache.created_at) == now.year,
            extract('month', ZiweiCache.created_at) == now.month,
        )
    )
    month_count = month_result.scalar() or 0

    # 전체 이용자
    total_result = db.execute(select(func.count()).select_from(ZiweiCache))
    total_count = total_result.scalar() or 0

    # input_data 전체 조회 (성별/연령 집계용)
    all_result = db.execute(select(ZiweiCache.input_data))
    all_rows = all_result.fetchall()

    gender_data = {"M": 0, "F": 0}
    age_groups = {"10대": 0, "20대": 0, "30대": 0, "40대": 0, "50대": 0, "60대+": 0}

    for (raw,) in all_rows:
        if not raw:
            continue
        try:
            d = json.loads(raw)
        except Exception:
            continue
        is_male = d.get("is_male")
        if is_male is True:
            gender_data["M"] += 1
        elif is_male is False:
            gender_data["F"] += 1

        birth_year = d.get("year")
        if birth_year:
            age = now.year - birth_year
            if age < 20:   age_groups["10대"] += 1
            elif age < 30: age_groups["20대"] += 1
            elif age < 40: age_groups["30대"] += 1
            elif age < 50: age_groups["40대"] += 1
            elif age < 60: age_groups["50대"] += 1
            else:          age_groups["60대+"] += 1

    # 서비스별 이용 (결제 완료 기준)
    service_result = db.execute(
        select(ZiweiPayment.service_type, func.count(), func.sum(ZiweiPayment.amount))
        .where(ZiweiPayment.status == "completed")
        .group_by(ZiweiPayment.service_type)
    )
    service_data = [
        {"type": r[0], "count": r[1], "amount": r[2] or 0}
        for r in service_result.fetchall()
    ]

    # 오늘 결제
    today_pay = db.execute(
        select(func.count(), func.sum(ZiweiPayment.amount))
        .where(
            ZiweiPayment.status == "completed",
            func.date(ZiweiPayment.created_at) == today
        )
    )
    today_pay_row = today_pay.fetchone()
    today_pay_count  = today_pay_row[0] or 0
    today_pay_amount = today_pay_row[1] or 0

    # 이번달 결제
    month_pay = db.execute(
        select(func.count(), func.sum(ZiweiPayment.amount))
        .where(
            ZiweiPayment.status == "completed",
            extract('year',  ZiweiPayment.created_at) == now.year,
            extract('month', ZiweiPayment.created_at) == now.month,
        )
    )
    month_pay_row = month_pay.fetchone()
    month_pay_count  = month_pay_row[0] or 0
    month_pay_amount = month_pay_row[1] or 0

    # 전체 결제
    total_pay = db.execute(
        select(func.count(), func.sum(ZiweiPayment.amount))
        .where(ZiweiPayment.status == "completed")
    )
    total_pay_row = total_pay.fetchone()
    total_pay_count  = total_pay_row[0] or 0
    total_pay_amount = total_pay_row[1] or 0

    return {
        "users": {
            "today": today_count,
            "month": month_count,
            "total": total_count,
        },
        "gender": gender_data,
        "age_groups": age_groups,
        "services": service_data,
        "payments": {
            "today":  {"count": today_pay_count,  "amount": today_pay_amount},
            "month":  {"count": month_pay_count,  "amount": month_pay_amount},
            "total":  {"count": total_pay_count,  "amount": total_pay_amount},
        }
    }


@router.get("/download/users")
def download_users(
    start: str = None,
    end: str = None,
    db: Session = Depends(get_db),
    _: HTTPBasicCredentials = Depends(verify_admin)
):
    """이용자 데이터 CSV 다운로드"""
    query = select(ZiweiCache)
    if start:
        query = query.where(ZiweiCache.created_at >= start)
    if end:
        query = query.where(ZiweiCache.created_at <= end + " 23:59:59")

    result = db.execute(query.order_by(ZiweiCache.created_at.desc()))
    rows = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["번호", "생년", "월", "일", "시", "성별", "이용일시"])

    for i, r in enumerate(rows, 1):
        try:
            d = json.loads(r.input_data) if r.input_data else {}
        except Exception:
            d = {}
        is_male = d.get("is_male")
        gender_label = "남성" if is_male is True else ("여성" if is_male is False else "-")
        writer.writerow([
            i,
            d.get("year", "-"),
            d.get("month", "-"),
            d.get("day", "-"),
            d.get("hour") if d.get("hour") is not None else "모름",
            gender_label,
            r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "-",
        ])

    output.seek(0)
    filename = f"ziwei_users_{start or 'all'}_{end or 'all'}.csv"
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/download/payments")
def download_payments(
    start: str = None,
    end: str = None,
    db: Session = Depends(get_db),
    _: HTTPBasicCredentials = Depends(verify_admin)
):
    """결제 데이터 CSV 다운로드"""
    query = select(ZiweiPayment).where(ZiweiPayment.status == "completed")

    if start:
        query = query.where(ZiweiPayment.created_at >= start)
    if end:
        query = query.where(ZiweiPayment.created_at <= end + " 23:59:59")

    result = db.execute(query.order_by(ZiweiPayment.created_at.desc()))
    rows = result.scalars().all()

    service_names = {
        "ziwei_year": "해별 운세",
        "ziwei_life": "평생 운세",
        "yukim":      "간절한 소망 하늘의 뜻은",
    }

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["번호", "서비스", "금액", "결제일시", "주문ID"])

    for i, r in enumerate(rows, 1):
        writer.writerow([
            i,
            service_names.get(r.service_type, r.service_type),
            f"{r.amount:,}원",
            r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "-",
            r.order_id or "-",
        ])

    output.seek(0)
    filename = f"ziwei_payments_{start or 'all'}_{end or 'all'}.csv"
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
