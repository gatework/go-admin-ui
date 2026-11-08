/** One selectable row in a NavList. */
export interface NavListItem {
  key: string | number
  title: string
  /** Muted second line, e.g. an IP or a version. */
  description?: string
}
