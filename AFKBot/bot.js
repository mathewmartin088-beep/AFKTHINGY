const dns = require('dns')
// Force IPv4 lookup first to prevent ENETUNREACH errors on Render
dns.setDefaultResultOrder('ipv4first')

const mineflayer = require('mineflayer')
const http = require('http')

const HOST = process.env.MC_HOST || process.argv[2] || 'jamsmp.mcsh.gg'
const PORT = process.env.MC_PORT ? parseInt(process.env.MC_PORT, 10) : (process.argv[3] ? parseInt(process.argv[3], 10) : undefined)
// Set MC_VERSION env variable on Render (e.g. '1.20.4' or '1.21.1') if auto-detect fails
const VERSION = process.env.MC_VERSION || false 
const USERNAME = process.env.MC_USER || 'AFK'
const PASSWORD = process.env.MC_PASSWORD || 'AfkBot-Pass-123'
const PASSIVE = process.env.MC_PASSIVE === '1'
const RECONNECT_MS = 10000

function start() {
  console.log(`[AFK] Connecting to ${HOST}${PORT ? ':' + PORT : ''} as ${USERNAME}...`)
  
  const botOptions = {
    host: HOST,
    username: USERNAME,
    auth: 'offline',
    version: VERSION, // false uses auto-detection; set string if server forces specific sub-version
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

  bot.once('login', () => console.log(`[AFK] Logged in. Detected Minecraft version: ${bot.version}`))

  bot.once('spawn', () => {
    console.log('[AFK] Joined the server successfully.')
    if (PASSIVE) { console.log('[AFK] Passive mode active.'); return }
    
    let tick = 0
    timer = setInterval(() => {
      tick++
      // Smoothly rotate without 'force=true' to allow physics engine to sync position packets
      if (bot.entity) {
        bot.look(bot.entity.yaw + (Math.random() - 0.5), 0, false)
      }
      if (tick % 4 === 0) {
        bot.swingArm('right')
      }
    }, 15000)
  })

  // AuthMe support: answer /register and /login prompts automatically
  let authSent = 0
  bot.on('messagestr', (msg) => {
    const m = msg.toLowerCase()
    if (Date.now() - authSent < 3000) return
    if (m.includes('/register')) {
      authSent = Date.now()
      console.log('[AFK] Registering...')
      bot.chat(`/register ${PASSWORD} ${PASSWORD}`)
    } else if (m.includes('/login')) {
      authSent = Date.now()
      console.log('[AFK] Logging in...')
      bot.chat(`/login ${PASSWORD}`)
    }
  })

  bot.on('kicked', (reason) => console.log('[AFK] Kicked:', typeof reason === 'string' ? reason : JSON.stringify(reason)))
  bot.on('error', (err) => console.log('[AFK] Error:', err.message))
  bot.on('end', (reason) => reconnect(reason))
}

start()

// Render health check listener
if (process.env.PORT) {
  http.createServer((req, res) => { res.end('AFK bot running') }).listen(process.env.PORT, () => {
    console.log('[AFK] Health server on port ' + process.env.PORT)
  })
}
