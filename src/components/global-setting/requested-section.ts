import { shallowRef } from 'vue'

export type PreferenceSectionId = 'appearance' | 'layout' | 'general' | 'lock'

/** A section the drawer should scroll to when it next opens. Cleared once handled. */
export const requestedPreferenceSection = shallowRef<PreferenceSectionId>()
