/** Copy a verified, local build from the maintained fork; normal UI builds need no sibling checkout. */
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
const source = resolve(process.argv[2] ?? '../form-generator/arco/dist')
const target = resolve(import.meta.dirname, '../public/form-generator')
if (source === target) throw new Error('Source and destination must differ')
const manifest = JSON.parse(readFileSync(join(source, 'SOURCE.json'), 'utf8'))
if (manifest.repository !== 'https://github.com/gatework/form-generator' || manifest.branch !== 'feat/arco-design-vue') throw new Error('Unexpected source repository or branch')
for (const [file, hash] of Object.entries(manifest.files)) {
  if (file.includes('..') || file.startsWith('/')) throw new Error('Invalid artifact path')
  const actual = createHash('sha256').update(readFileSync(join(source, file))).digest('hex')
  if (hash !== actual) throw new Error(`Checksum mismatch: ${file}`)
}
if (!manifest.files['index.html'] || !manifest.files['LICENSE']) throw new Error('Incomplete designer build')
if (existsSync(target) && !existsSync(join(target, 'SOURCE.json')) && readdirSync(target).length) throw new Error('Destination is not a managed designer build')
const previous = existsSync(join(target, 'SOURCE.json')) ? JSON.parse(readFileSync(join(target, 'SOURCE.json'), 'utf8')).files : {}
mkdirSync(target, { recursive: true })
for (const file of [...Object.keys(manifest.files), 'SOURCE.json']) {
  mkdirSync(dirname(join(target, file)), { recursive: true })
  cpSync(join(source, file), join(target, file))
}
for (const file of Object.keys(previous)) {
  if (!file.includes('..') && !file.startsWith('/') && !(file in manifest.files)) rmSync(join(target, file), { force: true })
}
console.log(`Synced ${Object.keys(manifest.files).length} verified files from ${manifest.repository} (${manifest.sourceHash})`)
