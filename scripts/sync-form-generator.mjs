/** Copy a verified, local build from the maintained fork; normal UI builds need no sibling checkout. */
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs'
import { resolve, join, dirname, relative, normalize } from 'node:path'
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
const files = new Set([...Object.keys(manifest.files).map(file => normalize(file)), 'SOURCE.json'])
mkdirSync(target, { recursive: true })
for (const file of files) {
  mkdirSync(dirname(join(target, file)), { recursive: true })
  cpSync(join(source, file), join(target, file))
}
for (const entry of readdirSync(target, { recursive: true, withFileTypes: true })) {
  const path = join(entry.parentPath, entry.name)
  if (!entry.isDirectory() && !files.has(relative(target, path))) rmSync(path, { force: true })
}
console.log(`Synced ${Object.keys(manifest.files).length} verified files from ${manifest.repository} (${manifest.sourceHash})`)
