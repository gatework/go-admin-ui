export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl'

/** sm: settings and short forms. md: an edit form. lg: a detail view. xl: a nested workspace. */
export const DRAWER_WIDTHS: Record<DrawerSize, number> = { sm: 440, md: 640, lg: 880, xl: 1100 }
