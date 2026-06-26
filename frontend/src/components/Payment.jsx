
import React, { useState } from 'react'

import { createOrder } from '../services/api'



const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID || ''

const CHANNEL_KEY_CARD = import.meta.env.VITE_PORTONE_CHANNEL_KEY_CARD || ''



function loadPortOne() {

  return new Promise((resolve, reject) => {

    if (window.PortOne) return resolve(window.PortOne)

    const script = document.createElement('script')

    script.src = 'https://cdn.portone.io/v2/browser-sdk.js'

    script.onload = () => resolve(window.PortOne)

    script.onerror = reject

    document.head.appendChild(script)

  })

}



export default function Payment({ cacheKey, input, onClose }) {

  const [step, setStep] = useState('select')

  const [err, setErr] = useState('')



  const services = [

    { type:'ziwei_year', icon:'', title:'해별 운세', price:'1,990원',

      desc:'올해 12달 월별 상세 분석\n재물·직업·건강·이성 직언\n절대 하면 안 될 것 / 해야 할 것' },

    { type:'ziwei_day', icon:'⭐', title:'특정일 운세', price:'1,990원',

      desc:'원하는 날짜 유일(流日) 분석\n계약·투자·시험·만남 가능 여부\n오늘 하루 행동 지침 직언' },

    { type:'ziwei_set', icon:'✨', title:'세트 (해별+특정일)', price:'2,900원',

      desc:'해별 + 특정일 동시 제공\n최고의 조합 추천', badge:'BEST' },

  ]



  async function pay(service_type) {

    setStep('loading')

    setErr('')

    try {

      const order = await createOrder(service_type, cacheKey)

      sessionStorage.setItem('ziwei_input', JSON.stringify(input))

      sessionStorage.setItem('pending_service', service_type)

      sessionStorage.setItem('pending_cache_key', cacheKey)



      const PortOne = await loadPortOne()

      const response = await PortOne.requestPayment({

        storeId: STORE_ID,

        channelKey: CHANNEL_KEY_CARD,

        paymentId: order.order_id,

        orderName: order.order_name,

        totalAmount: order.amount,

        currency: 'CURRENCY_KRW',

        customer: { fullName: '고객', phoneNumber: '010-0000-0000', email: 'customer@ziwei.com' },

        payMethod: 'CARD',
        redirectUrl: window.location.origin + '/payment/redirect',

      })



      if (!response || response.code) {

        if (response?.code !== 'USER_CANCEL') {

          setErr(response?.message || '결제 중 오류가 발생했어요. 다시 시도해주세요.')

        }

        setStep('select')

        return

      }



      // 결제 성공 — 백엔드 검증

      const verify = await fetch('/api/payment/complete', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          payment_id: response.paymentId,

          order_id: order.order_id,

          service_type,

          cache_key: cacheKey,

        })

      })

      const result = await verify.json()

      if (result.success) {

        onClose(service_type, response.paymentId)

      } else {

        setErr('결제 검증 실패: ' + (result.message || '다시 시도해주세요.'))

        setStep('select')

      }

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

        {step === 'loading' ? (

          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text1)' }}>

            결제 처리 중...

          </div>

        ) : (

          <>

            <h3 style={{ margin:'0 0 20px', color:'var(--text1)' }}>서비스 선택</h3>

            {err && <div style={{ color:'#f87171', marginBottom:'12px', fontSize:'13px' }}>{err}</div>}

            {services.map(s => (

              <div key={s.type}

                onClick={() => pay(s.type)}

                style={{ padding:'16px', marginBottom:'10px', borderRadius:'12px',

                         border:'1px solid var(--border)', cursor:'pointer',

                         background:'var(--bg1)' }}>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>

                  <span style={{ fontWeight:'700', color:'var(--text1)' }}>{s.icon} {s.title}</span>

                  <span style={{ color:'var(--accent)', fontWeight:'700' }}>{s.price}</span>

                </div>

                <div style={{ fontSize:'12px', color:'var(--text2)', marginTop:'6px', whiteSpace:'pre-line' }}>{s.desc}</div>

              </div>

            ))}

            <button onClick={onClose}

              style={{ width:'100%', padding:'12px', marginTop:'8px',

                       border:'1px solid var(--border)', borderRadius:'10px',

                       background:'transparent', color:'var(--text2)', cursor:'pointer' }}>

              닫기

            </button>

          </>

        )}

      </div>

    </div>

  )

}

