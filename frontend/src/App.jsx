import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Result from './pages/Result'
import Contact from './pages/Contact'
import Yukim from './pages/Yukim'
import Privacy from './pages/Privacy'

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<Home />} />
      <Route path="/result"  element={<Result />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/yukim" element={<Yukim />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/success" element={<PaySuccess />} />
      <Route path="/fail"    element={<PayFail />} />
    </Routes>
  )
}

function PaySuccess() {
  React.useEffect(() => {
    const params  = new URLSearchParams(window.location.search)
    const orderId = params.get('orderId')
    const payKey  = params.get('paymentKey')
    const amount  = params.get('amount')
    if (orderId && payKey && amount) {
      fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, payment_key: payKey, amount: Number(amount) }),
      })
        .then(r => r.json())
        .then(d => {
          if (orderId.startsWith('ziwei_yukim_')) {
            sessionStorage.setItem('yukim_payment_key', d.payment_key)
            window.location.href = '/yukim'
          } else {
            sessionStorage.setItem('payment_key', d.payment_key)
            sessionStorage.setItem('cache_key',   d.cache_key)
            window.location.href = '/result'
          }
        })
        .catch(() => { window.location.href = '/fail' })
    }
  }, [])
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  minHeight:'100vh', flexDirection:'column', gap:16 }}>
      <div style={{ width:40, height:40, border:'3px solid #b48eff',
                    borderTopColor:'transparent', borderRadius:'50%',
                    animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#b8a8d8' }}>결제 확인 중...</p>
    </div>
  )
}

function PayFail() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  minHeight:'100vh', flexDirection:'column', gap:16 }}>
      <p style={{ color:'#ff6b8a', fontSize:18 }}>결제에 실패했습니다.</p>
      <button onClick={() => window.history.back()}
        style={{ padding:'10px 24px', background:'rgba(180,142,255,0.15)',
                 border:'1px solid rgba(180,142,255,0.3)', borderRadius:10,
                 color:'#d4bbff', cursor:'pointer' }}>
        돌아가기
      </button>
    </div>
  )
}
