# Arco 菜单图标与本地演示时间

菜单字段直接存储 Arco 图标名称，不在浏览器中将旧 SVG 名称映射为新图标。
功能分配与持久化迁移由后端 `cmd/migrate/migration/version/1792940400000_arco_menu_icons.go` 维护，按 `menu_name` 精确更新内置目录和页面；前端只渲染数据库返回的 Arco 名称，不修改权限按钮、自定义菜单或路由。

示例：系统管理 `apps`，用户 `user`，角色 `safe`，部门 `branch`，岗位 `idcard`，菜单 `menu`，字典 `book`，接口 `link`，参数 `storage`，设置 `settings`，开发工具 `code-square`，监控 `desktop`，任务 `calendar-clock`。

新安装的 SQL 种子已经使用 Arco 名称；正常执行后端 migrate 会补齐历史迁移写入的图标。迁移记录保证只执行一次，之后用户在编辑器中的选择保持有效。时间重置不进入自动迁移。

2026-10-25 按用户指示，在本地开发数据库 `goadmin_development` 的同一事务中更新了 26 条内置目录/页面图标，以及 72 条未删除菜单记录的 `created_at`、`updated_at`。时间为 2026-10-25 22:48:07（Asia/Hong_Kong）。这是本地开发数据的显式调整，不是客户端伪造显示日期；时间重置不进入通用迁移。

执行前备份：`/tmp/go-admin-menu-before-arco.csv`，包含菜单 ID、路由名、原图标、原创建时间和原更新时间。执行后已读回记录数、图标和时间。
