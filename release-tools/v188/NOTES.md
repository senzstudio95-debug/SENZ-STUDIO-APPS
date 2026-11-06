SENZ STUDIO v2.9.188 — Startup recovery, no ad blocker

- Removes the ad blocker completely from bundled and standalone SENZ TUBE v1.0.3, including its settings and request interception.
- Initializes desktop/focus state before any startup event can use it.
- Starts the editor only after all main-process services finish initializing.
- A failed startup exits cleanly instead of retaining a broken single-instance process.
- Tests the full Studio main process, editor load and second-instance activation on Windows.

Recovery from v2.9.186: restart Windows first to stop the crashed old process, then run this installer and use its updated desktop shortcut. No uninstall is needed.
