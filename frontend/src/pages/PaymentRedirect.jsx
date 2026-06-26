
import { useEffect } from 'react'

import { useNavigate } from 'react-router-dom'

import axios from 'axios'



export default function PaymentRedirect() {

  const nav = useNavigate()



  useEffect(() => {

    const params = new URLSearchParams(window.location.search)

    const paymentId = params.get('payment_id')

    const serviceType = sessionStorage.getItem('pending_service')

    const cacheKey = sessionStorage.getItem('pending_cache_key') || ''



    if (!paymentId || !serviceType) {

      nav('/')

      return

    }



    axios.post('/api/payment/complete', {

      payment_id: paymentId,

      service_type: serviceType,

      cache_key: cacheKey,

    }).then(({ data }) => {

      if (data.success) {

        sessionStorage.setItem('payment_key', paymentId)

        sessionStorage.setItem('cache_key', data.cache_key || cacheKey)

        nav('/result')

      } else {

        alert('결제 확인 실패. 다시 시도해주세요.')

        nav('/')

      }

    }).catch(() => {

      alert('결제 확인 오류. 고객센터에 문의해주세요.')

      nav('/')

    })

  }, [])



  return (

    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',

                  height:'100vh', color:'var(--text1)', fontSize:'16px' }}>

      결제 확인 중...

    </div>

  )

}

