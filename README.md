# Eduvo Rewards Mobile App

This Ionic Angular application connects to the shared Eduvo backend and displays live loyalty member data from the Loyalty App API.

## Run in a browser

Start the shared backend first:

```powershell
cd C:\IonicExercise\EduvoBackend
npm start
```

Then start the mobile frontend on a fixed port (the POS currently uses 8100):

```powershell
cd C:\IonicExercise\MobileAppGroupAssignment
npm start -- --port 8101
```

## Run on Android

The generated Android project is in `android`. The current native backend address in both environment files is `http://localhost:3000`. For USB-connected presentation/testing, forward that phone port to the laptop:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:3000 tcp:3000
```

The phone must have USB debugging enabled and authorized, and the shared backend must be running. Reapply forwarding after reconnecting/restarting the phone or ADB. `localhost` on the phone does not reach your laptop without this forwarding. Both native mobile and POS apps can use the same forwarded backend port.

Run `powershell -File scripts/presentation-preflight.ps1` to check services and the USB connection. Add `-ReconnectPhone` to restore just the backend forwarding on one connected device. If several devices are connected, specify `-DeviceSerial` explicitly.

For an emulator-only setup, `http://10.0.2.2:3000` is an alternative; for untethered physical testing, configure a reachable laptop LAN address or deployed HTTPS backend. Those are different configurations—do not mix them with the default USB setup.

Build and synchronize before opening Android Studio:

```powershell
npm run build
npx cap sync android
npx cap open android
```

## Push notifications

The verified notification feature is the in-app inbox, including messages saved by the shared backend and read status shared with the webpage. This does not deliver Android system push alerts.

Native push registration support exists, but actual push delivery remains unverified and needs a working push sender/provider plus the matching Firebase configuration. The API owner's manual notification endpoints were confirmed to be placeholders. Do not describe the local inbox substitute as push delivery, and do not commit credentials or private configuration to a public repository.

## Validation commands

```powershell
npm run build
npm run lint
npm test -- --watch=false
```
