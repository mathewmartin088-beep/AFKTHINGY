// AFK bot: joins your server as a real player (offline-mode servers only),
// stays "active" with tiny movements, and reconnects if kicked/disconnected.
const mineflayer = require('mineflayer')
const http = require('http')

const HOST = process.env.MC_HOST || process.argv[2] || 'jamsmp.mcsh.gg'
const PORT = parseInt(process.env.MC_PORT || process.argv[3] || '25565', 10)
const USERNAME = process.env.MC_USER || 'AFK'
const PASSWORD = process.env.MC_PASSWORD || 'AfkBot-Pass-123'
const PASSIVE = process.env.MC_PASSIVE === '1'
const RECONNECT_MS = 10000

function start() {
  console.log(`[AFK] Connecting to ${HOST}:${PORT} as ${USERNAME} (auto-detecting protocol)...`)
  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    auth: 'offline',
    version: false, // Step 2: Auto-detects the exact Minecraft server version during handshake
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

  bot.once('login', () => console.log(`[AFK] Logged in. Protocol version detected & used: ${bot.version}`))

  bot.once('spawn', () => {
    console.log('[AFK] Joined the server.')
    if (PASSIVE) { console.log('[AFK] Passive mode: not moving.'); return }
    
    let tick = 0
    timer = setInterval(() => {
      tick++
      // Safely swing arm and look around without triggering position/movement kicks
      bot.look(bot.entity.yaw + (Math.random() - 0.5), 0, true)
      if (tick % 12 === 0) bot.swingArm('right')
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

// Render web service health check listener
if (process.env.PORT) {
  http.createServer((req, res) => { res.end('AFK bot running') }).listen(process.env.PORT, () => {
    console.log('[AFK] Health server on port ' + process.env.PORT)
  })
}
