## verdict

| Material fix | Score | Evidence |
| --- | --- | --- |
| 1. Auth-scoped active text contrast, including the remaining enabled Arco text-button variant | resolved | The replaced `forgot-success.png` is a valid, settled 1440 × 900 capture. “更换邮箱重新申请” now visibly uses the darker accessible auth link shade. The scoped source applies that color to enabled text buttons, preserves it on hover, and uses native text-1/fill-2 on active. `text-button-contrast.json` records all seven selectable palettes in both themes with normal/hover/active results of at least 4.97:1. Focus retains the readable text/background pair. The previously resolved supporting copy, placeholders, primary actions, footer, and story-description areas remain resolved. |
| 2. Persist the approved account direction | resolved | The prior resolved PRODUCT.md decision record remains intact: pinned Motor authentication world, retained preferences, real Go/Mailpit integration, and explicit broader business-module unknowns. |

No regression introduced by this limited text-button fix was observed. The packet reports that clicking the corrected action returns to the email form and focuses its input; this scoring pass did not rerun the browser interaction.

## remaining

Clear. This ship verdict covers the scored fixes, not the whole surface.

disposition: ship
