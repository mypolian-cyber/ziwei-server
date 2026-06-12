import React, { useState } from 'react'
import { createOrder } from '../services/api'

export default function Payment({ cacheKey, input, onClose }) {
  const [step, setStep] = useState('select') // select | loading
  const [err,  setErr]  = useState('')

  const services = [
    { type:'ziwei_year', icon:'🌙', title:'해별 운세', price:'1,990원',
      desc:'올해 12달 월별 상세 분석\n재물·직업·건강·이성 직언\n절대 하면 안 될 것 / 해야 할 것' },
    { type:'ziwei_day',  icon:'⭐', title:'특정일 운세', price:'1,990원',
      desc:'원하는 날짜 유일(流日) 분석\n계약·투자·시험·만남 가능 여부\n오늘 하루 행동 지침 직언' },
    { type:'ziwei_set',  icon:'✨', title:'세트 (해별+특정일)', price:'2,900원',
      desc:'해별 + 특정일 동시 제공\n최고의 조합 추천', badge:'BEST' },
  ]

  async function pay(service_type) {
    setStep('loading')
    setErr('')
    try {
      const order = await createOrder(service_type, cacheKey)
      sessionStorage.setItem('ziwei_input',       JSON.stringify(input))
      sessionStorage.setItem('pending_service',   service_type)
      sessionStorage.setItem('pending_cache_key', cacheKey)

      // 토스 결제창 호출
      const toss = await loadToss(order.client_key)
      await toss.requestPayment('카드', {
        amount:      order.amount,
        orderId:     order.order_id,
        orderName:   order.order_name,
        successUrl:  order.success_url,
        failUrl:     order.fail_url,
      })
    } catch(e) {
      setErr('결제 오류: ' + (e.message || '다시 시도해주세요'))
      setStep('select')
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100,
                  background:'rgba(0,0,0,0.8)', display:'flex',
                  alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ width:'100%', maxWidth:520,
                    background:'var(--bg2)', borderRadius:'20px 20px 0 0',
                    border:'1px solid var(--border)', padding:'28px 24px 40px',
                    animation:'fadeUp 0.3s ease' }}>

        <div style={{ width:40, height:4, background:'var(--border)',
                      borderRadius:2, margin:'0 auto 24px' }} />

        <h3 style={{ fontFamily:'var(--font-serif)', fontSize:20,
                     color:'var(--lavender2)', textAlign:'center', marginBottom:6 }}>
          운세 선택
        </h3>
        <p style={{ fontSize:12, color:'var(--text3)', textAlign:'center', marginBottom:24 }}>
          결제 후 즉시 GPT-4o가 직설적으로 분석합니다
        </p>

        {step === 'loading' ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ width:36, height:36, border:'3px solid rgba(180,142,255,0.2)',
                          borderTopColor:'var(--lavender)', borderRadius:'50%',
                          animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
            <p style={{ color:'var(--text2)' }}>결제창 연결 중...</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {services.map(s => (
              <button key={s.type} onClick={() => pay(s.type)}
                style={{ padding:'16px 18px', background:'rgba(255,255,255,0.03)',
                         border:'1px solid var(--border)', borderRadius:14,
                         cursor:'pointer', textAlign:'left',
                         display:'flex', alignItems:'center', gap:14,
                         transition:'all 0.2s', position:'relative',
                         ':hover':{ borderColor:'var(--lavender)' } }}>
                {s.badge && (
                  <span style={{ position:'absolute', top:-8, right:12,
                                 background:'linear-gradient(135deg,#7c3aed,#c026d3)',
                                 color:'#fff', fontSize:10, fontWeight:700,
                                 padding:'2px 8px', borderRadius:10 }}>
                    {s.badge}
                  </span>
                )}
                <span style={{ fontSize:28 }}>{s.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'var(--font-serif)', fontSize:16,
                                color:'var(--lavender2)', marginBottom:4 }}>{s.title}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', whiteSpace:'pre-line',
                                lineHeight:1.6 }}>{s.desc}</div>
                </div>
                <div style={{ color:'var(--gold)', fontWeight:700, fontSize:16,
                              flexShrink:0 }}>{s.price}</div>
              </button>
            ))}
          </div>
        )}

        {err && (
          <p style={{ marginTop:16, fontSize:13, color:'var(--danger)', textAlign:'center' }}>{err}</p>
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
