"""문의하기 — 후아모 contact.py 구조 동일, Zoho SMTP"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(prefix="/api/contact", tags=["contact"])

class ContactRequest(BaseModel):
    name:    str
    email:   str
    subject: str
    message: str


@router.post("/send")
def send_contact(req: ContactRequest):
    # 입력값 검증
    if not req.name or not req.email or not req.message:
        raise HTTPException(status_code=400, detail="필수 항목을 입력해주세요")
    # 인젝션 공격 차단
    _patterns = ['sleep(', 'sysdate(', 'select ', 'union ', 'drop ', 'exec(', 'eval(', '<script', 'javascript:', 'benchmark(', 'insert ', '0x']
    _combined = f"{req.name} {req.email} {getattr(req, 'subject', '')} {req.message}".lower()
    if any(p in _combined for p in _patterns):
        raise HTTPException(status_code=400, detail="올바른 내용을 입력해주세요")
    if len(req.name) > 100 or len(req.message) > 2000 or len(req.email) > 200:
        raise HTTPException(status_code=400, detail="입력값이 너무 깁니다")
    smtp_host = os.getenv("SMTP_HOST", "smtp.zoho.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_pass:
        raise HTTPException(status_code=500, detail="이메일 설정이 없습니다.")

    try:
        msg = MIMEMultipart()
        msg["From"]    = smtp_user
        msg["To"]      = smtp_user
        msg["Subject"] = f"[자미두수 문의] {req.subject}"
        body = f"""보낸 사람: {req.name} <{req.email}>
제목: {req.subject}

{req.message}"""
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(smtp_host, smtp_port) as s:
            s.starttls()
            s.login(smtp_user, smtp_pass)
            s.send_message(msg)

        # 자동 답장
        reply = MIMEMultipart()
        reply["From"]    = smtp_user
        reply["To"]      = req.email
        reply["Subject"] = f"[자미두수] 문의가 접수되었습니다"
        reply.attach(MIMEText(
            f"{req.name}님, 문의가 접수되었습니다.\n\n빠른 시일 내에 답변드리겠습니다.\n\n— 자미두수 예언소",
            "plain", "utf-8"
        ))
        with smtplib.SMTP(smtp_host, smtp_port) as s:
            s.starttls()
            s.login(smtp_user, smtp_pass)
            s.send_message(reply)

        return {"status": "ok", "message": "문의가 접수되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이메일 전송 오류: {e}")
