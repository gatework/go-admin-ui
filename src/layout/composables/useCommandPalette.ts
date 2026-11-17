import { ref } from 'vue'

/** Open state of the menu search. Module scope: the header button, the shortcut and the dialog share it. */
export const commandPaletteOpen = ref(false)
export const openCommandPalette = () => { commandPaletteOpen.value = true }
