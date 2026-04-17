import morgan from 'morgan'

const morganGetDateToken = morgan['date']
const isHealthcheck = (req) => req.path === '/up'

morgan.token('id', (req) => req.id)
morgan.token('error', (req) => req.errorDescription)
morgan.token('date', (req, res, format) => {
  switch (format || 'web') {
    case 'clf':
    case 'iso':
    case 'web':
      return morganGetDateToken(req, res, format)
    case 'ruby': { // Ruby's `Time.now.to_s` format
      const isoDateParts = new Date().toISOString().split('T')
      const ymd = isoDateParts[0]
      const hms = isoDateParts[1].split('.')[0]
      return `${ymd} ${hms} +0000`
    }
  }
})

export default [
  morgan(
    "I, [:date[iso]]  INFO -- : [:id] Started :method \":url\" for :remote-addr at :date[ruby]",
    { immediate: true, skip: isHealthcheck }
  ),
  morgan(
    "I, [:date[iso]]  INFO -- : [:id] Completed :status in :response-time[0] ms",
    { skip: (req, res) => isHealthcheck(req) || res.statusCode >= 400 }
  ),
  morgan(
    "E, [:date[iso]] ERROR -- : [:id] :error for :remote-addr",
    { skip: (req, res) => isHealthcheck(req) || res.statusCode < 400 }
  )
]
