const dns = require('dns')
// Force IPv4 lookup first to prevent ENETUNREACH errors on Render
dns.setDefaultResultOrder('ipv4first')

const mineflayer = require('mineflayer')
const http = require('http')

const HOST = process.env.MC_HOST || process.argv[2] || 'jamsmp.mcsh.gg'
const PORT = process.env.MC_PORT ? parseInt(process.env.MC_PORT, 10) : (process.argv[3] ? parseInt(process.argv[3], 10) : undefined)
const USERNAME = process.env.MC_USER || 'AFK'
const PASSWORD = process.env.MC_PASSWORD || 'AfkBot-Pass-123'
const RECONNECT_MS = 10000

function start() {
  console.log(`[AFK] Connecting to ${HOST}${PORT ? ':' + PORT : ''} as ${USERNAME}...`)
  
  const botOptions = {
    host: HOST,
    username: USERNAME,
    auth: 'offline',
    version: false, // Auto-detect protocol version directly from server handshake
    checkTimeoutInterval: 60000
  }
  if (PORT) botOptions.port = PORT

  const bot = mineflayer.createBot(botOptions)

  let timer = null
  let ended = false

  const reconnect = (why) => {
    if (ended) return
    ended = true
    if (timer) clearInterval(timer)
    console.log(`[AFK] Disconnected (${why}). Reconnecting in ${RECONNECT_MS / 1000}s...`)
    setTimeout(start, RECONNECT_MS)
  }

  bot.once('login', () => console.log(`[AFK] Logged in using protocol version: ${bot.version}`))

  bot.once('spawn', () => {
    console.log('[AFK] Joined the server and spawned.')
    
    if (timer) clearInterval(timer)

    timer = setInterval(() => {
      if (bot.entity && typeof bot.entity.yaw === 'number' && !isNaN(bot.entity.yaw)) {
        bot.look(bot.entity.yaw + (Math.random() - 0.5), 0, false)
      }
      bot.swingArm('right')
    }, 15000)
  })

  // AuthMe automatic login handler
  let authSent = 0
  const handleAuthPrompt = (rawText) => {
    if (!rawText) return
    const m = rawText.toLowerCase()
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
  bot.on('actionBar', (msg) => handleAuthPrompt(msg.getText()))
  bot.on('title', (text) => handleAuthPrompt(text))

  bot.on('kicked', (reason) => console.log('[AFK] Kicked:', typeof reason === 'string' ? reason : JSON.stringify(reason)))
  bot.on('error', (err) => console.log('[AFK] Error:', err.message))
  bot.on('end', (reason) => reconnect(reason))
}

start()

if (process.env.PORT) {
  http.createServer((req, res) => { res.end('AFK bot running') }).listen(process.env.PORT, () => {
    console.log('[AFK] Health server running on port ' + process.env.PORT)
  })
}
