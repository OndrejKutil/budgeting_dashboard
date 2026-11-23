# Budget on iPhone: setup guide

For a Windows PC and an iPhone, no Mac. Status: **sections 1–2 ready (round A)**; later sections
are added as the features ship.

What you'll end up with: SideStore (a sideloading app) on the phone, signed with a free Apple ID,
which installs and keeps renewing the Budget app. Free signing lasts 7 days, so SideStore has to
refresh the apps at least once a week.

Official SideStore docs: https://docs.sidestore.io (install guide, troubleshooting, pairing file).

---

## 1. One-time phone setup (≈30–60 min)

**Before you start**

- Check the iOS version: Settings › General › About. This guide was written for **iOS 26.6.2**.
  Don't install iOS updates until you've checked SideStore's GitHub issues for the new version
  (section 7).
- Use **Wi-Fi** (SideStore's docs say mobile data isn't suitable for installing).
- Apple ID: SideStore's docs suggest a **secondary Apple ID** rather than your main one (older
  setups occasionally got accounts locked). It needs two-factor authentication with a trusted
  device; security keys aren't supported by iloader. It doesn't have to be the Apple ID signed in
  on the phone.

### 1a. On the PC

1. Install **iTunes from Apple** (https://www.apple.com/itunes/download/win64). If that doesn't work,
   uninstall iTunes and "Apple Mobile Device Support", then install the **Apple Devices** app from
   the Microsoft Store.
2. Install **iloader** from its official page only: https://iloader.app (or
   https://github.com/nab138/iloader/releases — the `iloader-windows-x64.msi`).

### 1b. On the iPhone

3. Install **LocalDevVPN** from the App Store. Open it, tap **Connect**, allow the VPN configuration.
   It must be connected whenever SideStore installs or refreshes anything.

### 1c. Install SideStore with iloader

4. Connect the iPhone to the PC by USB, unlock it, tap **Trust** and enter the passcode.
5. Open iloader → **Sign in** with the Apple ID (case-sensitive) → enter the 2FA code.
6. Select the iPhone, then under **Installers** choose **SideStore (Stable)** (that's 0.7.0-alpha,
   the version that can still sign in after Apple's changes this autumn). Not Nightly.
7. Wait for "SideStore Installed!". iloader also places the pairing file, so there's nothing else to
   copy.

### 1d. Finish on the iPhone

8. Settings › General › **VPN & Device Management** › under "Developer App" tap your Apple ID ›
   **Trust** › **Allow & Restart**.
9. Settings › **Privacy & Security** › scroll down › **Developer Mode** on. The phone restarts.
10. Open LocalDevVPN → **Connect**.
11. Open SideStore and sign in with the **same Apple ID** you used in iloader.
    - If you get an **"Account Repair Required"** sheet: tap the link it offers, sign in and accept
      Apple's terms / finish verification, then sign in to SideStore again. Don't keep skipping it.
12. In SideStore › **My Apps**, tap the **7 DAYS** counter next to SideStore to refresh it (needed
    once after installing). If it asks about certificates, tap **Yes** / **Refresh Now**. SideStore
    closes itself and is usable again a few seconds later.

### If SideStore can't sign in (error 503)

Since about 20 Nov 2026 Apple rejects SideStore's sign-in for many people
([issue #1744](https://github.com/SideStore/SideStore/issues/1744),
[discussion #1741](https://github.com/SideStore/SideStore/discussions/1741)). No official fix yet.
The workaround users report, with mixed results:

1. SideStore › Settings › **User Customizations** › turn **On-Device Anisette** off; force-quit and
   reopen SideStore.
2. Settings › **Anisette Servers**: pick **SideStore (New)** (or jkcoxson) and turn off
   **Enable Auto Rotation**.
3. User Customizations › **Anisette Client Configuration** › **Remote Server Sync**, then
   **Save as Overrides** (going back without saving discards it). Client Info should contain
   `Mac OS X;`.
4. Reset adi.pb with **keep headers** ticked.
5. Force-quit SideStore, connect LocalDevVPN, sign in again.

If it still fails, tell me (in the session) the exact error text. Stopgap: iloader can still install
apps from the PC, which gives another 7 days.

---

## 2. Installing a Budget test build (rounds A–B)

Until the update channel exists (round B), builds come from GitHub as a file:

1. On the phone, open the build link I give you (GitHub › Actions › the run › **Artifacts** ›
   `Budget-1.0.N-ipa`). You need to be signed in to GitHub. The download is a `.zip`; tap it in the
   Files app to unzip it, which gives `Budget-1.0.N.ipa`.
2. Connect LocalDevVPN.
3. SideStore › **My Apps** › **+** (top left) › pick the `.ipa`.
4. Budget appears on the home screen and in My Apps with its own 7-day counter.

Installing a newer build the same way replaces the app and keeps its data (login).

---

## Later sections

3. Nightly refresh automation — round B
4. Everyday use (widget, notifications, Face ID, expiry banner) — rounds B–D
5. Updating — round B
6. Troubleshooting — round D (reboot + LocalDevVPN; re-place the pairing file with iloader:
   **Manage Pairing File › Place**; switch anisette server; wait 24–72 h after re-registering a
   device; App ID limit; never delete an expired app — refresh it, or its data is lost)
7. Before an iOS update — check https://github.com/SideStore/SideStore/issues for the new version
