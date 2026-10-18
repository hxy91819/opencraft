# Browser presentation source disposition

The former browser manager and panel transition explicitly recorded whole class
copies; viewport helper files recorded source function bodies. The device toolbar
recorded an adapted renderer component. [Exact old target hashes](browser-presentation-sources.json)
and the [reported source manifest](browser-source-manifest.json) retain those facts.
Reported manifest reference hashes are not redistribution authorization.

## Current implementation

`BrowserPresentationManager` owns one registry for the actual application's DOM /
guest Host port. Page records separate storage identity, mount claims and automation
occupancy. Registration completion checks the exact current host and manager
lifetime; failed or obsolete readiness cannot revive an old host. Focus and document
visibility subscriptions are disposed with the application. The old wrapper's
renderer message bus was private to that wrapper and had no external sender; no
unsupported remote/adoption protocol is claimed or substituted with no-op ports.
Logical Page, Workbench, navigation, native guest and resource storage implementations
remain in their existing owners.

`BrowserPresentationSwitch` owns each panel's current attachment and one replacement
transaction. Cancellation scopes own timeout, registration observer and animation
frames; every delayed action must still belong to the slot. Incoming content paints
behind outgoing content with interaction blocked. Attachment confirmation (or the
existing100ms readiness fallback) starts two prewarm frames; the outgoing surface is
released on the following frame. Replacement, hiding, removal, remount generation
and disposal fence obsolete work. View release parks a surface, not a logical Page.

Viewport preset identities, dimensions, selected mode and existing public controls
remain. Preset dimensions are factual inputs. Independent axis-based resize logic
converts centered horizontal edge movement and top-aligned vertical movement from
screen to logical pixels, with fit and size constraints. Device toolbar numeric
editing, presets, rotation, zoom and close consume the existing application callbacks;
existing CSS classes, layout and independently authored capture/edge-view plumbing
remain. No recovered initialization wrapper or helper body remains.

This is an independent replacement after source review, not clean-room work or
clearance of historical Git objects. Behavioral compatibility does not establish
rights in the retired code. Full clients and browser capability stay present.

## Verification

27 browser/domain/host tests cover generation fencing, cancellation, registration
failure, late readiness after disposal, storage restoration, mount claims, background
operation cleanup, layout bounds, viewport conversion and logical page ownership.
The actual iframe/browser fixture covers mobile390px and desktop1100px in both themes:
hide/reopen preserves the physical iframe; switching returns to the original backing;
size edits/rotation/preset selection update the actual guest size; held and keyboard
resize publish values; application disposal removes physical surfaces. The initial
fixture incorrectly required a unique visible element during the intentionally
overlapped transition; its observation was corrected to await completion. It was not
a production behavior change.

Web type checking and actual renderer builds are verified separately. Browser
fixtures do not claim native WebContents execution, phone hardware or external
service verification.

The broader workbench checks passed (32 draft-switch checks and 415 workbench
checks), as did platform boundaries and 8 provenance-checker regression tests.
Both Web and Electron renderer builds passed. These results do not clear the
remaining source groups in the repository inventory.

Native-window validation is still open. The full application desktop smoke
launched the built application but could not reach its expected browser guest:
the current unconfigured application showed its no-agent view, whereas the
older harness assumes a configured workbench. Updating its preview-button names
did not make the guest navigation assertion pass. This failed run is retained
as a limitation; neither the actual iframe fixture nor a successful Electron
build is a substitute for native guest execution evidence.
