import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendContact } from '../services/api'

export default function Contact() {
  const nav = useNavigate()
  const [form, setForm] = useState({ name:'', email:'', subject:'', message:'' })
  const [status, setStatus] = useState('')

  function set(k, v) { setForm(f => ({...f, [k]:v})) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name||!form.email||!form.subject||!form.message)
      return alert('모든 항목을 입력해주세요.')
    setStatus('loading')
    try {
      await sendContact(form)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.bar}>
          <button onClick={() => nav(-1)} style={s.backBtn}>← 뒤로</button>
          <span style={s.barTitle}>문의하기</span>
          <div style={{ width:60 }} />
        </div>
        <div style={s.body}>
          <p style={s.desc}>궁금한 점이 있으시면 편하게 문의해 주세요</p>
          {status === 'done' ? (
            <div style={s.doneBox}>
              <div style={{ fontSize:40, marginBottom:16 }}>✉️</div>
              <p style={s.doneTitle}>문의가 접수되었습니다</p>
              <p style={s.doneSub}>입력하신 이메일로 답변을 드리겠습니다</p>
              <button onClick={() => nav('/')} style={s.btn}>홈으로 돌아가기</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={s.form}>
              {[
                { key:'name',    label:'이름',   placeholder:'이름을 입력해주세요', type:'text' },
                { key:'email',   label:'이메일', placeholder:'답변 받으실 이메일', type:'email' },
                { key:'subject', label:'제목',   placeholder:'문의 제목',          type:'text' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom:14 }}>
                  <label style={s.label}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                    style={s.input} />
                </div>
              ))}
              <div style={{ marginBottom:20 }}>
                <label style={s.label}>문의 내용</label>
                <textarea placeholder="문의 내용을 입력해주세요"
                  value={form.message} onChange={e => set('message', e.target.value)}
                  rows={5} style={{ ...s.input, resize:'vertical', minHeight:120 }} />
              </div>
              {status === 'error' && (
                <p style={{ color:'#a32d2d', fontSize:13, marginBottom:12 }}>
                  전송 오류가 발생했습니다. 다시 시도해주세요.
                </p>
              )}
              <button type="submit" disabled={status==='loading'} style={s.btn}>
                {status==='loading' ? '전송 중...' : '문의 보내기'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight:'100vh', background:'#f0f0f0',
    display:'flex', justifyContent:'center', alignItems:'flex-start',
  },
  card: {
    width:'100%', maxWidth:480, minHeight:'100vh',
    background:'#ffffff', display:'flex', flexDirection:'column',
    fontFamily:"'Noto Sans KR', sans-serif",
  },
  bar: {
    background:'#1a0a2e', padding:'11px 16px 9px',
    display:'flex', alignItems:'center', justifyContent:'space-between',
  },
  backBtn: {
    background:'transparent', border:'none',
    color:'rgba(212,187,255,0.8)', fontSize:13, cursor:'pointer',
  },
  barTitle: { fontSize:15, fontWeight:500, color:'#c9a84c', letterSpacing:'0.08em' },
  body: { padding:'24px 20px', flex:1 },
  desc: { fontSize:13, color:'#777', textAlign:'center', marginBottom:24 },
  form: {
    background:'#f7f7f7', border:'1px solid #e5e5e5',
    borderRadius:14, padding:'24px 20px',
  },
  label: { display:'block', fontSize:13, fontWeight:500, color:'#333', marginBottom:5 },
  input: {
    width:'100%', padding:'10px 12px',
    background:'#ffffff', border:'1px solid #e0e0e0',
    borderRadius:8, fontSize:13, color:'#1a1a1a', outline:'none',
  },
  btn: {
    width:'100%', padding:'12px', borderRadius:10,
    background:'linear-gradient(135deg,#7c3aed,#c026d3)',
    border:'none', color:'#fff', fontSize:14,
    fontWeight:500, cursor:'pointer',
  },
  doneBox: {
    background:'#f0fdf4', border:'1px solid #bbf7d0',
    borderRadius:14, padding:'40px 24px', textAlign:'center',
  },
  doneTitle: { color:'#166534', fontSize:16, fontWeight:500, marginBottom:8 },
  doneSub: { color:'#555', fontSize:13, marginBottom:24 },
}
