// AFK bot: joins your server as a real player (offline-mode servers only),
// stays "active" with tiny movements, and reconnects if kicked/disconnected.
const mineflayer = require('mineflayer')
const http = require('http')

const HOST = process.env.MC_HOST || process.argv[2] || 'localhost'
const PORT = parseInt(process.env.MC_PORT || process.argv[3] || '25565', 10)
const VERSION = process.env.MC_VERSION || process.argv[4] || false // false = auto-detect
const USERNAME = process.env.MC_USER || 'AFK'
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

  let timer = null
  let ended = false

  const reconnect = (why) => {
    if (ended) return
    ended = true
    if (timer) clearInterval(timer)
    console.log(`[AFK] Disconnected (${why}). Reconnecting in ${RECONNECT_MS / 1000}s...`)
    setTimeout(start, RECONNECT_MS)
  }

  bot.once('spawn', () => {
    console.log('[AFK] Joined the server.')
    let tick = 0
    timer = setInterval(() => {
      tick++
      // look around a bit and hop every so often so the session counts as active
      bot.look(bot.entity.yaw + (Math.random() - 0.5), 0, true)
      if (tick % 4 === 0) {
        bot.setControlState('jump', true)
        setTimeout(() => bot.setControlState('jump', false), 250)
      }
      if (tick % 12 === 0) bot.swingArm('right')
    }, 15000)
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
