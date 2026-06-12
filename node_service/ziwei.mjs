import { createChart, getDaxianList, calculateLiunian } from '@orrery/core/ziwei'

const PALACE_KR = {
  '命宮':'명궁','兄弟':'형제궁','夫妻':'부처궁','子女':'자녀궁',
  '財帛':'재백궁','疾厄':'질액궁','遷移':'천이궁','交友':'교우궁',
  '官祿':'관록궁','田宅':'전택궁','福德':'복덕궁','父母':'부모궁',
}
const SIHUA_KR  = { '化祿':'화록','化權':'화권','化科':'화과','化忌':'화기' }
const BRIGHT_KR = { '廟':'묘','旺':'왕','得':'득','利':'이','平':'평','不':'불','陷':'함' }
const ZHI_ORDER = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const PALACE_LIST = ['命宮','兄弟','夫妻','子女','財帛','疾厄','遷移','交友','官祿','田宅','福德','父母']

/* 유일(流日) 계산 — 유월명궁 지지에서 일수만큼 순행 */
function calcLiuri(liuyueMingGongZhi, day) {
  const base = ZHI_ORDER.indexOf(liuyueMingGongZhi)
  const idx  = (base + day - 1) % 12
  const name = PALACE_LIST[idx]
  return { day, mingGongZhi: ZHI_ORDER[idx], palaceName: name, palaceNameKr: PALACE_KR[name] ?? name }
}

export function calcZiwei({ year, month, day, hour, minute=0, isMale, currentYear, age,
                             queryMonth, queryDay }) {
  const thisYear = currentYear ?? new Date().getFullYear()
  const chart    = createChart(year, month, day, hour, minute, isMale)
  const daxList  = getDaxianList(chart)
  const liunian  = calculateLiunian(chart, thisYear)
  const curAge   = age ?? (thisYear - year)
  const curDax   = daxList.find(d => curAge >= d.ageStart && curAge <= d.ageEnd) ?? daxList[0]

  const palaces = Object.entries(chart.palaces).map(([hanja, p]) => ({
    name: hanja, nameKr: PALACE_KR[hanja] ?? hanja,
    ganZhi: p.ganZhi, gan: p.gan, zhi: p.zhi,
    isMingGong: hanja==='命宮', isShenGong: p.isShenGong,
    stars: p.stars.map(s => ({
      name: s.name, brightness: s.brightness,
      brightnessKr: BRIGHT_KR[s.brightness] ?? s.brightness,
      siHua: s.siHua||null,
      siHuaKr: s.siHua ? (SIHUA_KR[s.siHua]??s.siHua) : null,
    })),
  }))

  const liuyue = (liunian.liuyue??[]).map(m => ({
    month: m.month, mingGongZhi: m.mingGongZhi,
    natalPalace: m.natalPalaceName,
    natalPalaceKr: PALACE_KR[m.natalPalaceName] ?? m.natalPalaceName,
  }))

  /* 특정 월·일 유일 계산 */
  let liuri = null
  if (queryMonth && queryDay) {
    const targetMonth = liuyue.find(m => m.month === queryMonth)
    if (targetMonth) {
      liuri = calcLiuri(targetMonth.mingGongZhi, queryDay)
      liuri.queryMonth = queryMonth
      liuri.queryDay   = queryDay
      liuri.monthPalaceKr = targetMonth.natalPalaceKr
    }
  }

  return {
    mingGongZhi: chart.mingGongZhi,
    shenGongZhi: chart.shenGongZhi,
    wuXingJu: chart.wuXingJu.name,
    palaces,
    daxianList: daxList.map(d => ({
      ageStart: d.ageStart, ageEnd: d.ageEnd,
      palaceName: d.palaceName,
      palaceNameKr: PALACE_KR[d.palaceName] ?? d.palaceName,
      ganZhi: d.ganZhi, mainStars: d.mainStars,
    })),
    currentDaxian: {
      ageStart: curDax.ageStart, ageEnd: curDax.ageEnd,
      palaceName: curDax.palaceName,
      palaceNameKr: PALACE_KR[curDax.palaceName] ?? curDax.palaceName,
      ganZhi: curDax.ganZhi, mainStars: curDax.mainStars,
    },
    liunian: {
      year: liunian.year, gan: liunian.gan, zhi: liunian.zhi,
      natalPalaceAtMing: liunian.natalPalaceAtMing,
      natalPalaceAtMingKr: PALACE_KR[liunian.natalPalaceAtMing] ?? liunian.natalPalaceAtMing,
      siHua: liunian.siHua,
      siHuaKr: Object.fromEntries(Object.entries(liunian.siHua).map(([s,h])=>[s, SIHUA_KR[h]??h])),
      siHuaPalaces: liunian.siHuaPalaces,
      siHuaPalacesKr: Object.fromEntries(
        Object.entries(liunian.siHuaPalaces).map(([h,p])=>[SIHUA_KR[h]??h, PALACE_KR[p]??p])
      ),
      liuyue,
    },
    liuri,  // 특정일 운세 (null 이면 미요청)
  }
}
