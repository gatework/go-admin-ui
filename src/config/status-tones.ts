/**
 * Arco tag colours for the states that recur across modules.
 *
 * One vocabulary: green is working, orange needs attention, red has failed,
 * blue is in progress, grey is off or unknown. A module with its own states
 * keeps its own map, but picks from the same five.
 */
export type Tone = 'green' | 'orange' | 'red' | 'arcoblue' | 'gray'

/** `sys_normal_disable`: 2 is normal, 1 is disabled (see api/status.ts). */
export const ENABLED_TONES: Record<string, Tone> = { 2: 'green', 1: 'gray' }

/** `sys_common_status` and other 成功/失败 pairs keyed 0/1 and 1/2. */
export const RESULT_TONES: Record<string, Tone> = { 0: 'green', 1: 'red' }

/** `sys_yes_no`. */
export const YES_NO_TONES: Record<string, Tone> = { Y: 'arcoblue', N: 'gray' }
