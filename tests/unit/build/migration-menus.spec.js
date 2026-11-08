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
})
