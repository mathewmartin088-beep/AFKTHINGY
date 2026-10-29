const dns = require('dns')
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first')
}

const mineflayer = require('mineflayer')
const http = require('http')

// Direct IP and Port set as default fallbacks
const HOST = process.env.MC_HOST || process.argv[2] || '198.244.200.55'
const PORT = process.env.MC_PORT ? parseInt(process.env.MC_PORT, 10) : (process.argv[3] ? parseInt(process.argv[3], 10) : 11046)
const USERNAME = process.env.MC_USER || 'AFK'
const PASSWORD = process.env.MC_PASSWORD || 'AfkBot-Pass-123'
const RECONNECT_MS = 10000

function start() {
  console.log(`[AFK] Connecting directly to ${HOST}:${PORT} as ${USERNAME}...`)

  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    auth: 'offline',
    version: false, // Auto-detect protocol version during server handshake
    checkTimeoutInterval: 60000
  })

  let timer = null
  let ended = false

  const reconnect = (why) => {
    if (ended) return
    ended = true
    if (timer) clearInterval(timer)
    console.log(`[AFK] Disconnected (${why}). Reconnecting in ${RECONNECT_MS / 1000}s...`)
    setTimeout(start, RECONNECT_MS)
  }

  bot.once('login', () => console.log(`[AFK] Logged in successfully.`))

  bot.once('spawn', () => {
    console.log('[AFK] Joined the server and spawned.')
    if (timer) clearInterval(timer)

    setTimeout(() => {
      if (ended) return
      timer = setInterval(() => {
        if (bot && bot.swingArm) {
          bot.swingArm('right')
        }
      }, 15000)
    }, 3000)
  })

  // AuthMe support
  let authSent = 0
  const handleAuthPrompt = (rawText) => {
    if (!rawText) return
    const m = String(rawText).toLowerCase()
    if (Date.now() - authSent < 4000) return

    if (m.includes('/register')) {
      authSent = Date.now()
      console.log('[AFK] Registering...')
      setTimeout(() => bot.chat(`/register ${PASSWORD} ${PASSWORD}`), 500)
    } else if (m.includes('/login')) {
      authSent = Date.now()
      console.log('[AFK] Logging in...')
      setTimeout(() => bot.chat(`/login ${PASSWORD}`), 500)
    }
  }

  bot.on('messagestr', (msg) => handleAuthPrompt(msg))
  bot.on('actionBar', (msg) => handleAuthPrompt(msg.getText ? msg.getText() : msg))
  bot.on('title', (text) => handleAuthPrompt(text))

  bot.on('kicked', (reason) => console.log('[AFK] Kicked:', typeof reason === 'string' ? reason : JSON.stringify(reason)))
  bot.on('error', (err) => console.log('[AFK] Error:', err.message))
  bot.on('end', (reason) => reconnect(reason))
}

start()

// Render health check server
if (process.env.PORT) {
  http.createServer((req, res) => { res.end('AFK bot running') }).listen(process.env.PORT, () => {
    console.log('[AFK] Health server running on port ' + process.env.PORT)
  })
}
