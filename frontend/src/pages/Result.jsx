import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calcPaid } from '../services/api'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// GPT 결과를 섹션별로 파싱
function parseReading(text) {
  if (!text) return {}
  const sections = {}
  const keys = ['올해 총평', '재물운', '직업·사업운', '건강운', '인연·관계운', '월별 핵심 운세', '올해 한마디']
  keys.forEach((key, idx) => {
    const next = keys[idx + 1]
    const pattern = next
      ? new RegExp(`\\[${key}\\]([\\s\\S]*?)\\[${next}\\]`)
      : new RegExp(`\\[${key}\\]([\\s\\S]*)$`)
    const match = text.match(pattern)
    if (match) sections[key] = match[1].trim()
  })
  return sections
}

// 월별 운세 파싱
function parseMonthly(text) {
  if (!text) return []
  const months = []
  for (let m = 1; m <= 12; m++) {
    const pattern = new RegExp(`${m}월:\\s*([^\\n]+(?:\\n(?!\\d+월:)[^\\n]*)*)`)
    const match = text.match(pattern)
    if (match) months.push({ month: m, text: match[1].trim() })
  }
  return months
}

const SECTION_CONFIG = [
  { key:'올해 총평',    icon:'🌟', color:'#7c3aed', bg:'rgba(124,58,237,0.06)', border:'rgba(124,58,237,0.2)' },
  { key:'재물운',       icon:'💰', color:'#92600a', bg:'rgba(146,96,10,0.06)',  border:'rgba(146,96,10,0.2)' },
  { key:'직업·사업운', icon:'💼', color:'#1d4ed8', bg:'rgba(29,78,216,0.06)',  border:'rgba(29,78,216,0.2)' },
  { key:'건강운',       icon:'💚', color:'#166534', bg:'rgba(22,101,52,0.06)',  border:'rgba(22,101,52,0.2)' },
  { key:'인연·관계운', icon:'❤️', color:'#be123c', bg:'rgba(190,18,60,0.06)',  border:'rgba(190,18,60,0.2)' },
  { key:'올해 한마디',  icon:'✨', color:'#6b21a8', bg:'rgba(107,33,168,0.08)', border:'rgba(107,33,168,0.3)' },
]

export default function Result() {
  const nav = useNavigate()
  const [result,  setResult]  = useState(null)
  const [input,   setInput]   = useState(null)
  const [paid,    setPaid]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const r = sessionStorage.getItem('ziwei_result')
    const i = sessionStorage.getItem('ziwei_input')
    if (!r || !i) { nav('/'); return }
    const parsedResult = JSON.parse(r)
    const parsedInput  = JSON.parse(i)
    setResult(parsedResult)
    setInput(parsedInput)

    // 결제 후 복귀
    const payKey   = sessionStorage.getItem('payment_key')
    const cacheKey = sessionStorage.getItem('cache_key')
    const svcType  = sessionStorage.getItem('pending_service')
    if (payKey && cacheKey && svcType) {
      fetchPaid(parsedInput, svcType, payKey)
      sessionStorage.removeItem('payment_key')
      sessionStorage.removeItem('cache_key')
      sessionStorage.removeItem('pending_service')
    }
  }, [])

  async function fetchPaid(inp, svcType, payKey) {
    setLoading(true)
    try {
      const { calcPaid } = await import('../services/api')
      const full = await calcPaid({ ...inp, current_year: selectedYear }, svcType, payKey)
      setPaid({ reading: full.reading, service_type: svcType })
    } catch(e) {
      alert('운세 불러오기 오류: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleTest() {
    setLoading(true)
    try {
      const { default: axios } = await import('axios')
      const { data } = await axios.post('/api/ziwei/calculate', {
        ...input, service_type: 'ziwei_year',
        payment_key: 'test_skip', current_year: selectedYear,
      })
      setPaid({ reading: data.reading, service_type: 'ziwei_year' })
    } catch(e) {
      alert('오류: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSavePdf() {
    const el = document.getElementById('result-content')
    if (!el) return
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth  = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth  = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    const today = new Date()
    const fname = `ziwei_${today.getFullYear()}_${selectedYear}.pdf`
    pdf.save(fname)
  }

  function handlePrint() {
    window.print()
  }

  if (!result) return null

  const mb      = result.mingban
  const ln      = mb.liunian
  const dx      = mb.currentDaxian
  const sections = parseReading(paid?.reading)
  const monthly  = parseMonthly(sections['월별 핵심 운세'])

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* 상단바 */}
        <div style={s.bar}>
          <button onClick={() => nav('/')} style={s.backBtn}>← 다시 입력</button>
          <span style={s.barTitle}>紫微命盤</span>
          <div style={{ width:60 }} />
        </div>

        <div style={s.body}>

          {/* 명반 요약 */}
          <div style={s.summaryGrid}>
            {[
              { label:'명궁', value: mb.mingGongZhi },
              { label:'오행국', value: mb.wuXingJu },
              { label:'현재 대한', value: `${dx.ageStart}~${dx.ageEnd}세` },
            ].map(item => (
              <div key={item.label} style={s.summaryCard}>
                <div style={s.summaryLabel}>{item.label}</div>
                <div style={s.summaryValue}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* 유년 사화 */}
          <div style={s.sectionBox}>
            <div style={s.sectionTitle}>🔮 {ln.year}년 사화 흐름</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {Object.entries(ln.siHuaKr).map(([star, sihua]) => (
                <div key={star} style={{
                  ...s.sihuaCard,
                  background: sihua==='화기' ? 'rgba(220,38,38,0.06)' : 'rgba(124,58,237,0.05)',
                  borderColor: sihua==='화기' ? 'rgba(220,38,38,0.25)' : 'rgba(124,58,237,0.2)',
                }}>
                  <span style={{ fontSize:13, color: sihua==='화기' ? '#dc2626' : '#7c3aed', fontWeight:500 }}>{star}</span>
                  <span style={{ fontSize:12, color:'#555' }}>{sihua}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 결제 전 — 연도 선택 + 버튼 */}
          {!paid && !loading && (
            <div style={s.paySection}>
              <select style={s.yearSelect}
                value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                {[2026,2027,2028,2029,2030].map(y => (
                  <option key={y} value={y}>{y}년 운세</option>
                ))}
              </select>
              <button onClick={() => setShowPay(true)} style={s.payBtn}>
                🌙 해별 운세 전체 보기 — 1,990원
              </button>
              <button onClick={handleTest} style={s.testBtn}>
                테스트
              </button>
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <p style={{ color:'#666', fontSize:14 }}>GPT-4o가 직언 중...</p>
            </div>
          )}

          {/* 유료 결과 */}
          {paid && !loading && (
            <>
              <div style={s.actionRow} className="actionRow">
                <button onClick={handlePrint} style={{...s.actionBtn, ...s.actionPrint}}>🖨️ 인쇄</button>
                <button onClick={handleSavePdf} style={{...s.actionBtn, ...s.actionPdf}}>📄 PDF 저장</button>
              </div>
              <div id="result-content">
              {/* 섹션별 카드 */}
              {SECTION_CONFIG.filter(sc => sc.key !== '월별 핵심 운세').map(sc => (
                sections[sc.key] ? (
                  <div key={sc.key} style={{ ...s.resultSection, background: sc.bg, borderColor: sc.border }}>
                    <div style={{ ...s.resultSectionTitle, color: sc.color }}>
                      {sc.icon} {sc.key}
                    </div>
                    <p style={s.resultText}>{sections[sc.key]}</p>
                  </div>
                ) : null
              ))}

              {/* 월별 핵심 운세 */}
              {monthly.length > 0 && (
                <div style={s.monthlyWrap}>
                  <div style={s.sectionTitle}>📅 월별 핵심 운세</div>
                  {monthly.map(m => (
                    <div key={m.month} style={s.monthRow}>
                      <div style={s.monthBadge}>{m.month}월</div>
                      <div style={s.monthText}>{m.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 올해 한마디 */}
              {sections['올해 한마디'] && (
                <div style={s.finalCard}>
                  <div style={{ fontSize:11, color:'#9333ea', marginBottom:6, letterSpacing:'0.1em' }}>올해 한마디</div>
                  <p style={{ fontSize:15, fontWeight:500, color:'#1a1a1a', lineHeight:1.7, margin:0 }}>
                    {sections['올해 한마디']}
                  </p>
                </div>
              )}

              </div>
              <button onClick={() => nav('/')} style={{ ...s.payBtn, marginTop:16, background:'#555' }}>
                홈으로
              </button>
            </>
          )}

        </div>
      </div>

      {showPay && (
        <PayModal
          cacheKey={result.cache_key}
          input={{ ...input, current_year: selectedYear }}
          onClose={() => setShowPay(false)}
          onSuccess={(payKey) => {
            setShowPay(false)
            fetchPaid(input, 'ziwei_year', payKey)
          }}
        />
      )}
    </div>
  )
}

function PayModal({ cacheKey, input, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function pay() {
    setLoading(true)
    try {
      const { default: axios } = await import('axios')
      const { data: order } = await axios.post('/api/payment/order', {
        service_type: 'ziwei_year', cache_key: cacheKey
      })
      sessionStorage.setItem('ziwei_input', JSON.stringify(input))
      sessionStorage.setItem('pending_service', 'ziwei_year')
      sessionStorage.setItem('pending_cache_key', cacheKey)

      const toss = await loadToss(order.client_key)
      await toss.requestPayment('카드', {
        amount: order.amount, orderId: order.order_id,
        orderName: order.order_name,
        successUrl: order.success_url, failUrl: order.fail_url,
      })
    } catch(e) {
      setErr('결제 오류: ' + (e.message || '다시 시도해주세요.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.6)',
                  display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ width:'100%', maxWidth:480, background:'#fff',
                    borderRadius:'20px 20px 0 0', padding:'28px 20px 40px' }}>
        <div style={{ width:40, height:4, background:'#e5e5e5', borderRadius:2, margin:'0 auto 24px' }} />
        <p style={{ fontSize:16, fontWeight:500, textAlign:'center', marginBottom:6 }}>해별 운세 전체 보기</p>
        <p style={{ fontSize:13, color:'#777', textAlign:'center', marginBottom:24 }}>12달 월별 직언 + 재물·직업·건강·인연 분석</p>
        {err && <p style={{ color:'#dc2626', fontSize:12, textAlign:'center', marginBottom:12 }}>{err}</p>}
        <button onClick={pay} disabled={loading} style={s.payBtn}>
          {loading ? '처리 중...' : '1,990원 결제하기'}
        </button>
      </div>
    </div>
  )
}

function loadToss(clientKey) {
  return new Promise((resolve, reject) => {
    if (window.TossPayments) return resolve(window.TossPayments(clientKey))
    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v1/payment'
    script.onload = () => resolve(window.TossPayments(clientKey))
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const s = {
  page:       { minHeight:'100vh', background:'#f0f0f0', display:'flex', justifyContent:'center' },
  card:       { width:'100%', maxWidth:480, minHeight:'100vh', background:'#fff', fontFamily:"'Noto Sans KR',sans-serif" },
  bar:        { background:'#1a0a2e', padding:'11px 16px 9px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  backBtn:    { background:'transparent', border:'none', color:'rgba(212,187,255,0.8)', fontSize:13, cursor:'pointer' },
  barTitle:   { fontSize:15, fontWeight:500, color:'#c9a84c', letterSpacing:'0.1em' },
  body:       { padding:'16px 16px 40px' },
  summaryGrid:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 },
  summaryCard:{ background:'#f7f7f7', border:'1px solid #e5e5e5', borderRadius:10, padding:'10px 6px', textAlign:'center' },
  summaryLabel:{ fontSize:10, color:'#999', marginBottom:4 },
  summaryValue:{ fontSize:14, fontWeight:500, color:'#1a0a2e' },
  sectionBox: { background:'#f7f7f7', border:'1px solid #e5e5e5', borderRadius:12, padding:'14px', marginBottom:14 },
  sectionTitle:{ fontSize:13, fontWeight:500, color:'#333', marginBottom:10 },
  sihuaCard:  { border:'1px solid', borderRadius:8, padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  paySection: { display:'flex', flexDirection:'column', gap:8, marginBottom:16 },
  yearSelect: { width:'100%', padding:'9px 12px', background:'#f7f7f7', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, color:'#1a1a1a', outline:'none' },
  payBtn:     { width:'100%', padding:'13px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#c026d3)', border:'none', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer' },
  actionRow:  { display:'flex', gap:8, marginBottom:12 },
  actionBtn:  { flex:1, padding:'11px', borderRadius:10, border:'none', fontSize:12.5, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 },
  actionPrint: { background:'#CECBF6', color:'#3C3489' },
  actionPdf:   { background:'#F4C0D1', color:'#993556' },
  testBtn:    { width:'100%', padding:'9px', borderRadius:8, background:'#888', border:'none', color:'#fff', fontSize:12, cursor:'pointer' },
  loadingBox: { textAlign:'center', padding:'40px 0' },
  spinner:    { width:32, height:32, border:'3px solid #e5e5e5', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 14px' },
  resultSection: { border:'1px solid', borderRadius:12, padding:'14px 16px', marginBottom:12 },
  resultSectionTitle: { fontSize:13, fontWeight:600, marginBottom:8 },
  resultText: { fontSize:13, color:'#333', lineHeight:1.9, margin:0 },
  monthlyWrap:{ background:'#f7f7f7', border:'1px solid #e5e5e5', borderRadius:12, padding:'14px', marginBottom:12 },
  monthRow:   { display:'flex', gap:10, alignItems:'flex-start', paddingBottom:10, marginBottom:10, borderBottom:'1px solid #f0f0f0' },
  monthBadge: { flexShrink:0, width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#c026d3)', color:'#fff', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center' },
  monthText:  { fontSize:13, color:'#333', lineHeight:1.8, flex:1 },
  finalCard:  { background:'rgba(147,51,234,0.06)', border:'1px solid rgba(147,51,234,0.25)', borderRadius:12, padding:'16px', marginBottom:12, textAlign:'center' },
}
