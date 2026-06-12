import React from 'react'

const PALACE_ANGLE = {
  '명궁':0,'부모궁':30,'복덕궁':60,'전택궁':90,
  '관록궁':120,'교우궁':150,'천이궁':180,'질액궁':210,
  '재백궁':240,'자녀궁':270,'부처궁':300,'형제궁':330,
}

export default function MingbanChart({ palaces }) {
  const cx = 160, cy = 160, R = 120, r = 70

  return (
    <svg width="320" height="320" viewBox="0 0 320 320"
      style={{ display:'block', margin:'0 auto' }}>
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#2d1060" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0f0720" stopOpacity="0.4" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* 배경 원 */}
      <circle cx={cx} cy={cy} r={R+20} fill="url(#bgGrad)" stroke="rgba(180,142,255,0.2)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r}    fill="none"          stroke="rgba(180,142,255,0.15)" strokeWidth="0.5" />

      {/* 12궁 섹터 */}
      {palaces.map((p, i) => {
        const deg = (PALACE_ANGLE[p.nameKr] ?? i * 30) - 90
        const rad = (deg * Math.PI) / 180
        const mid = (deg + 15) * Math.PI / 180
        const tx  = cx + (R + r) / 2 * Math.cos(mid - Math.PI/2 + Math.PI/12)
        const ty  = cy + (R + r) / 2 * Math.sin(mid - Math.PI/2 + Math.PI/12)

        const x1 = cx + R * Math.cos(rad)
        const y1 = cy + R * Math.sin(rad)
        const x2 = cx + r * Math.cos(rad)
        const y2 = cy + r * Math.sin(rad)

        // 섹터 호
        const r2 = (deg + 30) * Math.PI / 180
        const ax1 = cx + R * Math.cos(r2)
        const ay1 = cy + R * Math.sin(r2)

        const mainStar = p.stars.find(s => s.siHua)
        const isHighlight = p.isMingGong || (mainStar && mainStar.siHua === '화록')
        const fillColor = p.isMingGong
          ? 'rgba(201,168,76,0.2)'
          : isHighlight ? 'rgba(180,142,255,0.12)' : 'rgba(180,142,255,0.04)'
        const strokeColor = p.isMingGong ? 'rgba(201,168,76,0.6)' : 'rgba(180,142,255,0.25)'

        return (
          <g key={p.name}>
            <path
              d={`M ${x1} ${y1} A ${R} ${R} 0 0 1 ${ax1} ${ay1} L ${cx + r * Math.cos(r2)} ${cy + r * Math.sin(r2)} A ${r} ${r} 0 0 0 ${x2} ${y2} Z`}
              fill={fillColor} stroke={strokeColor} strokeWidth="0.8"
            />
            {/* 궁 이름 */}
            <text
              x={cx + (R+r)/2 * Math.cos((deg+15)*Math.PI/180)}
              y={cy + (R+r)/2 * Math.sin((deg+15)*Math.PI/180)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill={p.isMingGong ? '#e8c97a' : 'rgba(212,187,255,0.7)'}
              fontFamily="Noto Sans KR">
              {p.nameKr.replace('궁','')}
            </text>
            {/* 주성 */}
            {p.stars[0] && (
              <text
                x={cx + (R+r)/2 * Math.cos((deg+15)*Math.PI/180)}
                y={cy + (R+r)/2 * Math.sin((deg+15)*Math.PI/180) + 11}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="7" fill={p.stars[0].siHuaKr ? '#e8a0bf' : 'rgba(212,187,255,0.5)'}
                fontFamily="Noto Sans KR">
                {p.stars[0].name}
              </text>
            )}
          </g>
        )
      })}

      {/* 중심 */}
      <circle cx={cx} cy={cy} r={r-2} fill="rgba(15,7,32,0.9)" />
      <text x={cx} y={cy-10} textAnchor="middle" fontSize="13"
        fill="#e8c97a" fontFamily="Gowun Batang, serif">命盤</text>
      <text x={cx} y={cy+8} textAnchor="middle" fontSize="9"
        fill="rgba(212,187,255,0.6)" fontFamily="Noto Sans KR">
        {palaces.find(p=>p.isMingGong)?.nameKr}
      </text>
    </svg>
  )
}
