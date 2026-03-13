import 'dotenv/config'

// dotenvが.envを読めなかった場合の手動フォールバック
if (!process.env.DATABASE_URL) {
  const { readFileSync } = await import('node:fs')
  const { resolve, dirname } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const envPath = resolve(__dirname, '..', '.env')
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
}

const { buildApp } = await import('./app.js')
const { cfg } = await import('./config/index.js')

buildApp()
  .then((app) => app.listen({ host: '0.0.0.0', port: cfg.port }))
  .catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })
