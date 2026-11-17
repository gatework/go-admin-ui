/**
 * Arco tag colours for the states that recur across modules.
 *
 * One vocabulary: green is working, orange needs attention, red has failed,
 * blue is in progress, grey is off or unknown. A module with its own states
 * keeps its own map, but picks from the same five.
 */
export type Tone = 'green' | 'orange' | 'red' | 'arcoblue' | 'gray'

/** `sys_normal_disable` and `sys_job_status`: 2 is normal, 1 is disabled (see api/status.ts). Off is not a failure, so it is grey. */
export const ENABLED_TONES: Record<string, Tone> = { 2: 'green', 1: 'gray' }

/** `sys_common_status`: 2 succeeded, 1 failed. */
export const RESULT_TONES: Record<string, Tone> = { 2: 'green', 1: 'red' }

/** `sys_show_hide`: 0 is shown, 1 is hidden. */
export const VISIBILITY_TONES: Record<string, Tone> = { 0: 'green', 1: 'gray' }

/** `sys_yes_no`. */
export const YES_NO_TONES: Record<string, Tone> = { Y: 'arcoblue', N: 'gray' }
