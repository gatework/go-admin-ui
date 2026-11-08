import type { DiagnosticTool } from '@/types/diagnostics'

export type TerminalTone = 'command' | 'hop' | 'metric' | 'asn' | 'annotation' | 'muted'
export interface TerminalPart { text: string; tone?: TerminalTone }

const ansi = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g')

export function plainDiagnosticOutput(output: string): string {
  return output.replace(ansi, '').replace(/\r\n?/g, '\n')
}

// Highlight only recognizable fields. Whitespace and all unknown text stay intact.
export function formatDiagnosticOutput(text: string, tool: DiagnosticTool): TerminalPart[] {
  const hop = tool === 'mtr' ? '^[\\t ]*\\d+\\.\\|--' : ['nexttrace', 'traceroute'].includes(tool) ? '^[\\t ]*\\d+(?=[\\t ])' : '(?!)'
  const pattern = new RegExp([
    `(?<hop>${hop})`,
    '(?<metric>\\b\\d+(?:\\.\\d+)?(?:[\\t ]*(?:[munµ]?s|[KMGT]?(?:bits|Bytes)/sec|[KMGT]?Bytes|sec)\\b|%))',
    '(?<asn>\\bAS\\d+\\b)',
    '(?<annotation>\\bRFC\\d+\\b)',
    '(?<muted>\\*)'
  ].join('|'), 'gm')
  const parts: TerminalPart[] = []
  let offset = 0
  for (const match of text.matchAll(pattern)) {
    // A noisy tool can fill the 256 KiB buffer. Keep its tail as one text node.
    if (parts.length + (match.index > offset ? 2 : 1) > 4096) break
    if (match.index > offset) parts.push({ text: text.slice(offset, match.index) })
    const tone = Object.keys(match.groups!).find(key => match.groups![key] !== undefined) as TerminalTone
    parts.push({ text: match[0], tone })
    offset = match.index + match[0].length
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) })
  return parts
}

export function formatDiagnosticCommand(command: string, target: string): TerminalPart[] {
  return command.split(/(\s+)/).map((text, index) => ({
    text,
    tone: index === 0 ? 'command' : text === target ? 'hop' : text.startsWith('-') ? 'muted' : undefined
  }))
}
