export type ThemeMode = 'light' | 'dark' | 'system'
export type DensityMode = 'comfortable' | 'compact'
export type DeviceMode = 'desktop' | 'mobile'
export type LayoutMode = 'vertical' | 'horizontal' | 'content-fullscreen'
export type ContentWidthMode = 'fluid' | 'fixed'
export type BreadcrumbStyle = 'normal' | 'background'
export type TabStyle = 'chrome' | 'card' | 'plain'

import type { ThemePreset } from '@/config/theme-presets'

export interface AppState {
  theme: ThemeMode;
  density: DensityMode;
  menuCollapse: boolean;
  menuWidth: number;
  globalSettings: boolean;
  device: DeviceMode;
  tabBar: boolean;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkIncludeUser: boolean;
  watermarkIncludeTime: boolean;
  watermarkOpacity: number;
  themePreset: ThemePreset;
  customThemeColor: string;
  radius: number;
  fontSize: number;
  semiDarkSidebar: boolean;
  semiDarkSidebarChildren: boolean;
  semiDarkHeader: boolean;
  layoutMode: LayoutMode;
  contentWidth: ContentWidthMode;
  sidebarVisible: boolean;
  sidebarDraggable: boolean;
  sidebarHoverExpand: boolean;
  sidebarShowCollapseButton: boolean;
  headerVisible: boolean;
  breadcrumbEnabled: boolean;
  breadcrumbHideOnlyOne: boolean;
  breadcrumbShowHome: boolean;
  breadcrumbShowIcon: boolean;
  breadcrumbStyle: BreadcrumbStyle;
  tabPersist: boolean;
  tabHistory: boolean;
  tabMaxCount: number;
  tabDraggable: boolean;
  tabWheelable: boolean;
  tabMiddleClickClose: boolean;
  tabShowIcon: boolean;
  tabShowMore: boolean;
  tabShowMaximize: boolean;
  tabStyle: TabStyle;
  widgetLocale: boolean;
  widgetTheme: boolean;
  widgetFullscreen: boolean;
  widgetLock: boolean;
  footerVisible: boolean;
  footerFixed: boolean;
  footerDescription: string;
  copyrightEnabled: boolean;
  copyrightCompanyName: string;
  copyrightCompanyUrl: string;
  preferencesPinned: boolean;
  dynamicTitle: boolean;
  progressEnabled: boolean;
  pageTransition: boolean;
  showCopyPreferences: boolean;
  shortcutEnabled: boolean;
  shortcutLockScreen: boolean;
  shortcutLogout: boolean;
  shortcutPreferences: boolean;
  shortcutCloseTab: boolean;
  timeZone: string;
}

export type UiPreferences = Pick<
  AppState,
  | 'theme'
  | 'density'
  | 'menuCollapse'
  | 'tabBar'
  | 'watermarkEnabled'
  | 'watermarkText'
  | 'watermarkIncludeUser'
  | 'watermarkIncludeTime'
  | 'watermarkOpacity'
  | 'themePreset'
  | 'customThemeColor'
  | 'radius'
  | 'fontSize'
  | 'semiDarkSidebar'
  | 'semiDarkSidebarChildren'
  | 'semiDarkHeader'
  | 'layoutMode'
  | 'contentWidth'
  | 'sidebarVisible'
  | 'menuWidth'
  | 'sidebarDraggable'
  | 'sidebarHoverExpand'
  | 'sidebarShowCollapseButton'
  | 'headerVisible'
  | 'breadcrumbEnabled'
  | 'breadcrumbHideOnlyOne'
  | 'breadcrumbShowHome'
  | 'breadcrumbShowIcon'
  | 'breadcrumbStyle'
  | 'tabPersist'
  | 'tabHistory'
  | 'tabMaxCount'
  | 'tabDraggable'
  | 'tabWheelable'
  | 'tabMiddleClickClose'
  | 'tabShowIcon'
  | 'tabShowMore'
  | 'tabShowMaximize'
  | 'tabStyle'
  | 'widgetLocale'
  | 'widgetTheme'
  | 'widgetFullscreen'
  | 'widgetLock'
  | 'footerVisible'
  | 'footerFixed'
  | 'footerDescription'
  | 'copyrightEnabled'
  | 'copyrightCompanyName'
  | 'copyrightCompanyUrl'
  | 'preferencesPinned'
  | 'dynamicTitle'
  | 'progressEnabled'
  | 'pageTransition'
  | 'showCopyPreferences'
  | 'shortcutEnabled'
  | 'shortcutLockScreen'
  | 'shortcutLogout'
  | 'shortcutPreferences'
  | 'shortcutCloseTab'
  | 'timeZone'
>
