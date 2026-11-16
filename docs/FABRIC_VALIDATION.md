# Fabric frontend validation

Date: 2026-10-26. Workspace: `go-admin-ui`; component/menu identity: `NetworkFabricManage`, `/network/fabric/index`.

The frontend reads the DTOs in `../go-admin/app/fabric/service/dto` and the operation models in `../go-admin/app/fabric/models`. It uses the existing request envelope, permission store, Arco appearance settings and shared PageContainer, ProTable, AppTabs and AppDrawer components. No separate theme or preferences were introduced.

## Viewing the local application

The actual menu is **网络管理 → Fabric 管理**, route `/#/network/fabric`. Use the actual local application at [localhost:9527](http://localhost:9527/#/network/fabric). It reads the existing development API at `http://localhost:8000`; it requires a real login and the matching backend migration/menu/permissions. Browser test fixtures are not installed into a user's normal session.

The actual local entry is [localhost:9527](http://localhost:9527/#/network/fabric), backed by the real local 8000 service. Root completed a private PostgreSQL backup, applied migration `1793020000000`, registered `NetworkFabricManage` and the candidate POST API, and restarted the backend. The migration created six Fabrics with scheduled collection disabled. Root checked `/api/v1/ready`: database, cache and schema were all ready. An unauthenticated candidate request now returns envelope code 401, replacing the earlier missing-route 404.

Root opened the actual 9527 URL in Chrome and observed the normal `login?redirect=/network/fabric` route. That browser did not have a login session; no real-environment login was bypassed or fabricated. The authenticated 9527 Fabric render and real device workflows were not exercised in this check. Log in with the existing local account, then use **网络管理 → Fabric 管理** or the direct URL above. The rendered workflow screenshots and interaction regressions remain explicitly backed by intercepted test data.

A temporary 9531 preview against an isolated 18081 test database was stopped at root's request. The earlier 9528 preview also stopped before the final browser run, which used the test configuration's own 9530 Vite server. These temporary previews are not the user-facing viewing path.

After the problem-navigation pass, root verified no queued/running delivery, Fabric change or collection tasks, rebuilt and restarted the actual backend, and confirmed that its running binary includes `fabric-issues-v1`. The database/cache/schema ready checks all pass. The 9527 frontend continues to serve the mounted source. No further migration was needed for this derived assessment response.

Subsequent availability check: OrbStack's last VM log entry records sleep at `2026-10-26 19:41:13`. Requests to 8000, 9527 and the Docker socket `_ping` then timed out, as did container queries, while `orbctl status` still reported Running. The successful version/ready checks above precede that environment change. Current availability needs rechecking after the container environment resumes; the shared VM was not forcibly restarted and power settings were not changed.

## Delivered workflow

- Fabric table: visible membership, Leaf count, observation time, evidence coverage and authoritative problem group count. Raw finding count remains a separately labelled assessment detail.
- Detail: overview, nodes/vPC, segment/ACL matrix, endpoints and changes. Fabric, tab, problem, device, business scope and comparison/device status filters are shareable URL state. A problem can open its segment or prefill a structured change's exact kind/VNI/direction/affected targets; the source remains an explicit choice.
- Evidence: current/historical configuration, per-dimension latest attempt and last complete observation, stale/unknown states, model/platform, VTEP, enabled features and vPC member ports. Raw evidence remains available as secondary detail.
- Matrix: Leaf-only comparison, VLAN, network CIDR separately from gateway, inbound/outbound ACL and explicit unbound state. The context column is sticky; narrow screens use a per-segment device list and shorter translated tab labels.
- Endpoint lookup: IP/MAC/CIDR and VRF, scoped or cross-region search, local/remote/vPC classifications, VLAN/VNI, copy address and navigation to the Fabric/device. Candidate location counts are visibly separate from a confirmed vPC pair key. Blank searches do not reach the backend. Multiple rows from one observation have distinct display keys.
- Membership: editable rules, preview before save, versioned updates, conflicts/unmatched devices and explicit manual/automatic assignment.
- Collection: versioned settings, initially disabled scheduling, bounded periods, persisted task submission and refreshed target outcomes.
- Changes: explicitly selected supported Leaf source, kind/VNI/direction and a server-side target check. Only `ready` devices are preselected; `unchanged` and `blocked` groups show counts/reasons without selection controls. Operators can deselect ready devices, and those exclusions survive a recheck. Source-observed VRF/VLAN/subnet/gateway and the selected direction's ACL name are visible before task generation; an absent binding is shown as unbound.
- Finding remediation carries the exact kind/VNI/direction/affected device IDs. The candidate API receives that nonempty whitelist; manual workflows omit it. Malformed/empty/oversized issue scopes fail closed rather than broadening to the whole Fabric. Changing source/kind/VNI/direction/scope clears previous eligibility immediately and discards delayed responses. Preview sends only the selected ready IDs.
- Generated commands are immutable. Confirmation, preview/queued cancellation, target receipts, configuration readback and runtime verification remain separate steps. The UI sends structured input rather than scripts. A pending operation prevents duplicate writes; close, deactivation and account changes invalidate result ownership. Failed writes preserve the draft and request key for retry.
- Detail-read access follows the migration's permission dependencies: query, edit, collect, preview and execute each permit the required reads. List-only users can search endpoints, with detail navigation unavailable.

## Verification captured

The problem navigation pass uses `Detail.issueGroups` from the backend assessment. The UI never derives a healthy outcome from absent findings. Groups preserve check + VRF/VNI + ACL direction; device comparisons include affected, healthy, unknown and not-applicable outcomes. The four count buttons filter the device list while retaining the original totals and a visible shown/total denominator. Partial scopes use visible-scope language and suppress remediation entry.

The overview lists problem groups first. Device rows offer a problem-count entry; investigation opens with that device's affected/unknown groups, each linking to the same problem across the Fabric, followed by its configuration/runtime evidence. Group, device and change views retain a return to the selected problem. Browser history and refresh restore group/device/filter state; cross-Fabric endpoint navigation clears the previous Fabric's problem, device filter and change parameters. A group absent after refresh shows an explicit message and the current group list.

The API checker additionally reads the real parsed Go `IssueGroup`, `IssueDevice` and `IssueCounts` schemas and compares both field sets and primitive/array/reference shapes through the TypeScript AST. An absent schema or `unknown` replacement fails this check. The legacy `unknownCount` is labelled as checks with insufficient evidence because it counts checking dimensions, not unique devices.

| Command | Result |
| --- | --- |
| `NODE_OPTIONS=--no-experimental-webstorage GOMODCACHE=/Users/wenwu.yan/go/pkg/mod pnpm test:ci` | Passed: 68 Vitest files, 466 tests; application and Node TypeScript checks; lint with 40 existing warnings and zero errors; API contract and locale checks. |
| `GOMODCACHE=/Users/wenwu.yan/go/pkg/mod pnpm check:api` | Passed with actual Go/core sources: 8 fixtures, 21 migrated pages and 3 Options API pages. Fabric models and assessed response DTOs are registered in the checker. |
| `pnpm exec eslint src/views/network/fabric src/api/network/fabric.ts src/types/network-fabric.ts src/lang/en-US/network/fabric.ts src/lang/zh-CN/network/fabric.ts tests/unit/network/fabric*.spec.ts tests/fixtures/network-fabric.ts tests/e2e/mocked/network-fabric.spec.ts` | Passed without errors or warnings. |
| `pnpm type-check` after the visual pass | Passed. |
| `pnpm exec vite build` after the precise-target workflow | Passed. No sync-apps step was invoked. |
| `FABRIC_CAPTURE=1 pnpm exec playwright test --config=playwright.fabric.config.ts` | Passed: eighteen mocked real-browser flows in 42.3 seconds, using an independently started direct Vite server on port 9530. See the problem navigation coverage below. |

The machine uses Node `v26.9.0`. Without `NODE_OPTIONS=--no-experimental-webstorage`, the initial full suite encountered 20 failures in four existing storage/auth suites because Node's global localStorage was undefined. The option restored the browser-environment storage behavior; that earlier full run passed all 461 tests; the problem-navigation run above passed 466. No global test setup or dependency was changed for this environment issue.

The focused Playwright configuration starts its own direct Vite server on port 9530. `FABRIC_UI_URL=http://localhost:9528` can instead target an explicitly started server. Both paths were exercised. This avoids the normal `pnpm dev` script's sync-apps mutation. The 9527 port in the validation workspace belongs to OrbStack and was not reused.

The browser flows cover failed-refresh evidence retention, URL restoration, Leaf-only matrix, scoped and cross-region VRF results, clipboard/device navigation, rule preview invalidation and manual assignment, collection submission/readback, immutable change commands, execute confirmation, cancellation, partial-scope blocking, list-only permissions, all four dependent-read operation permissions, confirmed vPC versus unresolved candidates, missing-only target selection and deselection persistence, exact finding-derived outbound-ACL scope, English keyboard tab navigation, desktop dark mode and 320/390-pixel mobile layouts. Candidate ownership, failure/retry and malformed URL scope also have focused unit coverage. Network requests are intercepted using fixtures; they do not reach devices.

## Visual evidence

Reviewed rendered screenshots in `../../output/fabric-ui/`:

- [Desktop overview](../../output/fabric-ui/overview.png)
- [Desktop matrix](../../output/fabric-ui/matrix.png)
- [Desktop dark](../../output/fabric-ui/desktop-dark.png)
- [Mobile English dark matrix](../../output/fabric-ui/mobile-dark-matrix.png)
- [Mobile English dark endpoints](../../output/fabric-ui/mobile-dark.png)
- [320-pixel Chinese light matrix](../../output/fabric-ui/mobile-light.png)
- [Precise candidate groups and exclusions](../../output/fabric-ui/missing-only-candidates.png)
- [Problem entry](../../output/fabric-ui/issue-entry.png)
- [Exact outbound ACL problem scope](../../output/fabric-ui/issue-targets.png)
- [Grouped business problems](../../output/fabric-ui/problem-overview.png)
- [All four device outcomes for one problem](../../output/fabric-ui/problem-comparison.png)
- [Device problems and return to Fabric comparison](../../output/fabric-ui/problem-device.png)
- [English dark comparison](../../output/fabric-ui/problem-dark.png)
- [Mobile four-status counts after scrolling](../../output/fabric-ui/problem-mobile-statuses.png)
- [Mobile final device and reachable action](../../output/fabric-ui/problem-mobile-bottom.png)
- [Mobile device investigation](../../output/fabric-ui/problem-mobile-device.png)

Problem-navigation browser coverage includes overview → business-scoped group → device → the same group, direct device → its own group, keyboard count filtering, shown/total preservation, group/device/status/scope refresh and back, device-filter URL retention, partial-scope remediation suppression, vanished groups after refresh, exact outbound ACL targets, and cross-Fabric cleanup. The rich fixture represents four device outcomes and separate PRODUCTION/ISOLATED VNIs plus outbound ACL. Its overall state is fault because it contains authoritative affected outcomes.

The full-page `problem-mobile.png` capture contains the shared fixed footer at the original viewport boundary; it is a screenshot artifact across a tall page. The supplementary viewport captures scroll the four counters into the middle and the final device into view. Assertions establish all four counter buttons are fully in the viewport and successfully click the final unknown device's investigation action. The footer was neither hidden nor changed.

Geometry assertions confirm no document overflow after the shell and native transitions settle. Narrow tabs retain the complete active label; matrix details and controls remain reachable through native scrolling.

The failed-refresh regression deliberately injects HTTP 503, asserts that prior evidence remains visible, restores the successful response, then waits for the interceptor's five-second error message and exit animation to finish naturally before capturing the matrix. The final `matrix.png` was inspected without an error toast. The error was not hidden or programmatically dismissed.

## Boundaries and review follow-up

These checks establish frontend behavior with a mocked API and local production compilation. Root's local integration checks additionally establish the real local migration, menu/API registration, ready checks and unauthenticated login path described above. They do not establish real device collection, delivery, readback, runtime health, production credentials or production deployment. No real device operation, commit, push or publication was performed. Existing generated `src/apps` and public form-generator work was preserved.

The frontend review follow-ups are included: dependent-read permissions and endpoint candidate/vPC distinction. The earlier precise missing-only pass included fourteen browser regressions and the candidate/scope unit tests; the problem-navigation pass expands the browser suite to eighteen. After the complete run, the final source ACL-name summary was checked with TypeScript, production compilation and the focused finding-to-outbound-ACL browser flow; its fixture binds the source's outbound direction to `APP-OUT` in both the cell and SVI evidence.

## 2026-10-28 audit repair validation

The detail now owns task observation across drawer closure. It discovers only `status=active` collections/changes within a fully visible authorized Fabric, polls serially every three seconds, stops on hidden/deactivated/unmounted/account/Fabric ownership changes, and refreshes assessment and task tables once on an observed terminal transition. It keeps evidence on failures, continues observing other tasks after one task fails, and rejects older task versions. Completion never forces a healthy outcome.

The selected source summary reads that device's SVI VRF across duplicate VNI matrix rows. Issue-to-matrix navigation retains VRF/VNI/direction. Explicit Fabric-wide findings have their own scope label and filter, rather than appearing as the default VRF; they do not offer a misleading business-row jump. Exact remediation target whitelists are retained.

Fresh verification:

- `NODE_OPTIONS=--no-experimental-webstorage GOMODCACHE=/Users/wenwu.yan/go/pkg/mod pnpm test:ci`: 69 files / 476 tests passed; type, API contract, locale checks passed; lint has 40 pre-existing warnings and zero errors. Log `/tmp/fabric-audit-ui-ci-final.log`.
- `pnpm exec vite build`: passed without sync-apps, log `/tmp/fabric-audit-ui-build-final.log`.
- `FABRIC_CAPTURE=1 pnpm exec playwright test --config=playwright.fabric.config.ts`: 22 mocked browser flows passed in 51.6 seconds. New flows cover closed-drawer completion, hidden-window restoration, duplicate-VNI source and navigation, and unresolved Fabric-wide scope. Existing desktop/dark/mobile screenshots were refreshed and inspected. Log `/tmp/fabric-audit-browser-final.log`.
- Task-owner unit tests cover disabled partial scope, active-only discovery, failure retry, late responses after account/Fabric change, older versions, partial/failed/interrupted/uncertain terminal outcomes, and isolation of a failed task from other tasks. Old-version and per-task failure regressions were observed failing before fixes.

The browser run still reports existing dynamic-route registration and Select-root directive warnings; all public interaction assertions pass. Test data stays in isolated intercepted browser sessions. No real account or device workflow was exercised, and no commit/push was made.

Final independent source review passed for the assessment, active-history query and frontend task lifecycle/drawer integration. Root then rebuilt and restarted the actual local backend after confirming zero active operations, leases and enabled schedules. The running binary contains `fabric-issues-v2`; database/cache/schema readiness passed and frontend 9527 returned HTTP 200. This supersedes the earlier OrbStack sleep availability caveat; authenticated real-device verification remains outside this run.

## 2026-10-28 continuous synchronization and settings validation

This pass supersedes the earlier task-observation cadence description. A visible Fabric now refreshes its full detail every 15 seconds and discovers active collections/changes across that Fabric every 15 seconds, including work started elsewhere. Known queued/running tasks are followed every three seconds. Task scheduling continues while completion-triggered detail reads are pending. Initial entry, visibility restoration and KeepAlive reactivation synchronize immediately; hidden/deactivated/unmounted and replaced owners abort or discard old requests. Account changes suspend the old owner until remount/reactivation. Partial visibility still refreshes permitted detail, without mounting complete-scope history panels or discovering their jobs.

Manual, timer and completion reads share one detail queue. Multiple terminal observations are batched; concurrent triggers add at most one pending follow-up, and never abort a useful same-owner read. Only no-data loading masks the content. Background reads/failures retain the current evidence, selected issue/device, filters, expanded evidence and drawer scroll position; a failed read shows the existing warning. Completion does not assert that a problem has become healthy.

Settings hold separate draft, baseline and latest snapshots. Pristine settings follow authoritative values and version, including updates deferred by another pending operation. Dirty settings retain their original version and expose an explicit latest-settings action. Both business-envelope and HTTP 409 conflicts block repeat stale writes; failed/same-version reloads keep the conflict and draft. Reload joins the detail queue. Successful saves apply the full returned settings, with a higher already-observed server version taking precedence. Old parent props cannot revert the successful baseline.

The two numeric inputs use Arco's `model-event="input"`: typing is recorded before blur so a periodic refresh cannot mistake an in-progress edit for a pristine form. A real-browser regression failed without this property and passed after the fix while the input remained focused. Closing the collection drawer unmounts its form; reopening starts a fresh draft. A late old reload cannot overwrite edits in that new form. KeepAlive is a different lifecycle: the still-mounted draft resumes for the same account, with pre-deactivation callbacks invalidated.

Final verification:

- `NODE_OPTIONS=--no-experimental-webstorage GOMODCACHE=/Users/wenwu.yan/go/pkg/mod pnpm test:ci`: **71 files / 518 tests passed**, TypeScript/API/locales passed; **40 existing lint warnings, zero errors**. Log `/tmp/fabric-continuous-ui-ci-final.log`.
- `pnpm exec vite build`: passed in 2.52 seconds without sync-apps. Log `/tmp/fabric-continuous-ui-build-final.log`.
- `FABRIC_CAPTURE=1 pnpm exec playwright test --config=playwright.fabric.config.ts`: **30 mocked browser flows passed** in 1.1 minutes. Log `/tmp/fabric-continuous-browser-final.log`. The focused typing/queue regression also passed independently (two flows) in `/tmp/fabric-continuous-typing-green.log`; its red evidence is `/tmp/fabric-continuous-typing-red.log`.
- `FABRIC_CAPTURE=1 pnpm exec playwright test --config=playwright.fabric.config.ts --grep 'settings conflict warning'`: three flows passed after adding the single-toast assertion and natural-expiry screenshot capture. Log `/tmp/fabric-continuous-visual-final.log`.
- `git diff --check` and final focused Fabric ESLint: passed. Readiness is database/cache/schema OK.

Observed request counts in the clock-controlled browser flows:

| Scenario | Full detail reads | Active discovery calls per kind | Individual task reads | Maximum simultaneous detail reads |
| --- | ---: | ---: | ---: | ---: |
| Initially idle, external task discovered, followed and completed | 3 | 2 | 3 | 1 |
| Short external work, then hidden for 45 seconds and resumed | 3 | 3 | 0 | 1 |
| Held detail, three simultaneous completions and multiple periodic ticks | 3 | 3 | 6 | 1 |
| Conflict, failed reload, close/reopen, then reload queued behind a periodic read | 5 | 2 | 0 | 1 |

The partial-scope browser check observes two detail reads across a periodic tick and zero collection/change history reads. The device investigation check keeps a nonzero drawer scroll position and expanded evidence across discovery and completion, preserving the node filter and URL. Unit integration additionally proves another running task is still polled at three seconds and discovery occurs at 15 seconds while a completion assessment remains unresolved.

Warning/action captures use standard Arco components and the existing theme. The viewport checks establish no horizontal overflow, a fully reachable reload action, keyboard activation, and one transport toast; the toast expires naturally before capture:

- [Settings conflict, light desktop](../../output/fabric-ui/settings-conflict-light.png)
- [Settings conflict, dark desktop](../../output/fabric-ui/settings-conflict-dark.png)
- [Settings conflict, 390-pixel viewport](../../output/fabric-ui/settings-conflict-narrow.png)

All browser requests use intercepted fixtures in isolated sessions. These results cover frontend behavior and local compilation, not live collection, policy delivery or production deployment. No backend API/table, real device operation, commit, push, generated-app synchronization or user preference was changed in this pass.

Final independent cross-task source review approved the implementation, tests and evidence, with no actionable defects. Remaining test limits include direct pre-deactivation settings completion after KeepAlive reactivation, English warning layout, other browser engines and real authenticated account switching; existing owner/generation unit checks cover the relevant state guards, without claiming exhaustive race coverage.

The last local-runtime check found that the long-running 9527 container still served cached old `detail.vue` and `collection.vue`, despite new unvisited modules being available. The frontend alone was recreated with the existing image/dependency volume and direct `pnpm exec vite`, avoiding its normal `pnpm dev` app-sync step. The session override `/tmp/fabric-continuous-frontend.yml` enables polling at 500 ms for the bind-mounted workspace; it is a local runtime override, not a repository Docker configuration change. Subsequent served modules contain `useFabricDetail`, `useSettings` and both `model-event="input"` bindings; the frontend is healthy. The backend was not restarted.

`FABRIC_UI_URL=http://localhost:9527 pnpm exec playwright test --config=playwright.fabric.config.ts --grep 'Fabric continuous synchronization'` then passed all eight new flows against that actual preview origin in 12.2 seconds, still using isolated API mocks. Log `/tmp/fabric-continuous-local-preview.log`. This establishes the preview is serving the reviewed frontend, without using a real account or touching device data.
