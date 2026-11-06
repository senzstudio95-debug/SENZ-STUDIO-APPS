# SENZ TUBE 1.0.1
Electron + React YouTube workspace, bundled with SENZ STUDIO and available as a separate Windows app.

`npm ci && npm run build`; launch with `npx electron .`. `npm test` validates URL policy and update integrity. `xvfb-run -a node electron.test.cjs` runs desktop integration checks on Linux.

Google sign-in is external. Embedded-browser sign-in is unsupported by Google; sessions cannot be transferred from the default browser. YouTube guest browsing, public videos, tabs, local history/bookmarks and floating video work inside the app. Pin on Top is not guaranteed over exclusive fullscreen games.

Press Ctrl+Alt+Shift+T or use the tray menu to restore a click-through Mini Player. Closing Mini Player returns the live web contents to its original tab. Settings checks GitHub releases for an exact SENZ-TUBE-Setup versioned installer; download and install requires an explicit click. Bundled copies update through Studio.

