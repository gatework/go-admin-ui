import { describe, expect, it } from 'vitest'
import defaults from '@/config/preferences.json'
import { PREFERENCE_GROUPS } from '@/config/preference-schema'
import zh from '@/lang/zh-CN'
import en from '@/lang/en-US'

const fields = PREFERENCE_GROUPS.flatMap(group => group.fields)

describe('preference schema', () => {
  it('only names keys the store has a default for', () => {
    for (const field of fields) expect(Object.hasOwn(defaults, field.key), field.key).toBe(true)
  })

  it('lists each key once', () => {
    const keys = fields.map(field => field.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('offers the default among a choice field\'s options', () => {
    for (const field of fields) {
      if (field.control !== 'segmented' && field.control !== 'select') continue
      const values = field.options.map(option => option.value)
      expect(values, field.key).toContain(defaults[field.key as keyof typeof defaults])
    }
  })

  it('keeps a numeric default inside its range', () => {
    for (const field of fields) {
      if (field.control !== 'number') continue
      const value = defaults[field.key as keyof typeof defaults] as number
      expect(value >= field.min && value <= field.max, field.key).toBe(true)
    }
  })

  // A missing key renders as the raw key string, in whichever language lacks it.
  it('has every label in both language packs', () => {
    const labels = [
      ...PREFERENCE_GROUPS.map(group => group.title),
      ...fields.flatMap(field => [field.label, field.description]),
      ...fields.flatMap(field => 'options' in field ? field.options.filter(option => !option.raw).map(option => option.label) : [])
    ].filter((label): label is string => Boolean(label))
    for (const pack of [zh, en] as Array<Record<string, unknown>>) {
      for (const label of labels) expect(typeof pack[label], label).toBe('string')
    }
  })
})
