import express from 'express'
import { calcZiwei } from './ziwei.mjs'

const app  = express()
const PORT = 3003   // ziwei 전용 포트

app.use(express.json())

app.get('/health', (_, res) => res.json({ status:'ok', service:'ziwei-node', port:PORT }))

app.post('/ziwei/calculate', (req, res) => {
  try {
    const { year, month, day, hour, minute, isMale,
            currentYear, age, queryMonth, queryDay } = req.body
    if (!year||!month||!day||hour===undefined||isMale===undefined)
      return res.status(400).json({ error:'필수 파라미터 누락: year,month,day,hour,isMale' })
    res.json(calcZiwei({ year,month,day,hour,minute,isMale,currentYear,age,queryMonth,queryDay }))
  } catch(e) {
    console.error('[ziwei-node]', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => console.log(`[ziwei-node] http://localhost:${PORT}`))
