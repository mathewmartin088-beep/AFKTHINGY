// AFK bot: joins your server as a real player (offline-mode servers only),
// stays "active" with tiny movements, and reconnects if kicked/disconnected.
const mineflayer = require('mineflayer')
const http = require('http')

const HOST = process.env.MC_HOST || process.argv[2] || 'localhost'
const PORT = parseInt(process.env.MC_PORT || process.argv[3] || '25565', 10)
const VERSION = process.env.MC_VERSION || process.argv[4] || false // false = auto-detect
const USERNAME = process.env.MC_USER || 'AFK'
const PASSWORD = process.env.MC_PASSWORD || 'AfkBot-Pass-123'
const RECONNECT_MS = 10000

function start() {
  console.log(`[AFK] Connecting to ${HOST}:${PORT} as ${USERNAME} (version: ${VERSION || 'auto'})...`)
  const bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    auth: 'offline',
    version: VERSION,
    checkTimeoutInterval: 60000
  })

  // Mineflayer's physics engine sends position packets that Paper 26.3 rejects
  // ("Invalid move player packet received"), so turn it off completely.
  bot.physicsEnabled = false

  // Newer servers reject mineflayer's movement packets ("Invalid move player packet"),
  // so never send any. The bot stays connected and idle instead.
  const BLOCKED = new Set(['position', 'position_look', 'look', 'flying', 'vehicle_move'])
  const rawWrite = bot._client.write.bind(bot._client)
  bot._client.write = (name, params) => {
    if (BLOCKED.has(name)) return
    return rawWrite(name, params)
  }
  bot.physicsEnabled = false

  let timer = null
  let ended = false

  const reconnect = (why) => {
    if (ended) return
    ended = true
    if (timer) clearInterval(timer)
    console.log(`[AFK] Disconnected (${why}). Reconnecting in ${RECONNECT_MS / 1000}s...`)
    setTimeout(start, RECONNECT_MS)
  }

  bot.once('login', () => console.log(`[AFK] Logged in. Protocol version used: ${bot.version}`))

  bot.once('spawn', () => {
    console.log('[AFK] Joined the server.')
    timer = setInterval(() => {
      try { bot.swingArm('right') } catch (e) {}
    }, 20000)
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

// Render web services must listen on $PORT, otherwise the deploy fails.
// Ping this URL every ~5 minutes (e.g. UptimeRobot) to stop the free tier sleeping.
if (process.env.PORT) {
  http.createServer((req, res) => { res.end('AFK bot running') }).listen(process.env.PORT, () => {
    console.log('[AFK] Health server on port ' + process.env.PORT)
  })
}
