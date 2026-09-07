# Workbench Expo

Expo Router host for iOS, Android, and Expo Web. It consumes the same
`@opencraft/workbench-runtime` as the Vite/Electron renderer while keeping a native
view and native composer boundary.

The `workbench-frame.web.tsx` and `workbench-frame.native.tsx` files are host
adapters with a shared semantic component underneath. DOM-only packages such as
ProseMirror and the Codex SCSS frame are intentionally unavailable here.

## iOS simulator

Unistyles 3 uses Nitro/Fabric native code, so this app cannot run in Expo Go.
On a Mac with Xcode and CocoaPods installed, run from the repository root:

```bash
npm install
npm run dev:expo:ios
```

Expo generates the native project when needed, installs pods, builds the custom
development client, starts Metro, and opens the iOS Simulator. The default
theme is explicitly light.

CI and Linux hosts can verify the complete JavaScript bundle and native package
discovery closure without Xcode:

```bash
npm run build:expo:ios
```

This emits `dist/ios/main.jsbundle`; it does not compile CocoaPods or boot an
Apple binary.
