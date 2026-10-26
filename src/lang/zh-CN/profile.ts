/**
 * The account pages: the summary card, the two tabs, and the avatar cropper.
 *
 * UI copy is maintained with the corresponding English pack.
 */
export default {
  alignment: { 'description': '管理个人资料、账户密码和当前浏览器的界面偏好。', 'localPreferences': '界面偏好仅保存在当前浏览器，可随时重置。', 'loadError': '个人资料加载失败，请重试。', 'backendDifferences': 'API 令牌、会话管理、通知和联系邮箱验证暂不可用。' },
  title: '个人信息',
  username: '用户名称',
  phone: '手机号码',
  email: '用户邮箱',
  dept: '所属部门',
  role: '所属角色',
  createdAt: '创建日期',
  noRole: '暂无',

  basic: '基本资料',
  tabs: {
    info: '基本资料',
    password: '修改密码'
  },

  info: {
    nickName: '用户昵称',
    phone: '手机号码',
    phoneHint: '请输入中国大陆 11 位手机号码。',
    email: '邮箱',
    sex: '性别',
    male: '男',
    female: '女',
    rules: {
      nickName: '请填写用户昵称',
      emailRequired: '请填写邮箱地址',
      emailFormat: '请输入正确的邮箱地址',
      phoneRequired: '请填写手机号码',
      phoneFormat: '请输入正确的手机号码'
    }
  },

  password: {
    old: '当前密码',
    oldPlaceholder: '请输入当前密码',
    new: '新密码',
    newPlaceholder: '请输入新密码',
    hint: '新密码需为 6–20 个字符。',
    save: '修改密码',
    confirm: '确认新密码',
    confirmPlaceholder: '请再次输入新密码',
    rules: {
      oldRequired: '请输入当前密码',
      newRequired: '请输入新密码',
      length: '请输入 6–20 个字符',
      confirmRequired: '请再次输入新密码',
      mismatch: '两次输入的密码不一致'
    }
  },

  avatar: {
    zoomIn: '放大',
    zoomOut: '缩小',
    rotateLeft: '向左旋转',
    rotateRight: '向右旋转',
    fileRule: '请选择 5 MB 以内的 JPG、PNG 或 WebP 图片。',

    hint: '更换头像',
    upload: '选择图片',
    submit: '保存头像',
    dialogTitle: '修改头像',
    wrongType: '请选择 JPG、PNG 或 WebP 图片。'
  },

  save: '保存资料',
  close: '关闭'
}
