/**
 * Checks the front end's field names against the Go structs that produce them.
 *
 * Two bugs of exactly this shape shipped green: the login log keyed rows on
 * `infoId` and the department page tested `row.p_id`, neither of which any Go
 * struct declares. Both were invisible because the e2e fixtures had been written
 * from the front end's assumption rather than from the model, so the mock and
 * the page agreed with each other and disagreed with the server.
 *
 * Three directions are checked:
 *   1. fixture row keys      -> model json tags
 *   2. `row.x` / column prop -> model json tags
 *   3. query keys sent       -> DTO `form:` tags
 *
 * Needs the Go repository beside this one (or GO_ADMIN_PATH). Skips with a
 * notice when it is absent, so a UI-only checkout still installs and builds.
 *
 * Run: node scripts/check-api-contract.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const UI = join(dirname(fileURLToPath(import.meta.url)), '..')
const GO = process.env.GO_ADMIN_PATH ?? join(UI, '..', 'go-admin')

/**
 * go-admin-core, which owns the bases every model embeds.
 *
 * common/models used to declare ControlBy, Model and ModelTime itself; since
 * the contract surface moved down into go-admin-core (its PRD 006) it declares
 * them as type aliases into that repository instead. An alias is the same type,
 * so nothing changed on the wire -- but the fields those bases carry (id,
 * createdAt, updatedAt, createBy, updateBy) are now declared over there, and a
 * checkout without it can only conclude that every model has lost them.
 */
const goModFile = join(GO, 'go.mod')
const coreVersion = existsSync(goModFile)
  ? readFileSync(goModFile, 'utf8').match(/^\s*github\.com\/go-admin-team\/go-admin-core\/v2\s+(\S+)/m)?.[1]
  : undefined
let goModCache = process.env.GOMODCACHE
if (!goModCache && existsSync(goModFile)) {
  try {
    goModCache = execFileSync('go', ['env', 'GOMODCACHE'], {
      cwd: GO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch {
    // UI-only containers can supply GOMODCACHE without installing Go.
    // The required-models check below reports any missing contract sources.
  }
}
const cachedCore = goModCache && coreVersion
  ? join(goModCache, `github.com/go-admin-team/go-admin-core/v2@${coreVersion}`)
  : undefined
const CORE = process.env.GO_ADMIN_CORE_PATH ?? cachedCore

/** Where in that repository the bases live -- named once, so the diagnostic
 *  below names the directory actually read rather than the repository root. */
const CORE_MODELS = 'sdk/contract/models'

/**
 * Skipping keeps a UI-only checkout building; --require-models turns the skip
 * into a failure, which is what CI passes. Without it a broken checkout step
 * would leave this job green while it checked nothing at all.
 */
const required = process.argv.includes('--require-models')

if (!existsSync(join(GO, 'app/admin/models'))) {
  const where = `no Go repository at ${GO} (set GO_ADMIN_PATH to point at one)`
  if (required) {
    console.error(`cannot check the api contract: ${where}`)
    process.exit(1)
  }
  console.log(`skipped: ${where}`)
  process.exit(0)
}

// ── Parsing the Go side ───────────────────────────────────────────

/** struct name -> [[jsonName, goType]], with embedded structs kept as markers. */
const parseStructs = (source, qualifiedEmbeds = false) => {
  const structs = {}
  let current = null
  for (const line of source.split('\n')) {
    const open = line.match(/^type (\w+) struct \{/)
    if (open) { current = open[1]; structs[current] = []; continue }
    if (!current) continue
    if (line.startsWith('}')) { current = null; continue }

    const field = line.match(/^\s*(\w+)\s+([\w.[\]*]+)\s+`([^`]*)`/)
    if (field) {
      const tag = field[3].match(/json:"([^",]+)/)
      if (tag && tag[1] !== '-') structs[current].push([tag[1], field[2]])
      continue
    }
    const embedded = line.match(/^\s*((?:\w+\.)?\w+)\s*(?:`[^`]*`)?\s*$/)
    if (embedded) {
      structs[current].push(['@embed', qualifiedEmbeds ? embedded[1] : embedded[1].split('.').pop()])
    }
  }
  return structs
}

const goFiles = dir => readdirSync(dir).filter(f => f.endsWith('.go')).map(f => join(dir, f))

const MODEL_DIRS = [
  [GO, 'common/models'],
  [GO, 'app/admin/models'],
  [GO, 'app/demo/models'], // the reference module
  [GO, 'app/jobs/models'], // scheduled jobs
  [GO, 'app/network/models'], // network inventory
  [GO, 'app/delivery/models'], // persistent configuration delivery
  [GO, 'app/delivery/service'], // delivery device response
  [GO, 'app/fabric/models'], // Fabric persistence and operation response
  [GO, 'app/fabric/service/dto'], // assessed Fabric summary and membership response
  [GO, 'app/other/models/tools'], // the code generator's own tables
  // Last, so a base the Go repository still declares itself is the one used.
  // This is where the aliased ones are read from once it has stopped.
  [CORE, CORE_MODELS]
]

const structs = {}
for (const [root, dir] of MODEL_DIRS) {
  if (!root) continue
  const path = join(root, dir)
  if (!existsSync(path)) continue
  for (const file of goFiles(path)) {
    for (const [name, fields] of Object.entries(parseStructs(readFileSync(file, 'utf8')))) {
      // First directory wins, so the order above is the resolution order
      if (!(name in structs)) structs[name] = fields
    }
  }
}

/**
 * Embedded bases no directory above declares.
 *
 * Reported on their own rather than left to surface as missing fields. When
 * ModelTime could not be read, every model looked as though it had lost
 * createdAt and the run printed 32 field mismatches -- each one true as stated
 * and all of them the same single cause, which is a poor way to learn that a
 * source directory has moved.
 */
const unresolved = new Set()

/** Flattens a struct's own and embedded fields into jsonName -> goType. */
const fieldsOf = (name, seen = new Set()) => {
  if (seen.has(name) || !structs[name]) return {}
  seen.add(name)
  const out = {}
  for (const [json, type] of structs[name]) {
    if (json === '@embed') {
      if (!structs[type]) unresolved.add(type)
      Object.assign(out, fieldsOf(type, seen))
    } else out[json] = type
  }
  return out
}

const formTagsOf = dtoFile => {
  for (const dir of DTO_DIRS) {
    const path = join(GO, dir, dtoFile)
    if (existsSync(path)) {
      return new Set([...readFileSync(path, 'utf8').matchAll(/form:"(\w+)"/g)].map(m => m[1]))
    }
  }
  return null
}

// ── What the front end claims ─────────────────────────────────────

/**
 * Frontend model name -> Go struct, for the few that cannot be matched by name.
 * Everything else is derived from the `useTable<Model, Query>` the page already
 * declares, so a page joining the composable layer is covered without anyone
 * remembering to add it here.
 */
const MODEL_ALIASES = {
  Fabric: 'Summary',
  DeliveryOrder: 'Order',
  ConfigRow: 'SysConfig', // a local intersection type in sys-config
  Product: 'DemoProduct' // the demo module names its struct after its table
}

/** Where a resource's DTO may live. */
const DTO_DIRS = [
  'app/admin/service/dto',
  'app/demo/service/dto',
  'app/jobs/service/dto',
  'app/network/service/dto',
  'app/delivery/service/dto',
  'app/fabric/service/dto',
  'app/other/service/dto'
]

const snakeCase = name => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

/** Every .vue under src/views, recursively. */
const vueFiles = function * (dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield * vueFiles(path)
    else if (entry.name.endsWith('.vue')) yield path
  }
}

/** Derives page -> model from the useTable generic each migrated page states. */
const migratedPages = () => {
  const found = {}
  for (const path of vueFiles(join(UI, 'src/views'))) {
    const text = readFileSync(path, 'utf8')
    const declared = text.match(/useTable<\s*(\w+)\s*,/) || (path.includes('/network/wireless/') ? text.match(/useListing<\s*(\w+)\s*>/) : null)
    if (!declared) continue
    const name = declared[1]
    found[path.slice(join(UI, 'src/views').length + 1)] = MODEL_ALIASES[name] ?? name
  }
  return found
}

/**
 * Pages still on the Options API that render backend rows.
 *
 * They get the row check only: their queries go through `this.queryParams` and
 * several run through addDateRange, which attaches keys of its own -- comparing
 * those against a DTO would report noise rather than defects. Move a page into
 * PAGES when it migrates, and it picks up the query check too.
 *
 * Pages with no backend rows at all (dashboard, profile, login, error pages)
 * are deliberately absent: there is no contract to check.
 */
const OPTIONS_PAGES = {
  'dev-tools/gen/editTable.vue': ['SysTables', 'SysColumns'],
  'dev-tools/gen/genInfoForm.vue': ['SysTables'],
  'dev-tools/gen/basicInfoForm.vue': ['SysTables']
}

/** fixture export -> model. */
const FIXTURES = {
  userRows: 'SysUser',
  deptRows: 'SysDept',
  menuRows: 'SysMenu',
  roleRows: 'SysRole',
  postRows: 'SysPost',
  configRows: 'SysConfig',
  loginLogRows: 'SysLoginLog',
  operLogRows: 'SysOperaLog'
}

/**
 * Keys the front end may use that no model declares.
 * `children` is assembled by the tree endpoints; paging is the shared request
 * struct rather than any one DTO.
 */
const ALLOWED = new Set(['children', 'pageIndex', 'pageSize'])

/**
 * Fields a type may declare that its Go struct does not, with the reason.
 *
 * Keep this short. Every entry is a place the front end and the server disagree
 * on purpose, and an entry added to silence the check rather than to record a
 * decision is how the check stops being worth running.
 */
const TYPE_EXCEPTIONS = {
  // The list endpoint answers with the tree nested under each node
  '*': ['children'],
  // Tagged `json:"-"` on the model: the create form sends it, nothing reads it
  // back, and this check only compares against what Go serialises out
  // Tagged `json:"-"` on the model: the create form sends it, nothing reads it
  // back, and this check only compares against what Go serialises out
  SysUser: ['password', 'postIds', 'roleIds'],
  // Assembled by the page from two endpoints, never sent by either
  SysMenu: ['apis', 'sysApi'],
  SysRole: ['menuIds', 'deptIds']
}

// ── The three comparisons ─────────────────────────────────────────

const problems = []
const note = (where, kind, keys) => {
  if (keys.length) problems.push(`${where}\n    ${kind}: ${keys.join(', ')}`)
}

/** Every field name a page reads off a row, in either API style. */
const rowFieldsIn = text => new Set([
  ...[...text.matchAll(/\b(?:scope\.row|row)\??\.(\w+)/g)].map(m => m[1]),
  ...[...text.matchAll(/<a-table-column[^>]*?\bdata-index="(\w+)"/gs)].map(m => m[1])
])

const fixtures = readFileSync(join(UI, 'tests/e2e/mocked/fixtures.ts'), 'utf8')

/** The bracketed body of `export const <name> = [...]`. */
const arrayBody = name => {
  const start = fixtures.indexOf(`export const ${name} = [`)
  if (start < 0) return null
  const i = fixtures.indexOf('[', start)
  let depth = 0
  for (let j = i; j < fixtures.length; j++) {
    if (fixtures[j] === '[') depth++
    else if (fixtures[j] === ']' && --depth === 0) return fixtures.slice(i, j + 1)
  }
  return null
}

for (const [name, model] of Object.entries(FIXTURES)) {
  const body = arrayBody(name)
  if (body === null) { problems.push(`fixtures.ts\n    no export named ${name}`); continue }
  const fields = fieldsOf(model)
  const keys = [...new Set([...body.matchAll(/^\s*'?(\w+)'?:/gm)].map(m => m[1]))]
  note(`fixtures.ts ${name} -> ${model}`, 'not on the model',
    keys.filter(k => !(k in fields) && !ALLOWED.has(k)))
}

// Wireless DTOs are parsed in an isolated namespace because Resource and
// Collection are also names used by independent modules.
const wirelessTypes = ts.createSourceFile('network-wireless.ts', readFileSync(join(UI, 'src/types/network-wireless.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
const wirelessDeclarations = new Map(wirelessTypes.statements.filter(node => ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)).map(node => [node.name.text, node]))
const wirelessStructs = {}
for (const dir of ['app/wireless/models', 'app/wireless/service/dto', 'app/wireless/service']) {
  for (const file of goFiles(join(GO, dir))) Object.assign(wirelessStructs, parseStructs(readFileSync(file, 'utf8')))
}
function wirelessGoFields(name) {
  const out = {}
  for (const [key, type] of wirelessStructs[name] || []) {
    if (key === '@embed') Object.assign(out, wirelessGoFields(type))
    else out[key] = type
  }
  return out
}
function wirelessTSFields(name) {
  const declaration = wirelessDeclarations.get(name)
  const members = new Map()
  if (!declaration || !ts.isInterfaceDeclaration(declaration)) return members
  for (const clause of declaration.heritageClauses || []) for (const type of clause.types) for (const [k, v] of wirelessTSFields(type.expression.getText(wirelessTypes))) members.set(k, v)
  for (const member of declaration.members.filter(ts.isPropertySignature)) members.set(member.name.getText(wirelessTypes), member.type)
  return members
}
const wirelessNames = { Coverage: 'WirelessCoverage', Fields: 'WirelessFields', Resource: 'WirelessResource', Controller: 'WirelessController', Suggestion: 'WirelessSuggestion', IssueOutcome: 'WirelessOutcome', IssueGroup: 'WirelessIssueGroup', Analysis: 'WirelessAnalysis', Neighbor: 'WirelessNeighbor', Switch: 'WirelessSwitch', APDetail: 'WirelessAPDetail', Collection: 'Collection', ImportPreview: 'ImportPreview', Management: 'ManagementReq' }
function wirelessShape(type) {
  if (!type) return 'unresolved'
  if (ts.isUnionTypeNode(type)) return [...new Set(type.types.filter(node => !(ts.isLiteralTypeNode(node) && node.literal.kind === ts.SyntaxKind.NullKeyword)).map(wirelessShape))].join('|')
  if (ts.isArrayTypeNode(type)) return '[]' + wirelessShape(type.elementType)
  if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) return 'string'
  if (ts.isTypeReferenceNode(type)) { const name = type.typeName.getText(wirelessTypes); const declaration = wirelessDeclarations.get(name); return declaration && ts.isTypeAliasDeclaration(declaration) ? wirelessShape(declaration.type) : name === 'Record' ? 'map' : wirelessNames[name] || name }
  if (ts.isTypeLiteralNode(type)) return 'object'
  return ({ [ts.SyntaxKind.StringKeyword]: 'string', [ts.SyntaxKind.NumberKeyword]: 'number', [ts.SyntaxKind.BooleanKeyword]: 'boolean' })[type.kind] || 'unresolved'
}
function wirelessGoShape(value) {
  const type = value.replace(/^\*/, '')
  if (type.startsWith('[]')) return '[]' + wirelessGoShape(type.slice(2))
  if (type.startsWith('map[')) return 'map'
  return ({ int: 'number', int64: 'number', float64: 'number', string: 'string', bool: 'boolean', 'time.Time': 'string', 'wireless.Dimension': 'string' })[type] || type.replace(/^(models|dto|network)\./, '')
}
for (const [name, schema] of Object.entries(wirelessNames)) {
  const fields = wirelessGoFields(schema); const members = wirelessTSFields(name)
  if (!Object.keys(fields).length) problems.push(`Wireless contract: missing Go schema ${schema}`)
  note(`network-wireless.ts ${name}`, 'missing DTO fields', Object.keys(fields).filter(key => !members.has(key)))
  note(`network-wireless.ts ${name}`, 'not on the DTO', [...members.keys()].filter(key => !(key in fields)))
  for (const [key, type] of members) {
    const shape = wirelessShape(type); const expected = wirelessGoShape(fields[key] || '')
    if (fields[key] && !['object', '[]object'].includes(shape) && shape !== expected) problems.push(`network-wireless.ts ${name}.${key}: ${shape} differs from Go ${expected}`)
  }
}
const wirelessQueryTags = new Set([...readFileSync(join(GO, 'app/wireless/service/dto/wireless.go'), 'utf8').matchAll(/form:"(\w+)"/g)].map(match => match[1]))
note('network-wireless.ts WirelessQuery', 'not accepted by Go', [...wirelessTSFields('WirelessQuery').keys()].filter(key => !wirelessQueryTags.has(key)))


const PAGES = migratedPages()

// Firewall has several independently typed tables per page. Check each bound
// ProTable against its own DTO, with package-qualified Go names so model and
// result types named AnalysisResult cannot accidentally substitute for each other.
const firewallStructs = {}
for (const [pkg, dir] of [...['models', 'types', 'storage', 'service'].map(pkg => [pkg, `app/firewall/${pkg}`]), ['connection', 'app/network/connection']]) {
  for (const file of goFiles(join(GO, dir)).filter(file => !file.endsWith('_test.go'))) {
    for (const [name, fields] of Object.entries(parseStructs(readFileSync(file, 'utf8'), true))) firewallStructs[`${pkg}.${name}`] = fields
  }
}
function firewallGoFields(qualified, seen = new Set()) {
  if (qualified.startsWith('inventory.')) return fieldsOf(qualified.split('.')[1])
  if (seen.has(qualified)) return {}
  seen.add(qualified)
  const pkg = qualified.split('.')[0]
  const out = {}
  for (const [name, type] of firewallStructs[qualified] || []) {
    if (name === '@embed') Object.assign(out, firewallGoFields(type.includes('.') ? type : `${pkg}.${type}`, seen))
    else out[name] = type
  }
  return out
}
const firewallTypes = ts.createSourceFile('firewall.ts', readFileSync(join(UI, 'src/types/firewall.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
const firewallDeclarations = new Map(firewallTypes.statements.filter(node => ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)).map(node => [node.name.text, node]))
const firewallNames = { Domain: 'models.Domain', Instance: 'models.Instance', ImportJob: 'models.Import', Snapshot: 'models.Snapshot', FirewallObject: 'storage.Object', Reference: 'models.Reference', References: 'storage.References', SavedRequest: 'models.Request', Analysis: 'models.Analysis', Draft: 'models.Draft', FirewallDevice: 'service.FirewallDevice', FirewallConnection: 'service.ConnectionStatus', CollectionBatch: 'models.CollectionBatch', CollectionTarget: 'models.CollectionTarget' }
for (const name of ['Notice', 'InputRow', 'Input', 'Term', 'NormalizedRow', 'Normalized', 'Binding', 'Settings', 'Coverage', 'TrafficPart', 'RuleTrace', 'NATStep', 'NATTrace', 'AnalysisItem', 'AnalysisResult', 'DraftChange', 'DraftItem', 'DraftResult']) firewallNames[name] = `types.${name}`
function firewallTSFields(name) {
  const declaration = firewallDeclarations.get(name)
  const members = new Map()
  if (!declaration || !ts.isInterfaceDeclaration(declaration)) return members
  for (const clause of declaration.heritageClauses || []) for (const type of clause.types) for (const [key, value] of firewallTSFields(type.expression.getText(firewallTypes))) members.set(key, value)
  for (const member of declaration.members.filter(ts.isPropertySignature)) members.set(member.name.getText(firewallTypes), member.type)
  return members
}
function firewallShape(type) {
  if (!type) return 'unresolved'
  if (ts.isArrayTypeNode(type)) return '[]' + firewallShape(type.elementType)
  if (ts.isUnionTypeNode(type)) return [...new Set(type.types.map(firewallShape))].join('|')
  if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) return 'string'
  if (ts.isTypeLiteralNode(type)) return 'object'
  if (ts.isTypeReferenceNode(type)) {
    const name = type.typeName.getText(firewallTypes)
    const declaration = firewallDeclarations.get(name)
    if (name === 'ObjectKind') return 'string'
    return declaration && ts.isTypeAliasDeclaration(declaration) ? firewallShape(declaration.type) : name === 'Record' ? 'object' : firewallNames[name] || name
  }
  return ({ [ts.SyntaxKind.StringKeyword]: 'string', [ts.SyntaxKind.NumberKeyword]: 'number', [ts.SyntaxKind.BooleanKeyword]: 'boolean' })[type.kind] || 'unresolved'
}
function firewallGoShape(type, pkg) {
  type = type.replace(/^\*/, '')
  if (type.startsWith('[]')) return '[]' + firewallGoShape(type.slice(2), pkg)
  return ({ int: 'number', int64: 'number', uint64: 'number', string: 'string', bool: 'boolean', 'time.Time': 'string', any: 'object', 'json.RawMessage': 'object' })[type] || (type.includes('.') ? type : `${pkg}.${type}`)
}
for (const [name, qualified] of Object.entries(firewallNames)) {
  const fields = firewallGoFields(qualified)
  if (!Object.keys(fields).length) problems.push(`Firewall contract: missing Go schema ${qualified}`)
  for (const [key, type] of firewallTSFields(name)) {
    if (!(key in fields)) { problems.push(`firewall.ts ${name}.${key}: not in ${qualified}`); continue }
    const actual = firewallShape(type), expected = firewallGoShape(fields[key], qualified.split('.')[0])
    if (!['object', '[]object'].includes(actual) && actual !== expected) problems.push(`firewall.ts ${name}.${key}: ${actual} differs from Go ${expected}`)
  }
}
for (const path of vueFiles(join(UI, 'src/views/network/firewall'))) {
  const source = readFileSync(path, 'utf8')
  const tables = new Map([...source.matchAll(/const\s+(\w+)\s*=\s*useTable<\s*(\w+)\s*[,>]/g)].map(match => [match[1], match[2]]))
  for (const block of source.matchAll(/<ProTable\b[\s\S]*?<\/ProTable>/g)) {
    const binding = block[0].match(/:table="(\w+)"/)?.[1]
    const name = tables.get(binding), qualified = firewallNames[name] || MODEL_ALIASES[name] || name
    const fields = firewallNames[name] ? firewallGoFields(qualified) : fieldsOf(qualified)
    const where = path.slice(join(UI, 'src/views').length + 1)
    if (!Object.keys(fields).length) { problems.push(`${where}: cannot resolve ProTable ${binding}`); continue }
    note(`${where} ${binding} -> ${qualified}`, 'read but not on the DTO', [...rowFieldsIn(block[0])].filter(key => !(key in fields) && !ALLOWED.has(key)))
  }
}

for (const [page, model] of Object.entries(PAGES)) {
  if (page.startsWith('network/firewall/')) continue // independently typed tables checked above
  const text = readFileSync(join(UI, 'src/views', page), 'utf8')
  const fields = page.startsWith('network/wireless/') ? wirelessGoFields(wirelessNames[model] || model) : fieldsOf(model)
  if (!Object.keys(fields).length) {
    // Loud rather than silently uncovered: either the struct moved, or the page
    // names its rows something new and MODEL_ALIASES needs an entry.
    problems.push(`${page}\n    useTable declares ${model}, which matches no Go struct`)
    continue
  }

  note(`${page} -> ${model}`, 'read but not on the model',
    [...rowFieldsIn(text)].filter(k => !(k in fields) && !ALLOWED.has(k)))

  const accepted = page.startsWith('network/wireless/') ? wirelessQueryTags : formTagsOf(model === 'Order' ? 'requests.go' : ['Summary', 'Member'].includes(model) ? 'fabric.go' : `${snakeCase(model)}.go`)
  if (!accepted) continue // no DTO for this resource; the row check still ran

  const sent = new Set([...text.matchAll(/\btable\.query\.(\w+)/g)].map(m => m[1]))
  const defaults = text.match(/defaultQuery:\s*\(\)\s*=>\s*\(\{(.*?)\}\)/s)
  if (defaults) for (const m of defaults[1].matchAll(/(\w+):/g)) sent.add(m[1])
  const sort = text.match(/defaultSort:\s*\{\s*prop:\s*'(\w+)'/)
  if (sort) sent.add(`${sort[1]}Order`)

  note(`${page} -> ${snakeCase(model)}.go`, 'sent but not bound by the DTO',
    [...sent].filter(k => !accepted.has(k) && !ALLOWED.has(k)))
}

for (const page of Object.keys(OPTIONS_PAGES)) {
  // A page that has migrated is covered by the derived list; leaving it here too
  // means its query check silently never runs
  if (page in PAGES) problems.push(`${page}\n    migrated -- remove it from OPTIONS_PAGES`)
}

for (const [page, models] of Object.entries(OPTIONS_PAGES)) {
  const path = join(UI, 'src/views', page)
  if (!existsSync(path)) { problems.push(`${page}\n    file not found`); continue }
  const known = Object.assign({}, ...models.map(m => fieldsOf(m)))
  if (!Object.keys(known).length) {
    problems.push(`${page}\n    no Go struct named ${models.join(' or ')}`); continue
  }
  note(`${page} -> ${models.join('+')}`, 'read but not on the model',
    [...rowFieldsIn(readFileSync(path, 'utf8'))].filter(k => !(k in known) && !ALLOWED.has(k)))
}

/**
 * The third direction: what src/types/admin.ts claims, against what Go sends.
 *
 * The page and fixture checks are usage heuristics -- they see a field only if
 * some page happens to read it through a name the regex recognises. Two field
 * names this round (DictType.dictId, SysJob.entryId) lived in the declarations
 * and were read as `item.dictId` in a v-for, which no heuristic here would have
 * caught. Comparing the declarations directly is complete rather than lucky.
 *
 * Only interfaces whose name matches a Go struct are checked; the rest are
 * front-end shapes with no counterpart, and saying so is not this file's job.
 */
const declaredTypes = readFileSync(join(UI, 'src/types/admin.ts'), 'utf8')

for (const block of declaredTypes.matchAll(/export interface (\w+) \{([^}]*)\}/g)) {
  const [, name, body] = block
  const fields = fieldsOf(name)
  if (!Object.keys(fields).length) continue // no Go struct by that name

  const declared = [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map(m => m[1])
  const allowed = new Set([...(TYPE_EXCEPTIONS['*'] ?? []), ...(TYPE_EXCEPTIONS[name] ?? [])])

  note(`src/types/admin.ts ${name}`, 'declared but not on the model',
    declared.filter(f => !(f in fields) && !allowed.has(f) && !ALLOWED.has(f)))
}

// These assessment DTOs are authoritative navigation evidence. Require a real
// parsed Go schema and exact property shapes rather than a permissive unknown.
const fabricTypes = ts.createSourceFile('network-fabric.ts', readFileSync(join(UI, 'src/types/network-fabric.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
const fabricDeclarations = new Map(fabricTypes.statements.filter(node => ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)).map(node => [node.name.text, node]))
function fabricShape(type) {
  if (!type) return 'unresolved'
  if (ts.isArrayTypeNode(type)) return '[]' + fabricShape(type.elementType)
  if (ts.isUnionTypeNode(type)) {
    const shapes = [...new Set(type.types.filter(item => item.kind !== ts.SyntaxKind.NullKeyword && !(ts.isLiteralTypeNode(item) && item.literal.kind === ts.SyntaxKind.NullKeyword)).map(fabricShape))]
    return shapes.length === 1 ? shapes[0] : 'unresolved'
  }
  if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) return 'string'
  if (ts.isTypeReferenceNode(type)) {
    const name = type.typeName.getText(fabricTypes)
    const declaration = fabricDeclarations.get(name)
    return declaration && ts.isTypeAliasDeclaration(declaration) ? fabricShape(declaration.type) : name
  }
  return ({ [ts.SyntaxKind.StringKeyword]: 'string', [ts.SyntaxKind.NumberKeyword]: 'number', [ts.SyntaxKind.BooleanKeyword]: 'boolean' })[type.kind] || 'unresolved'
}
const goFabricShape = type => {
  const clean = type.replace(/^\*/, '')
  if (clean.startsWith('[]')) return '[]' + goFabricShape(clean.slice(2))
  return ({ int: 'number', int64: 'number', string: 'string', bool: 'boolean', 'time.Time': 'string' })[clean] || clean
}
for (const name of ['IssueGroup', 'IssueDevice', 'IssueCounts']) {
  const declaration = fabricDeclarations.get(name)
  const fields = fieldsOf(name)
  if (!declaration || !ts.isInterfaceDeclaration(declaration) || !Object.keys(fields).length) {
    problems.push(`Fabric assessment contract: missing parsed schema for ${name}`)
    continue
  }
  const members = new Map(declaration.members.filter(ts.isPropertySignature).map(member => [member.name.getText(fabricTypes), member]))
  note(`network-fabric.ts ${name}`, 'missing DTO fields', Object.keys(fields).filter(key => !members.has(key)))
  note(`network-fabric.ts ${name}`, 'not on the DTO', [...members.keys()].filter(key => !(key in fields)))
  for (const [key, member] of members) {
    if (fields[key] && fabricShape(member.type) !== goFabricShape(fields[key])) problems.push(`network-fabric.ts ${name}.${key}: ${fabricShape(member.type)} differs from Go ${fields[key]}`)
  }
}

/*
 * Checked before the mismatches: an unreadable base makes its fields look
 * missing everywhere at once, so reporting those first would bury the cause
 * under its symptoms.
 */
if (unresolved.size) {
  const bases = [...unresolved].sort().join(', ')
  const where = `${bases} are embedded by the models but declared in no source this reads`
  const hint = `download the backend's pinned go-admin-core module with go mod download, or set GO_ADMIN_CORE_PATH explicitly (looked for ${CORE ? join(CORE, CORE_MODELS) : 'GOMODCACHE and a core version in go.mod'})`
  if (required) {
    console.error(`cannot check the api contract: ${where}\n  ${hint}`)
    process.exit(1)
  }
  console.log(`skipped: ${where}\n  ${hint}`)
  process.exit(0)
}

if (problems.length) {
  console.error(`API contract mismatch (${problems.length}):\n`)
  for (const p of problems) console.error(`  ${p}\n`)
  console.error('Each of these is a field the server never sends, never reads, or a model this cannot resolve.')
  process.exit(1)
}
console.log(
  `API contract ok: ${Object.keys(FIXTURES).length} fixtures, ` +
  `${Object.keys(PAGES).length} migrated pages, ${Object.keys(OPTIONS_PAGES).length} Options-API pages, ` +
  'and the declarations in types/admin.ts'
)
