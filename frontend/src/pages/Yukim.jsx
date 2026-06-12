import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const QUESTION_TYPES = [
  { type:"사업/직업", emoji:"💼", items:["취업/이직","사업 시작","계약/거래","승진/발령","창업"] },
  { type:"연애/결혼", emoji:"❤️", items:["새로운 만남","고백/프로포즈","결혼","재회","이별 후 관계"] },
  { type:"재물/투자", emoji:"💰", items:["투자/주식","부동산","대출/돈 빌리기","복권/횡재","빚 해결"] },
  { type:"시험/학업", emoji:"📚", items:["시험 합격","입학/입시","자격증","유학","학업 성취"] },
  { type:"건강",     emoji:"💪", items:["병 완치","수술 결과","건강 회복","임신/출산","다이어트"] },
  { type:"이사/여행", emoji:"🏠", items:["이사","해외여행","이민","귀향","집 구매"] },
]

const SECTION_CONFIG = [
  { key:"🔍 지금 이 상황",          icon:"🔍", title:"지금 이 상황",          color:"#7c3aed", bg:"rgba(124,58,237,0.06)", border:"rgba(124,58,237,0.2)" },
  { key:"🌀 앞으로의 전개",          icon:"🌀", title:"앞으로의 전개",          color:"#1d4ed8", bg:"rgba(29,78,216,0.06)",  border:"rgba(29,78,216,0.2)" },
  { key:"✨ 결론과 방향",            icon:"✨", title:"결론과 방향",            color:"#be123c", bg:"rgba(190,18,60,0.06)",  border:"rgba(190,18,60,0.2)" },
  { key:"⚡ 지금 당장 해야 할 것",    icon:"⚡", title:"지금 당장 해야 할 것",    color:"#92600a", bg:"rgba(146,96,10,0.06)",  border:"rgba(146,96,10,0.2)" },
  { key:"🕐 타이밍",                 icon:"🕐", title:"타이밍",                 color:"#166534", bg:"rgba(22,101,52,0.06)",  border:"rgba(22,101,52,0.2)" },
  { key:"💡 이 시기를 잘 보내는 법", icon:"💡", title:"이 시기를 잘 보내는 법", color:"#0891b2", bg:"rgba(8,145,178,0.06)",  border:"rgba(8,145,178,0.2)" },
  { key:"🌟 마무리",                 icon:"🌟", title:"마무리",                 color:"#6b21a8", bg:"rgba(107,33,168,0.08)", border:"rgba(107,33,168,0.3)" },
]

function parseYukimReading(text) {
  if (!text) return { intro:"", sections:{} }
  const keys = SECTION_CONFIG.map(s => s.key)
  const firstIdx = text.indexOf(keys[0])
  const intro = firstIdx > -1 ? text.slice(0, firstIdx).trim() : ""

  const sections = {}
  for (let i = 0; i < keys.length; i++) {
    const start = text.indexOf(keys[i])
    if (start === -1) continue
    const contentStart = start + keys[i].length
    let end = text.length
    for (let j = i + 1; j < keys.length; j++) {
      const nextStart = text.indexOf(keys[j])
      if (nextStart > -1) { end = nextStart; break }
    }
    sections[keys[i]] = text.slice(contentStart, end).trim()
  }
  return { intro, sections }
}

function loadToss(clientKey) {
  return new Promise((resolve, reject) => {
    if (window.TossPayments) return resolve(window.TossPayments(clientKey))
    const script = document.createElement("script")
    script.src = "https://js.tosspayments.com/v1/payment"
    script.onload = () => resolve(window.TossPayments(clientKey))
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function Yukim() {
  const nav = useNavigate()
  const [selectedType,  setSelectedType]  = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [questionText,  setQuestionText]  = useState("")
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState("")
  const [result,        setResult]        = useState(null)

  const input = JSON.parse(sessionStorage.getItem("ziwei_input") || "{}")

  React.useEffect(() => {
    const payKey  = sessionStorage.getItem("yukim_payment_key")
    const pending = sessionStorage.getItem("yukim_pending")
    const q       = sessionStorage.getItem("yukim_question")
    if (payKey && pending && q) {
      sessionStorage.removeItem("yukim_payment_key")
      sessionStorage.removeItem("yukim_pending")
      sessionStorage.removeItem("yukim_question")
      setLoading(true)
      axios.post("/api/yukim/calculate", { ...JSON.parse(q), payment_key: payKey })
        .then(({ data }) => setResult(data))
        .catch(() => setError("오류가 발생했습니다. 다시 시도해주세요."))
        .finally(() => setLoading(false))
    }
  }, [])

  function toggleItem(item) {
    setSelectedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  function buildQuestion() {
    return {
      year:           input.year  || new Date().getFullYear(),
      month:          input.month || new Date().getMonth() + 1,
      day:            input.day   || new Date().getDate(),
      hour:           input.hour  ?? 12,
      gender:         input.is_male ? "남성" : "여성",
      question_type:  selectedType,
      question_items: selectedItems,
      question_text:  questionText || selectedType + " - " + selectedItems.join(", "),
    }
  }

  async function handleAsk() {
    if (!selectedType)         return setError("질문 유형을 선택해주세요.")
    if (!selectedItems.length) return setError("세부 항목을 하나 이상 선택해주세요.")
    setError("")
    setLoading(true)
    try {
      // 1) 결제 주문 생성
      const { data: order } = await axios.post("/api/payment/order", {
        service_type: "yukim", cache_key: ""
      })

      // 2) 질문 내용을 세션에 저장 (결제 후 복귀시 사용)
      sessionStorage.setItem("yukim_question", JSON.stringify(buildQuestion()))
      sessionStorage.setItem("yukim_pending", "1")

      // 3) 토스 결제 호출
      const toss = await loadToss(order.client_key)
      await toss.requestPayment("카드", {
        amount: order.amount, orderId: order.order_id,
        orderName: order.order_name,
        successUrl: order.success_url, failUrl: order.fail_url,
      })
    } catch(e) {
      setError("오류가 발생했습니다: " + (e.message || "다시 시도해주세요."))
      setLoading(false)
    }
  }

  if (result) {
    const { intro, sections } = parseYukimReading(result.reading)
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.bar}>
            <button onClick={() => setResult(null)} style={s.backBtn}>← 다시 묻기</button>
            <span style={s.barTitle}>간절한 소망 하늘의 뜻은</span>
            <div style={{ width:60 }} />
          </div>
          <div style={{ padding:"16px" }}>

            {intro && (
              <div style={s.introBox}>
                <p style={s.introText}>{intro}</p>
              </div>
            )}

            {SECTION_CONFIG.map(sc => (
              sections[sc.key] ? (
                <div key={sc.key} style={{ ...s.resultSection, background: sc.bg, borderColor: sc.border }}>
                  <div style={{ ...s.resultSectionTitle, color: sc.color }}>
                    {sc.icon} {sc.title}
                  </div>
                  <p style={s.resultText}>{sections[sc.key]}</p>
                </div>
              ) : null
            ))}

            {Object.keys(sections).length === 0 && (
              <div style={s.resultBox}>
                <div style={s.readingText}>{result.reading}</div>
              </div>
            )}

            <button onClick={() => nav("/")} style={{ ...s.btn, marginTop:8 }}>홈으로</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.bar}>
          <button onClick={() => nav(-1)} style={s.backBtn}>← 뒤로</button>
          <span style={s.barTitle}>간절한 소망 하늘의 뜻은</span>
          <div style={{ width:60 }} />
        </div>
        <div style={{ padding:"16px" }}>
          <p style={s.desc}>간절히 바라는 일, 하늘의 뜻을 물어보세요</p>

          <div style={s.sectionLabel}>어떤 일이 궁금하세요?</div>
          <div style={s.typeGrid}>
            {QUESTION_TYPES.map(q => (
              <button key={q.type}
                onClick={() => { setSelectedType(q.type); setSelectedItems([]) }}
                style={{ ...s.typeBtn, ...(selectedType===q.type ? s.typeBtnOn : {}) }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{q.emoji}</div>
                <div style={{ fontSize:12, fontWeight:500 }}>{q.type}</div>
              </button>
            ))}
          </div>

          {selectedType && (
            <>
              <div style={s.sectionLabel}>세부 항목 선택</div>
              <div style={s.itemWrap}>
                {QUESTION_TYPES.find(q => q.type===selectedType)?.items.map(item => (
                  <button key={item} onClick={() => toggleItem(item)}
                    style={{ ...s.itemBtn, ...(selectedItems.includes(item) ? s.itemBtnOn : {}) }}>
                    {item}
                  </button>
                ))}
              </div>
              <div style={s.sectionLabel}>더 구체적으로 (선택사항)</div>
              <input type="text"
                placeholder="예: 이번 면접에서 합격할 수 있을까요?"
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                style={s.input} />
            </>
          )}

          {error && <div style={s.errBox}>{error}</div>}

          {loading ? (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <p style={{ color:"#666", fontSize:14 }}>결제창으로 이동 중...</p>
            </div>
          ) : (
            <button onClick={handleAsk} style={s.btn}>
              🔮 1,990원 결제하고 하늘에 묻기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  page:        { minHeight:"100vh", background:"#f0f0f0", display:"flex", justifyContent:"center" },
  card:        { width:"100%", maxWidth:480, minHeight:"100vh", background:"#fff", fontFamily:"Noto Sans KR,sans-serif" },
  bar:         { background:"#1a0a2e", padding:"11px 16px 9px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  backBtn:     { background:"transparent", border:"none", color:"rgba(212,187,255,0.8)", fontSize:13, cursor:"pointer" },
  barTitle:    { fontSize:14, fontWeight:500, color:"#c9a84c", letterSpacing:"0.05em" },
  desc:        { fontSize:13, color:"#777", textAlign:"center", marginBottom:16 },
  sectionLabel:{ fontSize:12, fontWeight:500, color:"#444", marginBottom:8, marginTop:14 },
  typeGrid:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 },
  typeBtn:     { padding:"12px 8px", borderRadius:10, border:"1px solid #e5e5e5", background:"#f7f7f7", cursor:"pointer", textAlign:"center", color:"#333" },
  typeBtnOn:   { borderColor:"#7c3aed", background:"rgba(124,58,237,0.08)", color:"#7c3aed" },
  itemWrap:    { display:"flex", flexWrap:"wrap", gap:7, marginBottom:4 },
  itemBtn:     { padding:"7px 13px", borderRadius:20, border:"1px solid #e5e5e5", background:"#f7f7f7", cursor:"pointer", fontSize:12, color:"#444" },
  itemBtnOn:   { borderColor:"#c026d3", background:"rgba(192,38,211,0.08)", color:"#c026d3" },
  input:       { width:"100%", padding:"10px 12px", background:"#f7f7f7", border:"1px solid #e0e0e0", borderRadius:8, fontSize:13, color:"#1a1a1a", outline:"none", marginBottom:4, boxSizing:"border-box" },
  errBox:      { fontSize:12, color:"#a32d2d", background:"rgba(226,75,74,0.06)", border:"1px solid rgba(226,75,74,0.2)", borderRadius:7, padding:"7px 11px", marginBottom:8 },
  btn:         { width:"100%", padding:"12px", borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#c026d3)", border:"none", color:"#fff", fontSize:14, fontWeight:500, cursor:"pointer", marginTop:12 },
  loadingBox:  { textAlign:"center", padding:"30px 0" },
  spinner:     { width:32, height:32, border:"3px solid #e5e5e5", borderTopColor:"#7c3aed", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" },
  introBox:    { background:"rgba(124,58,237,0.04)", border:"1px solid rgba(124,58,237,0.15)", borderRadius:12, padding:"14px 16px", marginBottom:12, textAlign:"center" },
  introText:   { fontSize:14, fontWeight:500, color:"#5b21b6", margin:0, lineHeight:1.6 },
  resultSection: { border:"1px solid", borderRadius:12, padding:"14px 16px", marginBottom:12 },
  resultSectionTitle: { fontSize:13, fontWeight:600, marginBottom:8 },
  resultText:  { fontSize:13, color:"#333", lineHeight:1.9, margin:0, whiteSpace:"pre-wrap" },
  resultBox:   { background:"#f7f7f7", border:"1px solid #e5e5e5", borderRadius:12, padding:"20px 16px", marginBottom:16 },
  readingText: { fontSize:14, color:"#333", lineHeight:2, whiteSpace:"pre-wrap" },
}
