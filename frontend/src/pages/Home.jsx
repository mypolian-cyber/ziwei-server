import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { createOrder, calcTest } from '../services/api'

const HOURS = [
  '자시 (23:30~01:29)', '축시 (01:30~03:29)', '인시 (03:30~05:29)', '묘시 (05:30~07:29)',
  '진시 (07:30~09:29)', '사시 (09:30~11:29)', '오시 (11:30~13:29)', '미시 (13:30~15:29)',
  '신시 (15:30~17:29)', '유시 (17:30~19:29)', '술시 (19:30~21:29)', '해시 (21:30~23:29)',
]

const LINKS = [
  { icon:'🌡️', name:'히트맵',     sub:'데이터 시각화',      url:'https://heatmap.adelante-properties.com', bg:'#FAC775', color:'#854F0B' },
  { icon:'▶️', name:'YPP 도전자', sub:'유튜브 수익화 모임', url:'https://cafe.naver.com/brownn3b6d', bg:'#F7C1C1', color:'#A32D2D' },
]

export default function Home() {
  const nav = useNavigate()
  const [form, setForm] = useState({ year:'', month:'', day:'', hour:'', is_male:'', calendar:'solar', is_leap:false })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [dday, setDday] = useState('')
  const [loadingMsg, setLoadingMsg] = useState(0)

  const LOADING_MESSAGES = [
    '사주를 분석하고 있어요',
    '명반을 그리는 중이에요',
    '운세를 정리하고 있어요',
    '거의 다 됐어요',
  ]

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingMsg(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [loading])
  const [betaMode, setBetaMode] = useState(false)

  useEffect(() => {
    axios.get('/api/config').then(({data}) => setBetaMode(data.beta_mode)).catch(()=>{})
  }, [])

  useEffect(() => {
    function calc() {
      const target = new Date('2026-11-19')
      target.setHours(0,0,0,0)
      const today = new Date()
      today.setHours(0,0,0,0)
      const diff = Math.ceil((target - today) / (1000*60*60*24))
      if (diff > 0) setDday('D-' + diff)
      else if (diff === 0) setDday('D-Day')
      else setDday('완료')
    }
    calc()
    const timer = setInterval(calc, 1000*60*60)
    return () => clearInterval(timer)
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    if (!form.year || !form.month || !form.day) return '생년월일을 입력해주세요.'
    if (form.hour === '') return '태어난 시(時)를 선택해주세요.'
    if (form.is_male === '') return '성별을 선택해주세요.'
    return null
  }

  function buildInput() {
    const today = new Date()
    return {
      year: Number(form.year), month: Number(form.month),
      day: Number(form.day), hour: Number(form.hour),
      is_male: form.is_male === 'true',
      current_year: selectedYear,
      age: today.getFullYear() - Number(form.year),
      calendar: form.calendar,
      is_leap: form.is_leap,
    }
  }

  async function handlePay(serviceType) {
    const errMsg = validate()
    if (errMsg) return setErr(errMsg)
    setErr('')
    setLoading(serviceType)
    try {
      const input = buildInput()

      if (betaMode) {
        // 베타: 결제 없이 바로 결과
        const result = await calcTest(input, serviceType)
        sessionStorage.setItem('ziwei_result', JSON.stringify(result))
        sessionStorage.setItem('ziwei_input', JSON.stringify(input))
        sessionStorage.setItem('payment_key', 'test_skip')
        sessionStorage.setItem('cache_key', result.cache_key)
        sessionStorage.setItem('pending_service', serviceType)
        nav('/result')
        return
      }

      const cacheRes = await calcTest(input, 'ziwei_free')
      const order = await createOrder(serviceType, cacheRes.cache_key)
      sessionStorage.setItem('ziwei_input', JSON.stringify(input))
      sessionStorage.setItem('ziwei_result', JSON.stringify(cacheRes))
      sessionStorage.setItem('pending_service', serviceType)
      sessionStorage.setItem('pending_cache_key', cacheRes.cache_key)

      const toss = await loadToss(order.client_key)
      await toss.requestPayment('카드', {
        amount: order.amount, orderId: order.order_id,
        orderName: order.order_name,
        successUrl: order.success_url, failUrl: order.fail_url,
      })
    } catch(e) {
      setErr('오류: ' + (e.message || '다시 시도해주세요.'))
      setLoading(null)
    }
  }

  async function handleTest(serviceType) {
    const errMsg = validate()
    if (errMsg) return setErr(errMsg)
    setErr('')
    setLoading(serviceType)
    try {
      const input = buildInput()
      const result = await calcTest(input, serviceType)
      sessionStorage.setItem('ziwei_result', JSON.stringify(result))
      sessionStorage.setItem('ziwei_input', JSON.stringify(input))
      if (serviceType === 'ziwei_year') {
        sessionStorage.setItem('payment_key', 'test_skip')
        sessionStorage.setItem('cache_key', result.cache_key)
        sessionStorage.setItem('pending_service', 'ziwei_year')
      }
      nav('/result')
    } catch(e) {
      setErr('오류: ' + (e.message || '다시 시도해주세요.'))
    } finally {
      setLoading(null)
    }
  }

  function handleYukim() {
    const errMsg = validate()
    if (errMsg) return setErr(errMsg)
    setErr('')
    sessionStorage.setItem('ziwei_input', JSON.stringify(buildInput()))
    nav('/yukim')
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.bar}>
          <span style={s.barTitle}>紫微斗數 예언소</span>
          <button onClick={() => nav('/contact')} style={s.barBtn}>✉ 문의하기</button>
        </div>

        <div style={s.hero}>
          <div style={s.heroRow}>
            <div style={s.starBadge}>✦</div>
            <div>
              <div style={s.heroH1}>애매한 운세는 없다<br/>확실한 답만 드립니다</div>
              
            </div>
          </div>
          <div style={s.heroTags}>
            <span style={s.heroTag}>📅 월별 직언</span>
            <span style={s.heroTag}>⚡ 즉시 확인</span>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionLabel}>📅 생년월일</div>
          <div style={s.calRow}>
            <button onClick={() => set('calendar','solar')}
              style={{ ...s.calBtn, ...(form.calendar==='solar' ? s.calBtnOn : {}) }}>양력</button>
            <button onClick={() => set('calendar','lunar')}
              style={{ ...s.calBtn, ...(form.calendar==='lunar' ? s.calBtnOn : {}) }}>음력</button>
            {form.calendar === 'lunar' && (
              <label style={s.leapLabel}>
                <input type="checkbox" checked={form.is_leap}
                  onChange={e => set('is_leap', e.target.checked)}
                  style={{ marginRight:4 }} />
                윤달
              </label>
            )}
          </div>
          <div style={s.row3}>
            <input type="number" placeholder="출생 연도" value={form.year}
              onChange={e => set('year', e.target.value)} style={s.input} />
            <select value={form.month} onChange={e => set('month', e.target.value)} style={s.input}>
              <option value="">월</option>
              {Array.from({length:12},(_,i) => <option key={i+1} value={i+1}>{i+1}월</option>)}
            </select>
            <select value={form.day} onChange={e => set('day', e.target.value)} style={s.input}>
              <option value="">일</option>
              {Array.from({length:31},(_,i) => <option key={i+1} value={i+1}>{i+1}일</option>)}
            </select>
          </div>

          <div style={s.sectionLabel}>🕐 태어난 시(時) <span style={s.req}>필수</span></div>
          <select value={form.hour} onChange={e => set('hour', e.target.value)}
            style={{ ...s.input, width:'100%', marginBottom:7 }}>
            <option value="">시주 선택 (자시 ~ 해시)</option>
            {HOURS.map((h,i) => <option key={i} value={i}>{h}</option>)}
          </select>

          <div style={s.sectionLabel}>👤 성별</div>
          <div style={s.row2}>
            <button onClick={() => set('is_male','false')}
              style={{ ...s.genderBtn, ...(form.is_male==='false' ? s.genderBtnOn : {}) }}>
              여성 ♀
            </button>
            <button onClick={() => set('is_male','true')}
              style={{ ...s.genderBtn, ...(form.is_male==='true' ? s.genderBtnOnMale : {}) }}>
              남성 ♂
            </button>
          </div>
        </div>

        <div style={s.divider} />

        <div style={s.svcSection}>
          <div style={s.svcSectionLabel}>🌟 운세 서비스</div>

          {err && <div style={s.errBox}>{err}</div>}

          <div style={s.svcRow}>
            <div style={s.svcCardFeatured}>
              <div style={s.featuredBadge}>인기</div>
              <div style={s.svcIconMoon}>🌙</div>
              <div style={s.svcName}>해별 운세</div>
              <div style={s.svcDesc}>올해 12달, 월별 직설 분석</div>
              <div style={s.svcPrice}>1,990<span style={s.unit}>원</span></div>
              <select style={{ ...s.input, fontSize:10, padding:'6px 7px', marginBottom:6 }}
                value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                {[2026,2027,2028,2029,2030].map(y => (
                  <option key={y} value={y}>{y}년 운세</option>
                ))}
              </select>
              <div style={{ flex:1 }} />
              <button style={s.ctaBtn} onClick={() => handlePay('ziwei_year')} disabled={!!loading}>
                {loading==='ziwei_year' ? '처리 중...' : '결제하기'}
              </button>

            </div>

            <div style={s.svcCard}>
              <div style={s.svcIconPray}>🙏</div>
              <div style={s.svcName}>간절한 소망<br/>하늘의 뜻은</div>
              <div style={s.svcDesc}>지금 묻고 싶은 일의 결과는?</div>
              <div style={s.svcPrice}>1,990<span style={s.unit}>원</span></div>
              <div style={{ flex:1 }} />
              <button style={s.ctaBtnOutline} onClick={handleYukim}>
                하늘에 묻기
              </button>
            </div>
          </div>
        </div>

        <div style={s.ddayBox}>
          <div style={s.ddayIcon}>🎓</div>
          <div style={{ flex:1 }}>
            <div style={s.ddayTitle}>수능 잘 보시길 기원합니다</div>
            <div style={s.ddaySub}>2027학년도 수능 · 2026.11.19</div>
          </div>
          <div style={s.ddayCount}>{dday}</div>
        </div>

        <div style={s.linkGrid}>
          {LINKS.map(l => (
            <a key={l.name} href={l.url} target="_blank" rel="noreferrer" style={s.linkItem}>
              <div style={{ ...s.linkIcon, background:l.bg, color:l.color }}>{l.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={s.linkName}>{l.name}</div>
                <div style={s.linkSub}>{l.sub}</div>
              </div>
              <span style={s.linkArrow}>↗</span>
            </a>
          ))}
        </div>

        <div style={s.footer}>
          Adelante Inc. · info@adelante-properties.com<br/>
          <a href="/privacy" style={{ color:'#999', textDecoration:'underline' }}>개인정보처리방침 · 이용약관 · 사업자정보</a>
        </div>

        {loading && (
          <div style={s.loadingOverlay}>
            <div style={s.orb}><div style={s.orbRing} /></div>
            <div style={s.loadingTitle}>하늘의 기운을 읽는 중...</div>
            <div style={s.loadingSub}>{LOADING_MESSAGES[loadingMsg]}</div>
          </div>
        )}

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
  page: { minHeight:'100vh', background:'#f0f0f0', display:'flex', justifyContent:'center' },
  card: { width:'100%', maxWidth:480, minHeight:'100vh', background:'#fff', fontFamily:"'Noto Sans KR',sans-serif", display:'flex', flexDirection:'column' },

  bar: { background:'#1a0a2e', padding:'9px 14px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  barTitle: { fontSize:13, fontWeight:500, color:'#c9a84c', letterSpacing:'0.08em' },
  barBtn: { fontSize:11, color:'rgba(212,187,255,0.85)', background:'rgba(180,142,255,0.12)', border:'0.5px solid rgba(180,142,255,0.3)', borderRadius:10, padding:'4px 11px', cursor:'pointer' },

  hero: { background:'linear-gradient(135deg, #1a0a2e 0%, #341766 50%, #4a1a7e 100%)', padding:'14px 14px 16px', position:'relative', overflow:'hidden' },
  heroRow: { display:'flex', alignItems:'center', gap:10, position:'relative', zIndex:1 },
  starBadge: { width:40, height:40, borderRadius:'50%', border:'1.5px solid #c9a84c', flexShrink:0, background:'#0a0010', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#f3dca6' },
  heroH1: { fontSize:18, fontWeight:500, color:'#f3dca6', lineHeight:1.4 },
  heroSub: { fontSize:10, color:'rgba(212,187,255,0.7)', marginTop:3 },
  heroTags: { display:'flex', gap:5, marginTop:9, position:'relative', zIndex:1, flexWrap:'wrap' },
  heroTag: { fontSize:9.5, color:'#f3dca6', background:'rgba(232,201,122,0.12)', border:'0.5px solid rgba(232,201,122,0.3)', borderRadius:9, padding:'3px 9px' },

  section: { padding:'10px 14px 0' },
  sectionLabel: { fontSize:11.5, fontWeight:500, color:'#1a1a1a', marginBottom:6, display:'flex', alignItems:'center', gap:5 },
  req: { fontSize:8.5, color:'#993556', fontWeight:500, background:'#FBEAF0', padding:'1px 6px', borderRadius:6, marginLeft:2 },

  calRow: { display:'flex', gap:6, marginBottom:6, alignItems:'center' },
  calBtn: { padding:'5px 14px', borderRadius:8, fontSize:11.5, border:'1px solid #e0e0e0', background:'#f7f7f7', color:'#666', cursor:'pointer' },
  calBtnOn: { border:'1.5px solid #d4537e', background:'#FBEAF0', color:'#993556', fontWeight:500 },
  leapLabel: { fontSize:11, color:'#666', display:'flex', alignItems:'center', marginLeft:4 },
  row3: { display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:5, marginBottom:8 },
  row2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 },
  input: { width:'100%', padding:'8px 9px', background:'#f7f7f7', border:'1px solid #e0e0e0', borderRadius:8, fontSize:12.5, color:'#1a1a1a', outline:'none' },
  genderBtn: { padding:8, borderRadius:8, fontSize:13, textAlign:'center', border:'1px solid #e0e0e0', background:'#f7f7f7', color:'#666', cursor:'pointer' },
  genderBtnOn: { border:'1.5px solid #d4537e', background:'#FBEAF0', color:'#993556', fontWeight:500 },
  genderBtnOnMale: { border:'1.5px solid #378ADD', background:'#E6F1FB', color:'#0C447C', fontWeight:500 },

  divider: { height:7, background:'#f0f0f0', marginTop:10 },

  svcSection: { padding:'10px 14px 0' },
  svcSectionLabel: { fontSize:11.5, fontWeight:500, color:'#1a1a1a', marginBottom:8, display:'flex', alignItems:'center', gap:5 },
  svcRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 },

  svcCard: { background:'#fff', border:'1.5px solid #378ADD', borderRadius:14, padding:'11px 9px', display:'flex', flexDirection:'column' },
  svcCardFeatured: { background:'#fff', border:'1.5px solid #d4537e', borderRadius:14, padding:'11px 9px', display:'flex', flexDirection:'column', position:'relative' },
  featuredBadge: { position:'absolute', top:-8, right:10, background:'#d4537e', color:'#fff', fontSize:9, fontWeight:500, padding:'2px 8px', borderRadius:8 },

  svcIconMoon: { width:30, height:30, borderRadius:8, background:'#FBEAF0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, marginBottom:6 },
  svcIconPray: { width:30, height:30, borderRadius:8, background:'#FAEEDA', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, marginBottom:6 },

  svcName: { fontSize:12.5, fontWeight:500, color:'#1a1a1a', marginBottom:2, lineHeight:1.3 },
  svcDesc: { fontSize:10, color:'#888', lineHeight:1.4, marginBottom:6, minHeight:26 },
  svcPrice: { fontSize:15, fontWeight:500, color:'#1a1a1a', marginBottom:6 },
  unit: { fontSize:10, color:'#888', fontWeight:400 },

  ctaBtn: { width:'100%', padding:'9px', borderRadius:8, background:'#F4C0D1', border:'none', color:'#993556', fontSize:11.5, fontWeight:500, cursor:'pointer' },
  ctaBtnOutline: { width:'100%', padding:'9px', borderRadius:8, background:'#B5D4F4', border:'none', color:'#185FA5', fontSize:11.5, fontWeight:500, cursor:'pointer' },
  testBtn: { width:'100%', padding:'6px', borderRadius:8, background:'#999', border:'none', color:'#fff', fontSize:9.5, marginTop:4, cursor:'pointer' },

  errBox: { fontSize:11, color:'#a32d2d', background:'rgba(226,75,74,0.06)', border:'1px solid rgba(226,75,74,0.2)', borderRadius:8, padding:'7px 11px', marginBottom:8 },

  ddayBox: { display:'flex', alignItems:'center', gap:9, background:'linear-gradient(135deg, #1a0a2e, #4a1a7e)', borderRadius:14, padding:'10px 13px', margin:'10px 14px 0' },
  ddayIcon: { width:32, height:32, borderRadius:'50%', background:'rgba(232,201,122,0.15)', border:'1px solid rgba(232,201,122,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 },
  ddayTitle: { fontSize:11, fontWeight:500, color:'#f3dca6', marginBottom:1 },
  ddaySub: { fontSize:9, color:'rgba(212,187,255,0.65)' },
  ddayCount: { fontSize:15, fontWeight:500, color:'#f3dca6', flexShrink:0 },

  linkGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, padding:'10px 14px' },
  linkItem: { background:'#fff', border:'1px solid #e5e5e5', borderRadius:10, padding:9, display:'flex', alignItems:'center', gap:7, textDecoration:'none' },
  linkIcon: { width:26, height:26, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 },
  linkName: { fontSize:10.5, fontWeight:500, color:'#1a1a1a' },
  linkSub: { fontSize:9, color:'#999' },
  linkArrow: { color:'#bbb', fontSize:13, flexShrink:0 },

  footer: { textAlign:'center', padding:'0 14px 16px', fontSize:9, color:'#bbb', lineHeight:1.5 },

  loadingOverlay: {
    position:'fixed', inset:0, zIndex:200,
    background:'rgba(255,255,255,0.92)',
    display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center',
    textAlign:'center',
  },
  orb: {
    width:64, height:64, borderRadius:'50%',
    background:'radial-gradient(circle at 35% 35%, #f3dca6, #d4537e 55%, #7c3aed 100%)',
    marginBottom:16, position:'relative',
    animation:'pulseOrb 1.6s ease-in-out infinite',
  },
  orbRing: {
    position:'absolute', inset:-8, borderRadius:'50%',
    border:'2px solid rgba(212,83,126,0.3)',
    animation:'ringPulse 1.6s ease-out infinite',
  },
  loadingTitle: { fontSize:14, fontWeight:500, color:'#1a1a1a', marginBottom:4 },
  loadingSub: { fontSize:11.5, color:'#999' },
}
