import React, { useEffect, useRef } from 'react'

export default function Stars() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + 0.3,
      o: Math.random(), speed: Math.random() * 0.008 + 0.002,
      phase: Math.random() * Math.PI * 2,
    }))

    let frame
    function draw(t) {
      ctx.clearRect(0, 0, W, H)
      stars.forEach(s => {
        const alpha = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212,187,255,${alpha})`
        ctx.fill()
      })
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    const resize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
      stars.forEach(s => { s.x = Math.random()*W; s.y = Math.random()*H })
    }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <canvas ref={canvasRef}
      style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, opacity:0.7 }} />
  )
}
