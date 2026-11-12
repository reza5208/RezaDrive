# RezaDrive v5

- Settings: JSON backup/import with validation, preview counts, ownership acknowledgement, merge or replace. Three most recent pre-import recovery copies are retained on the current device per account; download copies for independent safekeeping. Import is blocked while a cloud write is pending/in flight. Foreign backup revisions are never trusted. Replace creates soft-deletion operations; later sync conflicts remain subject to review rather than overwriting cloud data.
- Settings: last successful sync time, pending count, database connection, local recovery downloads, light/dark/system theme. Device mode has no cloud acknowledgement.
- History: text search across all retained records and type filter; monthly exports remain unfiltered. Session edits preserve the existing detail workflow.
- Forms: favorite pickup/drop-off names (device-local), advisory chronological odometer, possible duplicate job, large distance and unusual deduction warnings with explicit acknowledgement.
- Undo delete restores a soft-deleted record using its current local version, with normal cloud conflict checks. It refuses when a live version already exists.
- Reports: full monthly print layout (browser Print / Save as PDF), separate all-use fuel/service cash payments and distance-based fuel estimate for completed sessions. Service, tyre and depreciation allocation is not silently deducted.
- Combined income: import an explicitly reviewed monthly RezaOT summary; export a RezaDrive summary to RezaOT. Matching month replaces that source's previous snapshot. No source records, authentication credentials or database paths are imported. Combined income retains the explicit before-fuel basis; it is not a fully costed profit figure. Imported summaries are local to the account/device, not cloud-synced.

## Validation

Unit tests: `npm test`; production build: `npm run build`.
Browser regression: `python tests/ui_browser.py` after build with Python Playwright installed. It uses isolated demo data and blocks Firebase; GitHub Pages build now runs it before deployment. Browser Print / Save PDF is tested with all monthly rows, not just search results.

Rules/transaction tests are demo-emulator only. The helper handles HTTP/WebSocket routing for fixed loopback emulator ports and preserves remote proxy settings:

```
NODE_OPTIONS="--require=$PWD/scripts/local-emulator-http.cjs" npx --yes firebase-tools@15.34.1 emulators:exec --project demo-rezadrive-sync --config firebase.emulator.json --only database 'node --experimental-strip-types --test --test-timeout=60000 tests/emulator/*.test.mjs'
```

No production rules/config changes or migration are included in this release. Rules restrict owner and verified-email access, but the JSON payload is an opaque string under RTDB rules; client validation is not server-side payload validation. A structured-schema migration is separate work if the app expands to untrusted shared users.
