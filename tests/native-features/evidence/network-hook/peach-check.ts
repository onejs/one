import { writeFileSync } from 'node:fs'
const sim = process.argv[2]
const root = '/Users/n8/Library/Logs/one-network-hook-proof'
async function run(args: string[]) {
 const child = Bun.spawn(['peach', '--port', '7814', '--sim', sim, ...args], {stdout: 'pipe', stderr: 'pipe'})
 const stdout = await new Response(child.stdout).text()
 const stderr = await new Response(child.stderr).text()
 if (await child.exited !== 0) throw new Error(stdout+stderr)
 return stdout
}
const receipts = []
for (const mount of [0, 1, 2]) {
 if (mount) { await run(['do', 'tap-text', 'index']); await run(['do', 'tap', 'nav-one-native-network']) }
 const stdout = await run(['describe', '--json'])
 writeFileSync(`${root}/peach-mount-${mount}.txt`, stdout)
 const data = JSON.parse(stdout.slice(stdout.indexOf('{'), stdout.lastIndexOf('}')+1))
 const state = data.tree.match(/State: ([^"\n]+)/)?.[1]
 const hook = data.tree.match(/Hook: ([^"\n]+)/)?.[1]
 const events = Number(data.tree.match(/Events: (\d+)/)?.[1])
 if (!state || state !== hook || !state.endsWith(' true true') || !(events >= 1)) throw new Error(`Peach mount ${mount}: ${JSON.stringify({state, hook, events})}`)
 receipts.push({mount, state, hook, events})
}
writeFileSync(`${root}/peach-receipts.json`, JSON.stringify({label: 'RAN', sim, scope: 'Peach simulated OneNetwork state, not NWPathMonitor', receipts}, null, 2)+'\n')
console.log('PASS Peach fixture hook agreement on mount and two route remounts')
