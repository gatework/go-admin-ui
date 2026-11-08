import test from 'node:test'
import assert from 'node:assert/strict'
import { migrationMenus } from '../lib/migration-menus.mjs'

test('reads migration directory/page names with nested API bindings and ignores buttons', () => {
  const source = `seed.SeedMenus(tx, "network", []seed.MenuSpec{
    {Code: "management", Kind: models.Directory, Title: "网络管理"},
    {Title: "设备 {管理}", ApiCodes: []string{"list", "options"}, Kind: models.Menu, Code: "device-manage"},
    {Code: "device-edit", Kind: models.Button, Title: "编辑"},
  }, []seed.ApiSpec{})`
  assert.deepEqual(migrationMenus(source), [
    { name: 'NetworkManagement', title: '网络管理' },
    { name: 'NetworkDeviceManage', title: '设备 {管理}' }
  ])
})

test('does not invent names for dynamic specs or unrelated fields', () => {
  assert.deepEqual(migrationMenus('seed.SeedMenus(tx, appCode, menus, apis)'), [])
  assert.deepEqual(migrationMenus('seed.SeedMenus(tx, "demo", []seed.MenuSpec{{Code: "list", Kind: kind, Title: title}}, apis)'), [])
})
