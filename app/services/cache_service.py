import json
from app.database import SessionLocal, ZiweiCache, ZiweiReadingCache


def get_mingban_cache(cache_key: str) -> dict | None:
    db = SessionLocal()
    try:
        row = db.query(ZiweiCache).filter(ZiweiCache.cache_key == cache_key).first()
        if row:
            return json.loads(row.mingban_data)
        return None
    finally:
        db.close()


def set_mingban_cache(cache_key: str, input_data: dict, mingban_data: dict):
    db = SessionLocal()
    try:
        row = ZiweiCache(
            cache_key=cache_key,
            input_data=json.dumps(input_data, ensure_ascii=False),
            mingban_data=json.dumps(mingban_data, ensure_ascii=False),
        )
        db.merge(row)
        db.commit()
    finally:
        db.close()


def get_reading_cache(cache_key: str, service_type: str, target_year: int) -> str | None:
    db = SessionLocal()
    try:
        row = db.query(ZiweiReadingCache).filter(
            ZiweiReadingCache.cache_key == cache_key,
            ZiweiReadingCache.service_type == service_type,
            ZiweiReadingCache.target_year == target_year,
        ).first()
        return row.reading if row else None
    finally:
        db.close()


def set_reading_cache(cache_key: str, service_type: str, target_year: int, reading: str):
    db = SessionLocal()
    try:
        row = ZiweiReadingCache(
            cache_key=cache_key,
            service_type=service_type,
            target_year=target_year,
            reading=reading,
        )
        db.add(row)
        db.commit()
    finally:
        db.close()
