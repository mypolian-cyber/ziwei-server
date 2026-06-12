from sqlalchemy import create_engine, Column, String, Integer, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/ziwei")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ZiweiCache(Base):
    """명반 계산 결과 캐시 — MD5(year_month_day_hour_minute_gender)"""
    __tablename__ = "ziwei_cache"

    cache_key     = Column(String(32), primary_key=True)
    input_data    = Column(Text)        # 입력값 JSON
    mingban_data  = Column(Text)        # 명반 계산 결과 JSON
    created_at    = Column(DateTime, default=datetime.utcnow)


class ZiweiReadingCache(Base):
    """Claude 풀이문 캐시"""
    __tablename__ = "ziwei_reading_cache"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    cache_key     = Column(String(32), index=True)
    service_type  = Column(String(20))  # ziwei_free | ziwei_year | ziwei_life
    target_year   = Column(Integer)
    reading       = Column(Text)
    created_at    = Column(DateTime, default=datetime.utcnow)


class ZiweiPayment(Base):
    """결제 내역"""
    __tablename__ = "ziwei_payments"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    order_id      = Column(String(100), unique=True)   # ziwei_year_uuid
    payment_key   = Column(String(200))                # 토스 결제 키
    service_type  = Column(String(20))                 # ziwei_year | ziwei_life
    amount        = Column(Integer)                    # VAT 포함 금액 (원)
    status        = Column(String(20), default="pending")  # pending | completed | cancelled
    cache_key     = Column(String(32))
    created_at    = Column(DateTime, default=datetime.utcnow)
    completed_at  = Column(DateTime, nullable=True)


def init_db():
    """테이블 생성 — 서버 최초 실행 시 자동 호출"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI Depends용 DB 세션"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
