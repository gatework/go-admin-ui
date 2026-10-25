<template>
  <AppDrawer
    :title="t('settings.title')"
    :visible="appStore.globalSettings"
    :width="appStore.device === 'mobile' ? '100%' : 480"
    :footer="false"
    :header="false"
    :mask="!appStore.preferencesPinned"
    :mask-closable="!appStore.preferencesPinned"
    unmount-on-close
    class="preferences-drawer"
    @cancel="close"
  >
    <div ref="preferencesShellRef" class="preferences-shell">
      <header class="preferences-header">
        <div>
          <h2>{{ t('settings.title') }}</h2>
          <p>{{ t('settings.subtitle') }}</p>
        </div>
        <div class="preferences-header__actions">
          <HeaderIconButton
            :tooltip="t('settings.preference.reset')"
            motion="spin"
            @click="resetPreferences"
          >
            <icon-refresh />
          </HeaderIconButton>
          <HeaderIconButton
            :tooltip="t('settings.pin')"
            :active="appStore.preferencesPinned"
            motion="pulse"
            @click="
              appStore.updateSettings({
                preferencesPinned: !appStore.preferencesPinned,
              })
            "
          >
            <icon-pushpin />
          </HeaderIconButton>
          <HeaderIconButton :tooltip="t('settings.close')" @click="close">
            <icon-close />
          </HeaderIconButton>
        </div>
      </header>

      <nav
        class="preferences-tabs"
        role="tablist"
        :aria-label="t('settings.title')"
      >
        <button
          v-for="tab in tabs"
          :id="`preferences-tab-${tab.key}`"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          :tabindex="activeTab === tab.key ? 0 : -1"
          aria-controls="preferences-panel"
          :class="{ 'is-active': activeTab === tab.key }"
          @keydown="navigateTabs($event, tab.key)"
          @click="selectTab(tab.key)"
        >
          {{ t(tab.locale) }}
        </button>
      </nav>

      <div
        id="preferences-panel"
        ref="preferencesBodyRef"
        class="preferences-body"
        role="tabpanel"
        :aria-labelledby="`preferences-tab-${activeTab}`"
      >
        <template v-if="activeTab === 'appearance'">
          <PreferenceSection
            :title="t('settings.preference.theme')"
            :description="t('settings.preference.theme.description')"
          >
            <div class="theme-grid">
              <button
                v-for="option in themeOptions"
                :key="option.value"
                type="button"
                class="theme-card"
                :class="[
                  `theme-card--${option.value}`,
                  { 'is-active': appStore.theme === option.value },
                ]"
                @click="setTheme(option.value)"
              >
                <span class="theme-card__preview">
                  <component :is="option.icon" />
                </span>
                <strong>{{ t(option.locale) }}</strong>
                <icon-check-circle-fill
                  v-if="appStore.theme === option.value"
                  class="theme-card__check"
                />
              </button>
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.theme.chrome')">
            <div class="chrome-setting-list">
              <SettingSwitch
                :title="t('settings.theme.semiDarkSidebar')"
                :description="t('settings.theme.semiDarkSidebar.description')"
                :model-value="appStore.semiDarkSidebar"
                :disabled="appStore.darkMode || !appStore.sidebarVisible"
                @change="appStore.updateSettings({ semiDarkSidebar: $event })"
              >
                <template #icon><icon-menu /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.theme.semiDarkSidebarChildren')"
                :description="
                  t('settings.theme.semiDarkSidebarChildren.description')
                "
                :model-value="appStore.semiDarkSidebarChildren"
                :disabled="appStore.darkMode || !appStore.sidebarVisible"
                @change="
                  appStore.updateSettings({
                    semiDarkSidebarChildren: $event,
                  })
                "
              >
                <template #icon><icon-list /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.theme.semiDarkHeader')"
                :description="t('settings.theme.semiDarkHeader.description')"
                :model-value="appStore.semiDarkHeader"
                :disabled="appStore.darkMode || !appStore.headerVisible"
                @change="appStore.updateSettings({ semiDarkHeader: $event })"
              >
                <template #icon><icon-layout /></template>
              </SettingSwitch>
            </div>
          </PreferenceSection>

          <PreferenceSection
            :title="t('settings.theme.builtin')"
            :description="t('settings.theme.builtin.description')"
          >
            <ThemeColorGrid
              :model-value="appStore.themePreset"
              :custom-color="appStore.customThemeColor"
              @change="appStore.updateSettings({ themePreset: $event })"
              @custom-color="
                appStore.updateSettings({
                  customThemeColor: $event,
                  themePreset: 'custom',
                })
              "
            />
          </PreferenceSection>

          <PreferenceSection :title="t('settings.theme.radius')">
            <div class="token-segment token-segment--five">
              <button
                v-for="value in radiusOptions"
                :key="value"
                type="button"
                :class="{ 'is-active': appStore.radius === value }"
                @click="appStore.updateSettings({ radius: value })"
              >
                {{ value }}
              </button>
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.theme.fontSize')">
            <div class="number-stepper">
              <button
                type="button"
                :aria-label="t('settings.theme.fontSize.decrease')"
                :disabled="appStore.fontSize <= 12"
                @click="changeFontSize(-1)"
              >
                <icon-minus />
              </button>
              <strong>{{ appStore.fontSize }}</strong>
              <button
                type="button"
                :aria-label="t('settings.theme.fontSize.increase')"
                :disabled="appStore.fontSize >= 18"
                @click="changeFontSize(1)"
              >
                <icon-plus />
              </button>
              <span>px</span>
            </div>
          </PreferenceSection>

          <PreferenceSection
            :title="t('settings.preference.density')"
            :description="t('settings.preference.density.description')"
          >
            <div class="choice-segment">
              <button
                v-for="option in densityOptions"
                :key="option.value"
                type="button"
                :class="{ 'is-active': appStore.density === option.value }"
                @click="setDensity(option.value)"
              >
                <component :is="option.icon" />
                <span>
                  <strong>{{ t(option.locale) }}</strong>
                  <small>{{ t(option.description) }}</small>
                </span>
              </button>
            </div>
          </PreferenceSection>
        </template>

        <template v-else-if="activeTab === 'layout'">
          <PreferenceSection
            :title="t('settings.layout.title')"
            :description="t('settings.layout.description')"
          >
            <div class="layout-grid">
              <button
                v-for="option in layoutOptions"
                :key="option.value"
                type="button"
                class="layout-card"
                :class="{
                  'is-active': appStore.layoutMode === option.value,
                }"
                @click="appStore.updateSettings({ layoutMode: option.value })"
              >
                <span :class="`layout-preview layout-preview--${option.value}`">
                  <i class="layout-preview__sidebar" />
                  <i class="layout-preview__header" />
                  <i class="layout-preview__content" />
                </span>
                <strong>{{ t(option.locale) }}</strong>
                <icon-check-circle-fill
                  v-if="appStore.layoutMode === option.value"
                />
              </button>
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.layout.content')">
            <div class="layout-grid layout-grid--content">
              <button
                v-for="option in contentWidthOptions"
                :key="option.value"
                type="button"
                class="layout-card"
                :class="{
                  'is-active': appStore.contentWidth === option.value,
                }"
                @click="appStore.updateSettings({ contentWidth: option.value })"
              >
                <span
                  :class="`content-preview content-preview--${option.value}`"
                >
                  <i /><i /><i />
                </span>
                <strong>{{ t(option.locale) }}</strong>
              </button>
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.layout.sidebar')">
            <div class="setting-list">
              <SettingSwitch
                :title="t('settings.layout.sidebar.visible')"
                :description="t('settings.layout.sidebar.visible.description')"
                :model-value="appStore.sidebarVisible"
                @change="appStore.updateSettings({ sidebarVisible: $event })"
              >
                <template #icon><icon-menu /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.layout.sidebar.draggable')"
                :model-value="appStore.sidebarDraggable"
                :disabled="!appStore.sidebarVisible || appStore.menuCollapse"
                @change="appStore.updateSettings({ sidebarDraggable: $event })"
              >
                <template #icon><icon-drag-arrow /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.layout.sidebar.hoverExpand')"
                :description="
                  t('settings.layout.sidebar.hoverExpand.description')
                "
                :model-value="appStore.sidebarHoverExpand"
                :disabled="!appStore.sidebarVisible"
                @change="
                  appStore.updateSettings({ sidebarHoverExpand: $event })
                "
              >
                <template #icon><icon-expand /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.layout.sidebar.collapseButton')"
                :model-value="appStore.sidebarShowCollapseButton"
                :disabled="!appStore.sidebarVisible"
                @change="
                  appStore.updateSettings({
                    sidebarShowCollapseButton: $event,
                  })
                "
              >
                <template #icon><icon-menu-fold /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.preference.sidebar')"
                :description="t('settings.preference.sidebar.description')"
                :model-value="appStore.menuCollapse"
                :disabled="!appStore.sidebarVisible"
                @change="appStore.updateSettings({ menuCollapse: $event })"
              >
                <template #icon><icon-menu-fold /></template>
              </SettingSwitch>
              <div
                class="inline-setting"
                :class="{ 'is-disabled': !appStore.sidebarVisible }"
              >
                <span>{{ t('settings.layout.sidebar.width') }}</span>
                <div class="number-stepper">
                  <button
                    type="button"
                    :disabled="
                      !appStore.sidebarVisible || appStore.menuWidth <= 180
                    "
                    @click="changeMenuWidth(-8)"
                  >
                    <icon-minus />
                  </button>
                  <strong>{{ appStore.menuWidth }}</strong>
                  <button
                    type="button"
                    :disabled="
                      !appStore.sidebarVisible || appStore.menuWidth >= 360
                    "
                    @click="changeMenuWidth(8)"
                  >
                    <icon-plus />
                  </button>
                  <span>px</span>
                </div>
              </div>
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.layout.header')">
            <div class="setting-list">
              <SettingSwitch
                :title="t('settings.layout.header.visible')"
                :description="t('settings.layout.header.visible.description')"
                :model-value="appStore.headerVisible"
                @change="appStore.updateSettings({ headerVisible: $event })"
              >
                <template #icon><icon-layout /></template>
              </SettingSwitch>
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.layout.breadcrumb')">
            <div class="setting-list">
              <SettingSwitch
                :title="t('settings.layout.breadcrumb.enable')"
                :description="
                  t('settings.layout.breadcrumb.enable.description')
                "
                :model-value="appStore.breadcrumbEnabled"
                @change="appStore.updateSettings({ breadcrumbEnabled: $event })"
              >
                <template #icon><icon-branch /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.layout.breadcrumb.onlyOne')"
                :model-value="appStore.breadcrumbHideOnlyOne"
                :disabled="!appStore.breadcrumbEnabled || appStore.tabBar"
                @change="
                  appStore.updateSettings({ breadcrumbHideOnlyOne: $event })
                "
              >
                <template #icon><icon-eye-invisible /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.layout.breadcrumb.icon')"
                :model-value="appStore.breadcrumbShowIcon"
                :disabled="!appStore.breadcrumbEnabled || appStore.tabBar"
                @change="
                  appStore.updateSettings({ breadcrumbShowIcon: $event })
                "
              >
                <template #icon><icon-image /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.layout.breadcrumb.home')"
                :model-value="appStore.breadcrumbShowHome"
                :disabled="!appStore.breadcrumbEnabled || appStore.tabBar"
                @change="
                  appStore.updateSettings({ breadcrumbShowHome: $event })
                "
              >
                <template #icon><icon-home /></template>
              </SettingSwitch>
              <div class="inline-setting">
                <span>{{ t('settings.layout.breadcrumb.style') }}</span>
                <div class="token-segment">
                  <button
                    v-for="option in breadcrumbStyleOptions"
                    :key="option.value"
                    type="button"
                    :disabled="!appStore.breadcrumbEnabled || appStore.tabBar"
                    :class="{
                      'is-active': appStore.breadcrumbStyle === option.value,
                    }"
                    @click="
                      appStore.updateSettings({
                        breadcrumbStyle: option.value,
                      })
                    "
                  >
                    {{ t(option.locale) }}
                  </button>
                </div>
              </div>
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.layout.tabs')">
            <div class="setting-list">
              <SettingSwitch
                :title="t('settings.tabBar')"
                :description="t('settings.preference.tabs.description')"
                :model-value="appStore.tabBar"
                @change="appStore.updateSettings({ tabBar: $event })"
              >
                <template #icon><icon-layers /></template>
              </SettingSwitch>
              <SettingSwitch
                v-for="option in tabSwitchOptions"
                :key="option.key"
                :title="t(option.locale)"
                :model-value="appStore[option.key]"
                :icon="option.icon"
                :disabled="!appStore.tabBar"
                @change="setBooleanPreference(option.key, $event)"
              />
              <div
                class="inline-setting"
                :class="{ 'is-disabled': !appStore.tabBar }"
              >
                <span>{{ t('settings.layout.tabs.maxCount') }}</span>
                <div class="number-stepper">
                  <button
                    type="button"
                    :disabled="!appStore.tabBar || appStore.tabMaxCount <= 0"
                    @click="changeTabMaxCount(-1)"
                  >
                    <icon-minus />
                  </button>
                  <strong>{{ appStore.tabMaxCount || '∞' }}</strong>
                  <button
                    type="button"
                    :disabled="!appStore.tabBar || appStore.tabMaxCount >= 30"
                    @click="changeTabMaxCount(1)"
                  >
                    <icon-plus />
                  </button>
                </div>
              </div>
              <div
                class="inline-setting"
                :class="{ 'is-disabled': !appStore.tabBar }"
              >
                <span>{{ t('settings.layout.tabs.style') }}</span>
                <div class="token-segment token-segment--three">
                  <button
                    v-for="option in tabStyleOptions"
                    :key="option.value"
                    type="button"
                    :disabled="!appStore.tabBar"
                    :class="{ 'is-active': appStore.tabStyle === option.value }"
                    @click="appStore.updateSettings({ tabStyle: option.value })"
                  >
                    {{ t(option.locale) }}
                  </button>
                </div>
              </div>
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.layout.widgets')">
            <div class="setting-list">
              <SettingSwitch
                v-for="option in widgetOptions"
                :key="option.key"
                :title="t(option.locale)"
                :model-value="appStore[option.key]"
                :icon="option.icon"
                @change="setBooleanPreference(option.key, $event)"
              />
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.layout.footer')">
            <div class="setting-list">
              <SettingSwitch
                :title="t('settings.layout.footer.visible')"
                :model-value="appStore.footerVisible"
                @change="appStore.updateSettings({ footerVisible: $event })"
              >
                <template #icon><icon-layout /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.layout.footer.fixed')"
                :model-value="appStore.footerFixed"
                :disabled="!appStore.footerVisible"
                @change="appStore.updateSettings({ footerFixed: $event })"
              >
                <template #icon><icon-pushpin /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.layout.copyright.enable')"
                :model-value="appStore.copyrightEnabled"
                :disabled="!appStore.footerVisible"
                @change="appStore.updateSettings({ copyrightEnabled: $event })"
              >
                <template #icon><icon-copyright /></template>
              </SettingSwitch>
            </div>
            <div class="general-form copyright-form">
              <label>
                <span>{{ t('settings.layout.footer.description') }}</span>
                <a-input
                  :model-value="appStore.footerDescription"
                  :disabled="!appStore.footerVisible"
                  :max-length="120"
                  allow-clear
                  :placeholder="t('settings.layout.footer.description.hint')"
                  @input="
                    appStore.updateSettings({
                      footerDescription: String($event),
                    })
                  "
                />
              </label>
              <label>
                <span>{{ t('settings.layout.copyright.company') }}</span>
                <a-input
                  :model-value="appStore.copyrightCompanyName"
                  :disabled="
                    !appStore.footerVisible || !appStore.copyrightEnabled
                  "
                  @input="
                    appStore.updateSettings({
                      copyrightCompanyName: String($event),
                    })
                  "
                />
              </label>
              <label>
                <span>{{ t('settings.layout.copyright.url') }}</span>
                <a-input
                  :model-value="appStore.copyrightCompanyUrl"
                  :error="copyrightCompanyUrlInvalid"
                  :disabled="
                    !appStore.footerVisible || !appStore.copyrightEnabled
                  "
                  @input="
                    appStore.updateSettings({
                      copyrightCompanyUrl: String($event),
                    })
                  "
                />
              </label>
            </div>
          </PreferenceSection>
        </template>

        <template v-else-if="activeTab === 'shortcuts'">
          <PreferenceSection
            :title="t('settings.shortcut.global')"
            :description="t('settings.shortcut.description')"
          >
            <div class="setting-list shortcut-list">
              <SettingSwitch
                :title="t('settings.shortcut.enable')"
                :description="t('settings.shortcut.enable.description')"
                :model-value="appStore.shortcutEnabled"
                reserve-shortcut
                @change="appStore.updateSettings({ shortcutEnabled: $event })"
              >
                <template #icon><icon-thunderbolt /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.shortcut.preferences')"
                :model-value="appStore.shortcutPreferences"
                :disabled="!appStore.shortcutEnabled"
                shortcut="⌘ ,"
                @change="
                  appStore.updateSettings({ shortcutPreferences: $event })
                "
              >
                <template #icon><icon-settings /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.shortcut.logout')"
                :model-value="appStore.shortcutLogout"
                :disabled="!appStore.shortcutEnabled"
                shortcut="⌥ Q"
                @change="appStore.updateSettings({ shortcutLogout: $event })"
              >
                <template #icon><icon-export /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.shortcut.lock')"
                :model-value="appStore.shortcutLockScreen"
                :disabled="!appStore.shortcutEnabled"
                shortcut="⌥ L"
                @change="
                  appStore.updateSettings({ shortcutLockScreen: $event })
                "
              >
                <template #icon><icon-lock /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.shortcut.closeTab')"
                :model-value="appStore.shortcutCloseTab"
                :disabled="!appStore.shortcutEnabled"
                shortcut="Esc"
                @change="appStore.updateSettings({ shortcutCloseTab: $event })"
              >
                <template #icon><icon-close-circle /></template>
              </SettingSwitch>
            </div>
          </PreferenceSection>
        </template>

        <template v-else-if="activeTab === 'general'">
          <PreferenceSection :title="t('settings.general.title')">
            <div class="general-form">
              <div class="general-form__field">
                <span>{{ t('settings.language') }}</span>
                <a-select
                  :model-value="currentLocale"
                  :disabled="Boolean(fixedLocale())"
                  :aria-label="t('settings.language')"
                  :popup-container="preferencesShellRef"
                  :trigger-props="preferenceSelectTriggerProps"
                  @change="changeLocale(String($event))"
                >
                  <a-option
                    v-for="option in localeOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-option>
                </a-select>
              </div>
              <div class="general-form__field">
                <span>{{ t('settings.general.timeZone') }}</span>
                <a-select
                  :model-value="appStore.timeZone"
                  :aria-label="t('settings.general.timeZone')"
                  allow-search
                  :popup-container="preferencesShellRef"
                  :trigger-props="preferenceSelectTriggerProps"
                  @change="
                    appStore.updateSettings({ timeZone: String($event) })
                  "
                >
                  <a-option
                    v-for="option in timeZoneOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </a-option>
                </a-select>
              </div>
            </div>
            <div class="setting-list">
              <SettingSwitch
                :title="t('settings.general.dynamicTitle')"
                :model-value="appStore.dynamicTitle"
                @change="setDynamicTitle"
              >
                <template #icon><icon-tag /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.general.copyButton')"
                :model-value="appStore.showCopyPreferences"
                @change="
                  appStore.updateSettings({ showCopyPreferences: $event })
                "
              >
                <template #icon><icon-copy /></template>
              </SettingSwitch>
            </div>
          </PreferenceSection>

          <PreferenceSection :title="t('settings.general.animation')">
            <div class="setting-list">
              <SettingSwitch
                :title="t('settings.general.progress')"
                :description="t('settings.general.progress.description')"
                :model-value="appStore.progressEnabled"
                @change="appStore.updateSettings({ progressEnabled: $event })"
              >
                <template #icon><icon-loading /></template>
              </SettingSwitch>
              <SettingSwitch
                :title="t('settings.general.transition')"
                :description="t('settings.general.transition.description')"
                :model-value="appStore.pageTransition"
                @change="appStore.updateSettings({ pageTransition: $event })"
              >
                <template #icon><icon-swap /></template>
              </SettingSwitch>
            </div>
          </PreferenceSection>
        </template>

        <template v-else-if="activeTab === 'extensions'">

          <PreferenceSection
            :title="t('settings.watermark.title')"
            :description="t('settings.watermark.description')"
          >
            <div class="setting-card">
              <SettingSwitch
                :title="t('settings.watermark.enable')"
                :description="t('settings.watermark.enable.description')"
                :model-value="appStore.watermarkEnabled"
                @change="appStore.updateSettings({ watermarkEnabled: $event })"
              >
                <template #icon><icon-font-colors /></template>
              </SettingSwitch>

              <Transition name="preference-expand">
                <div
                  v-if="appStore.watermarkEnabled"
                  class="watermark-settings"
                >
                  <WatermarkOverlay preview />
                  <label class="field-label" for="watermark-text">
                    {{ t('settings.watermark.content') }}
                  </label>
                  <a-textarea
                    id="watermark-text"
                    :model-value="appStore.watermarkText"
                    :max-length="120"
                    :auto-size="{ minRows: 2, maxRows: 3 }"
                    show-word-limit
                    :placeholder="t('settings.watermark.content.placeholder')"
                    @input="
                      appStore.updateSettings({ watermarkText: String($event) })
                    "
                  />
                  <div class="watermark-options">
                    <a-checkbox
                      :model-value="appStore.watermarkIncludeUser"
                      @change="
                        appStore.updateSettings({
                          watermarkIncludeUser: $event as boolean,
                        })
                      "
                    >
                      {{ t('settings.watermark.includeUser') }}
                    </a-checkbox>
                    <a-checkbox
                      :model-value="appStore.watermarkIncludeTime"
                      @change="
                        appStore.updateSettings({
                          watermarkIncludeTime: $event as boolean,
                        })
                      "
                    >
                      {{ t('settings.watermark.includeTime') }}
                    </a-checkbox>
                  </div>
                  <div class="opacity-setting">
                    <span>{{ t('settings.watermark.opacity') }}</span>
                    <a-slider
                      :model-value="appStore.watermarkOpacity"
                      :min="0.04"
                      :max="0.24"
                      :step="0.02"
                      :format-tooltip="formatOpacity"
                      @change="setWatermarkOpacity"
                    />
                    <strong>{{
                      formatOpacity(appStore.watermarkOpacity)
                    }}</strong>
                  </div>
                </div>
              </Transition>
            </div>
          </PreferenceSection>

          <PreferenceSection
            :title="t('settings.lock.title')"
            :description="t('settings.lock.description')"
          >
            <div class="lock-setting-card">
              <div class="lock-setting-card__hero">
                <span class="lock-setting-card__icon"><icon-lock /></span>
                <div>
                  <strong>
                    {{
                      lockStore.configured
                        ? t('settings.lock.configured')
                        : t('settings.lock.unconfigured')
                    }}
                  </strong>
                  <small>{{ t('settings.lock.local.description') }}</small>
                </div>
                <span
                  v-if="lockStore.configured"
                  class="lock-setting-card__status is-ready"
                >
                  <i />
                  {{ t('settings.lock.status.ready') }}
                </span>
              </div>

              <div
                v-if="lockStore.configured"
                class="lock-setting-card__actions"
              >
                <a-button type="primary" long @click="lockNow">
                  <template #icon><icon-lock /></template>
                  {{ t('settings.lock.now') }}
                </a-button>
                <div>
                  <a-button @click="openPasswordDialog('change')">
                    <template #icon><icon-edit /></template>
                    {{ t('settings.lock.change') }}
                  </a-button>
                  <a-button
                    status="danger"
                    @click="openPasswordDialog('disable')"
                  >
                    {{ t('settings.lock.disable') }}
                  </a-button>
                </div>
              </div>
              <a-button
                v-else
                type="primary"
                long
                @click="openPasswordDialog('configure')"
              >
                <template #icon><icon-safe /></template>
                {{ t('settings.lock.configure') }}
              </a-button>

              <p class="lock-setting-card__note">
                <icon-info-circle />{{ t('settings.lock.notice') }}
              </p>
            </div>
          </PreferenceSection>
        </template>
      </div>

      <footer class="preferences-footer">
        <a-button
          v-if="appStore.showCopyPreferences"
          type="primary"
          long
          @click="copyPreferences"
        >
          <template #icon><icon-copy /></template>
          {{ t('settings.copy') }}
        </a-button>
        <a-button long @click="resetPreferences">
          <template #icon><icon-delete /></template>
          {{ t('settings.preference.reset.short') }}
        </a-button>
      </footer>
    </div>
  </AppDrawer>

  <AppModal
    :title="passwordDialogTitle"
    :visible="passwordDialog.visible"
    :footer="false"
    :mask-closable="!savingPassword"
    :closable="!savingPassword"
    :width="420"
    @cancel="closePasswordDialog"
  >
    <template #title>{{ passwordDialogTitle }}</template>
    <div class="password-dialog">
      <div class="password-dialog__intro">
        <span><icon-safe /></span>
        <p>{{ passwordDialogDescription }}</p>
      </div>

      <label v-if="passwordDialog.mode !== 'configure'" class="field-label">
        {{ t('settings.lock.password.current') }}
        <a-input-password
          v-model="passwordForm.current"
          autocomplete="off"
          :disabled="savingPassword"
          :placeholder="t('settings.lock.password.current.placeholder')"
        />
      </label>
      <template v-if="passwordDialog.mode !== 'disable'">
        <label class="field-label">
          {{ t('settings.lock.password.new') }}
          <a-input-password
            v-model="passwordForm.password"
            autocomplete="new-password"
            :disabled="savingPassword"
            :placeholder="t('settings.lock.password.rule')"
          />
        </label>
        <label class="field-label">
          {{ t('settings.lock.password.confirm') }}
          <a-input-password
            v-model="passwordForm.confirmation"
            autocomplete="new-password"
            :disabled="savingPassword"
            :placeholder="t('settings.lock.password.confirm.placeholder')"
          />
        </label>
        <a-checkbox
          v-if="passwordDialog.mode === 'configure'"
          v-model="passwordForm.lockImmediately"
        >
          {{ t('settings.lock.immediately') }}
        </a-checkbox>
      </template>

      <div class="password-dialog__actions">
        <a-button :disabled="savingPassword" @click="closePasswordDialog">
          {{ t('settings.cancel') }}
        </a-button>
        <a-button
          :type="passwordDialog.mode === 'disable' ? 'outline' : 'primary'"
          :status="passwordDialog.mode === 'disable' ? 'danger' : 'normal'"
          :loading="savingPassword"
          @click="submitPasswordDialog"
        >
          {{ passwordDialogAction }}
        </a-button>
      </div>
    </div>
  </AppModal>
</template>

<script lang="ts" setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref
} from 'vue'
import type { Component } from 'vue'
import AppDrawer from '@/components/AppDrawer/index.vue'
import AppModal from '@/components/AppModal/index.vue'
import { confirmAction } from '@/utils/modal'
import { Message } from '@arco-design/web-vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import {
  IconDesktop,
  IconDragArrow,
  IconFullscreen,
  IconHistory,
  IconImage,
  IconLanguage,
  IconLock,
  IconLoop,
  IconMoon,
  IconMore,
  IconOrderedList,
  IconSave,
  IconCloseCircle,
  IconSun
} from '@arco-design/web-vue/es/icon'
import { usePreferencesStore as useAppStore } from '@/stores/preferences'
import { useLockScreenStore } from '@/stores/lock-screen'

import type {
  AppState,
  BreadcrumbStyle,
  ContentWidthMode,
  DensityMode,
  LayoutMode,
  ThemeMode,
  TabStyle
} from '@/types/preferences'
import { validateLockPassword } from '@/utils/lock-screen'
import { isSafeExternalUrl } from '@/utils/external-url'
import { i18n, setLocale, LOCALES, fixedLocale, type Locale } from '@/lang'
import { APP_META } from '@/config/app-meta'
import WatermarkOverlay from '@/components/watermark-overlay/index.vue'
import HeaderIconButton from '@/components/header-icon-button/index.vue'
import PreferenceSection from './preference-section.vue'
import SettingSwitch from './setting-switch.vue'
import ThemeColorGrid from './theme-color-grid.vue'

type PreferenceTab =
    'appearance' | 'layout' | 'shortcuts' | 'general' | 'extensions'
type PasswordDialogMode = 'configure' | 'change' | 'disable'
type BooleanPreferenceKey = {
  [Key in keyof AppState]: AppState[Key] extends boolean ? Key : never;
}[keyof AppState]

const appStore = useAppStore()
const lockStore = useLockScreenStore()
const { t } = useI18n()
const route = useRoute()
const currentLocale = i18n.global.locale
const changeLocale = (value: string) => { if (!fixedLocale()) void setLocale(value as Locale) }
const localeOptions = LOCALES.map(item => ({ label: item.label, value: item.value }))
const preferenceSelectTriggerProps = {
  contentClass: 'preferences-select-popup'
}
const activeTab = ref<PreferenceTab>('appearance')
const preferencesShellRef = ref<HTMLElement>()
const preferencesBodyRef = ref<HTMLElement>()
const savingPassword = ref(false)
const passwordDialog = reactive({
  visible: false,
  mode: 'configure' as PasswordDialogMode
})
const passwordForm = reactive({
  current: '',
  password: '',
  confirmation: '',
  lockImmediately: true
})

const tabs = [
  { key: 'appearance' as const, locale: 'settings.tab.appearance' },
  { key: 'layout' as const, locale: 'settings.tab.layout' },
  { key: 'shortcuts' as const, locale: 'settings.tab.shortcuts' },
  { key: 'general' as const, locale: 'settings.tab.general' },
  { key: 'extensions' as const, locale: 'settings.tab.extensions' }
]
const radiusOptions = [0, 0.25, 0.5, 0.75, 1] as const
const layoutOptions: Array<{
  value: LayoutMode;
  locale: string;
}> = [
  { value: 'vertical', locale: 'settings.layout.vertical' },
  { value: 'horizontal', locale: 'settings.layout.horizontal' },
  {
    value: 'content-fullscreen',
    locale: 'settings.layout.contentFullscreen'
  }
]
const breadcrumbStyleOptions: Array<{
  value: BreadcrumbStyle;
  locale: string;
}> = [
  { value: 'normal', locale: 'settings.layout.style.normal' },
  { value: 'background', locale: 'settings.layout.style.background' }
]
const tabStyleOptions: Array<{ value: TabStyle; locale: string }> = [
  { value: 'chrome', locale: 'settings.layout.tabs.chrome' },
  { value: 'card', locale: 'settings.layout.tabs.card' },
  { value: 'plain', locale: 'settings.layout.tabs.plain' }
]
const tabSwitchOptions: Array<{
  key: BooleanPreferenceKey;
  locale: string;
  icon: Component;
}> = [
  {
    key: 'tabPersist',
    locale: 'settings.layout.tabs.persist',
    icon: IconSave
  },
  {
    key: 'tabHistory',
    locale: 'settings.layout.tabs.history',
    icon: IconHistory
  },
  {
    key: 'tabDraggable',
    locale: 'settings.layout.tabs.draggable',
    icon: IconDragArrow
  },
  {
    key: 'tabWheelable',
    locale: 'settings.layout.tabs.wheelable',
    icon: IconLoop
  },
  {
    key: 'tabMiddleClickClose',
    locale: 'settings.layout.tabs.middleClick',
    icon: IconCloseCircle
  },
  {
    key: 'tabShowIcon',
    locale: 'settings.layout.tabs.icon',
    icon: IconImage
  },
  {
    key: 'tabShowMore',
    locale: 'settings.layout.tabs.more',
    icon: IconMore
  },
  {
    key: 'tabShowMaximize',
    locale: 'settings.layout.tabs.maximize',
    icon: IconFullscreen
  }
]
const widgetOptions: Array<{
  key: BooleanPreferenceKey;
  locale: string;
  icon: Component;
}> = [
  {
    key: 'widgetLocale',
    locale: 'settings.layout.widgets.locale',
    icon: IconLanguage
  },
  {
    key: 'widgetTheme',
    locale: 'settings.layout.widgets.theme',
    icon: IconMoon
  },
  {
    key: 'widgetFullscreen',
    locale: 'settings.layout.widgets.fullscreen',
    icon: IconFullscreen
  },
  {
    key: 'widgetLock',
    locale: 'settings.layout.widgets.lock',
    icon: IconLock
  }
]
const contentWidthOptions: Array<{
  value: ContentWidthMode;
  locale: string;
}> = [
  { value: 'fluid', locale: 'settings.layout.fluid' },
  { value: 'fixed', locale: 'settings.layout.fixed' }
]
const timeZoneOptions = [
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (GMT+8)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'UTC', label: 'UTC' }
]
const themeOptions: Array<{
  value: ThemeMode;
  locale: string;
  icon: typeof IconSun;
}> = [
  { value: 'light', locale: 'settings.preference.light', icon: IconSun },
  { value: 'dark', locale: 'settings.preference.dark', icon: IconMoon },
  {
    value: 'system',
    locale: 'settings.preference.system',
    icon: IconDesktop
  }
]
const densityOptions: Array<{
  value: DensityMode;
  locale: string;
  description: string;
  icon: typeof IconOrderedList;
}> = [
  {
    value: 'comfortable',
    locale: 'settings.preference.comfortable',
    description: 'settings.preference.comfortable.description',
    icon: IconOrderedList
  },
  {
    value: 'compact',
    locale: 'settings.preference.compact',
    description: 'settings.preference.compact.description',
    icon: IconOrderedList
  }
]

const passwordDialogTitle = computed(() =>
  t(`settings.lock.dialog.${passwordDialog.mode}.title`)
)
const passwordDialogDescription = computed(() =>
  t(`settings.lock.dialog.${passwordDialog.mode}.description`)
)
const passwordDialogAction = computed(() =>
  t(`settings.lock.dialog.${passwordDialog.mode}.action`)
)
const copyrightCompanyUrlInvalid = computed(
  () =>
    Boolean(appStore.copyrightCompanyUrl) &&
      !isSafeExternalUrl(appStore.copyrightCompanyUrl)
)

const close = () => appStore.updateSettings({ globalSettings: false }, false)
const setTheme = (value: ThemeMode) =>
  appStore.updateSettings({ theme: value })
const setDensity = (value: DensityMode) =>
  appStore.updateSettings({ density: value })
const changeFontSize = (delta: number) =>
  appStore.updateSettings({
    fontSize: Math.min(18, Math.max(12, appStore.fontSize + delta))
  })
const changeMenuWidth = (delta: number) =>
  appStore.updateSettings({
    menuWidth: Math.min(360, Math.max(180, appStore.menuWidth + delta))
  })
const changeTabMaxCount = (delta: number) =>
  appStore.updateSettings({
    tabMaxCount: Math.min(30, Math.max(0, appStore.tabMaxCount + delta))
  })
const setBooleanPreference = (key: BooleanPreferenceKey, value: boolean) =>
  appStore.updateSettings({ [key]: value } as Partial<AppState>)
const setDynamicTitle = (value: boolean) => {
  appStore.updateSettings({ dynamicTitle: value })
  const routeTitle = route.meta.locale ? t(String(route.meta.locale)) : ''
  document.title =
    value && routeTitle ? `${routeTitle} · ${APP_META.name}` : APP_META.name
}
const setWatermarkOpacity = (value: number | [number, number]) => {
  if (typeof value === 'number') {
    appStore.updateSettings({ watermarkOpacity: value })
  }
}
const formatOpacity = (value: number) => `${Math.round(value * 100)}%`
const resetPreferences = async() => {
  try {
    await confirmAction({ title: t('settings.preference.reset.confirm.title'), content: t('settings.preference.reset.confirm.description'), okText: t('settings.preference.reset.confirm.action') })
    appStore.resetPreferences()
    Message.success(t('settings.preference.reset.success'))
  } catch { /* Cancel keeps existing preferences. */ }
}
const copyPreferences = async() => {
  const preferences = appStore.exportPreferences()
  const content = JSON.stringify(preferences, null, 2)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      const copied = document.execCommand('copy')
      textarea.remove()
      if (!copied) throw new Error('Copy failed')
    }
    Message.success(t('settings.copy.success'))
  } catch {
    Message.error(t('settings.copy.failed'))
  }
}
const selectTab = async(tab: PreferenceTab) => {
  activeTab.value = tab
  await nextTick()
  preferencesBodyRef.value?.scrollTo({ top: 0 })
}
const navigateTabs = async(event: KeyboardEvent, key: PreferenceTab) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = tabs.findIndex(tab => tab.key === key)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  await selectTab(tabs[next].key)
  document.getElementById(`preferences-tab-${tabs[next].key}`)?.focus()
}
const handleRequestedTab = (event: Event) => {
  const tab = (event as CustomEvent<string>).detail as PreferenceTab
  if (tabs.some((item) => item.key === tab)) void selectTab(tab)
}

const resetPasswordForm = () => {
  passwordForm.current = ''
  passwordForm.password = ''
  passwordForm.confirmation = ''
  passwordForm.lockImmediately = true
}
const openPasswordDialog = (mode: PasswordDialogMode) => {
  resetPasswordForm()
  passwordDialog.mode = mode
  passwordDialog.visible = true
}
const closePasswordDialog = () => {
  if (savingPassword.value) return
  passwordDialog.visible = false
  resetPasswordForm()
}
const lockNow = () => {
  close()
  lockStore.lock()
}
const submitPasswordDialog = async() => {
  if (savingPassword.value) return
  if (
    passwordDialog.mode !== 'disable' &&
      !validateLockPassword(passwordForm.password)
  ) {
    Message.error(t('settings.lock.password.rule'))
    return
  }
  if (
    passwordDialog.mode !== 'disable' &&
      passwordForm.password !== passwordForm.confirmation
  ) {
    Message.error(t('settings.lock.password.mismatch'))
    return
  }
  if (passwordDialog.mode !== 'configure' && !passwordForm.current) {
    Message.error(t('settings.lock.password.current.required'))
    return
  }

  savingPassword.value = true
  try {
    let success = false
    if (passwordDialog.mode === 'configure') {
      success = await lockStore.configure(
        passwordForm.password,
        passwordForm.lockImmediately
      )
    } else if (passwordDialog.mode === 'change') {
      success = await lockStore.changePassword(
        passwordForm.current,
        passwordForm.password
      )
    } else {
      success = await lockStore.disable(passwordForm.current)
    }

    if (!success) {
      Message.error(t('settings.lock.password.incorrect'))
      return
    }
    const shouldLock = lockStore.locked
    Message.success(t(`settings.lock.dialog.${passwordDialog.mode}.success`))
    passwordDialog.visible = false
    resetPasswordForm()
    if (shouldLock) close()
  } catch {
    Message.error(t('settings.lock.crypto.unavailable'))
  } finally {
    savingPassword.value = false
  }
}

onMounted(() => {
  window.addEventListener('motor:preferences-tab', handleRequestedTab)
})

onBeforeUnmount(() =>
  window.removeEventListener('motor:preferences-tab', handleRequestedTab)
)
</script>

<style scoped src="./style.scss" lang="scss"></style>
