const storage = {
  set(key, value) {
    try { localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value) } catch { /* Keep in-memory state usable. */ }
  },
  get(key) {
    try {
      const value = localStorage.getItem(key)
      return value && value.indexOf('{') !== -1 ? JSON.parse(value) : value
    } catch { return null }
  },
  remove(key) {
    try { localStorage.removeItem(key) } catch { /* Storage may be blocked. */ }
  },
  clear() {
    try { localStorage.clear() } catch { /* Storage may be blocked. */ }
  }
}

export default storage
