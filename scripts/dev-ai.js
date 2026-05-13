const { spawn, spawnSync } = require('node:child_process')
const path = require('node:path')

const serviceDir = path.join(__dirname, '..', 'server', 'ai-service')
const candidates =
  process.platform === 'win32'
    ? [
        { command: 'py', args: ['-3'] },
        { command: 'python', args: [] },
        { command: 'python3', args: [] },
      ]
    : [
        { command: 'python3', args: [] },
        { command: 'python', args: [] },
      ]

function commandExists(candidate) {
  const probe = spawnSync(candidate.command, [...candidate.args, '--version'], {
    cwd: serviceDir,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  })

  return !probe.error && probe.status === 0
}

const python = candidates.find(commandExists)

if (!python) {
  console.log('[AI] Python introuvable. Service IA ignore en local.')
  console.log('[AI] Installe Python 3 puis relance npm run dev, ou utilise npm run dev:win pour lancer sans IA.')
  process.exit(0)
}

const child = spawn(python.command, [...python.args, 'dev_server.py'], {
  cwd: serviceDir,
  stdio: 'inherit',
  shell: false,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
