import { describe, expect, it } from 'vitest'
import { migrationMenus } from '../../../scripts/lib/migration-menus.mjs'

describe('migration menu language contracts', () => {
  it('reads named literal menu slices before appended permission actions', () => {
    const source = `menus := []seed.MenuSpec{{Code: "delivery-manage", Kind: models.Menu, Title: "Configuration {delivery}", ApiCodes: []string{"list"}}}
      menus = append(menus, operationButtons...)
      return seed.SeedMenus(tx, "network", menus, apis)`
    expect(migrationMenus(source)).toEqual([{ name: 'NetworkDeliveryManage', title: 'Configuration {delivery}' }])
  })

  it('continues to recognize inline menus and excludes permission buttons', () => {
    expect(migrationMenus(`seed.SeedMenus(tx, "network", []seed.MenuSpec{
      {Code: "management", Title: "Network", Kind: models.Directory},
      {Code: "execute", Title: "Execute", Kind: models.Button}}, apis)`)).toEqual([{ name: 'NetworkManagement', title: 'Network' }])
  })

  // The backend renamed seed.SeedMenus to seed.Menus; the i18n check read no
  // network menu at all against it and reported every translation as unknown.
  it('reads the current seed.Menus spelling with contract kinds', () => {
    expect(migrationMenus(`return seed.Menus(tx, "network", []seed.MenuSpec{
      {Code: "management", Kind: contractmodels.Directory, Title: "网络管理", Path: "/network"},
      {Code: "device-manage", Parent: "management", Kind: contractmodels.Menu, Title: "设备管理"},
      {Code: "device-list", Parent: "device-manage", Kind: contractmodels.Button, Title: "查询台账"},
    })`)).toEqual([
      { name: 'NetworkManagement', title: '网络管理' },
      { name: 'NetworkDeviceManage', title: '设备管理' }
    ])
  })
})
