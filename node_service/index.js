import express from 'express'
import { calcZiwei } from './ziwei.mjs'
import LunarPkg from './node_modules/lunar-javascript/lunar.js'
const { Lunar } = LunarPkg

const app  = express()
const PORT = 3003   // ziwei 전용 포트
app.use(express.json())

function lunarToSolar(year, month, day, isLeap = false) {
  try {
    const lunar = Lunar.fromYmd(year, month, day, isLeap)
    const solar = lunar.getSolar()
    return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() }
  } catch(e) {
    return { year, month, day }
  }
}

app.get('/health', (_, res) => res.json({ status:'ok', service:'ziwei-node', port:PORT }))

app.post('/ziwei/calculate', (req, res) => {
  try {
    const { year, month, day, hour, minute, isMale,
            currentYear, age, queryMonth, queryDay, calendar, isLeap } = req.body
    if (!year||!month||!day||hour===undefined||isMale===undefined)
      return res.status(400).json({ error:'필수 파라미터 누락: year,month,day,hour,isMale' })

    let y = parseInt(year), m = parseInt(month), d = parseInt(day)
    if (calendar === 'lunar') {
      const converted = lunarToSolar(y, m, d, isLeap || false)
      y = converted.year; m = converted.month; d = converted.day
    }

    res.json(calcZiwei({ year:y,month:m,day:d,hour,minute,isMale,currentYear,age,queryMonth,queryDay }))
  } catch(e) {
    console.error('[ziwei-node]', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => console.log(`[ziwei-node] http://localhost:${PORT}`))
