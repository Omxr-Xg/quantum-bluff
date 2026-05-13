const startedAt = Date.now()

console.log(`[server] boot: loading application modules (${new Date().toISOString()})`)

await import('./index.js')

console.log(`[server] boot: module import completed in ${Date.now() - startedAt}ms`)
