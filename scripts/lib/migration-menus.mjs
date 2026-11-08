/** Read inline or named literal menu slices; computed specifications remain unknown. */
export function migrationMenus(source) {
  const menus = []
  const calls = /\bseed\.SeedMenus\(\s*[^,]+,\s*("(?:\\.|[^"\\])*"),\s*(\[\]seed\.MenuSpec\s*\{|[A-Za-z_]\w*)/g
  const pascal = value => value.split(/[-_]+/).filter(Boolean).map(part => part[0].toUpperCase() + part.slice(1)).join('')
  for (const call of source.matchAll(calls)) {
    const app = JSON.parse(call[1])
    let bodyStart = call.index + call[0].length
    if (!call[2].startsWith('[]')) {
      const declarations = [...source.slice(0, call.index).matchAll(new RegExp(`\\b${call[2]}\\s*:=\\s*\\[\\]seed\\.MenuSpec\\s*\\{`, 'g'))]
      const declaration = declarations.at(-1)
      if (!declaration) continue
      bodyStart = declaration.index + declaration[0].length
    }
    let depth = 1
    let start = -1
    let quoted = false
    for (let i = bodyStart; i < source.length && depth; i++) {
      const char = source[i]
      if (quoted) {
        if (char === '\\') i++
        else if (char === '"') quoted = false
        continue
      }
      if (char === '"') { quoted = true; continue }
      if (char === '{') { if (depth === 1) start = i; depth++ }
      if (char !== '}') continue
      depth--
      if (depth !== 1 || start < 0) continue
      const object = source.slice(start, i + 1)
      const stringField = name => {
        const value = object.match(new RegExp(`\\b${name}:\\s*("(?:\\\\.|[^"\\\\])*")`))
        return value ? JSON.parse(value[1]) : null
      }
      const code = stringField('Code')
      const title = stringField('Title')
      if (code && title && /\bKind:\s*\w+\.(Directory|Menu)\b/.test(object)) {
        menus.push({ name: pascal(app) + pascal(code), title })
      }
      start = -1
    }
  }
  return menus
}
