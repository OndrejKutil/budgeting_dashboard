# Budget on iPhone: setup guide

For a Windows PC and an iPhone, no Mac. Status: **sections 1–5 ready (rounds A–B)**; the rest is added as the features ship.

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
- Apple ID: your **main Apple ID works**. SideStore's docs suggest a separate one as a precaution:
  your password goes into iloader/SideStore, and older setups occasionally got accounts
  temporarily locked (fixable with a password reset; nothing on the phone is affected). A second
  Apple ID takes ~10 min at https://account.apple.com, can use your own phone number for 2FA, and
  is never signed in on the iPhone itself — only in iloader and SideStore. Pick one before setup:
  switching later means reinstalling the apps. Security-key 2FA isn't supported by iloader.

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

## 2. Installing Budget

**From the SideStore source (normal way, once SideStore can sign in):**

1. Connect LocalDevVPN.
2. SideStore › **Sources** › **+** (top left) › paste
   `https://github.com/OndrejKutil/budgeting_dashboard/releases/download/ios-source/source.json`
   › tap the **⊕** next to the preview.
3. Open the **Budget** app from that source and tap **FREE** to install.
4. If SideStore asks whether to keep app extensions: **keep** them (from round C on, the widget
   is one).
5. If you installed Budget earlier with iloader or from a file, delete that copy first (only once):
   SideStore can only update apps it installed itself. You'll need to log in again.

**Without SideStore (stopgap while SideStore can't sign in):** on the PC, download the latest
`Budget-1.0.N.ipa` from https://github.com/OndrejKutil/budgeting_dashboard/releases, connect the
iPhone by USB and use iloader › **Import IPA**. Lasts 7 days; repeat to renew.

Installing a newer build over an existing one keeps the app's data (login, settings).

---

## 3. Nightly refresh automation

Free signing lasts 7 days, so SideStore should refresh every night while the phone is at home on
Wi-Fi. In **Shortcuts** › **Automation** › **+** › **Time of Day**, create three automations, each
**Repeat: Daily**, **Run Immediately**, **Notify When Run** off:

| Time | Actions |
|---|---|
| 03:00 | **Set VPN** › LocalDevVPN › **Connect** |
| 03:05 | **Open URLs** `sidestore://` › **Wait** 5 s › SideStore's **Refresh All Apps** |
| 03:30 | **Set VPN** › Tailscale › **Connect** (without Tailscale: LocalDevVPN › Disconnect) |

- Separate automations because SideStore restarts itself during a refresh, which would cut a single
  shortcut short. Opening `sidestore://` first avoids "You are not signed in".
- **Tailscale:** iOS runs one VPN at a time; connecting LocalDevVPN drops Tailscale. Turn off
  Tailscale's **Connect On Demand** (Settings › VPN › Tailscale › ⓘ) or it can take the VPN back
  mid-refresh. The 03:30 step reconnects it.
- Test once with times a few minutes ahead and the phone locked; SideStore › My Apps should then
  show 7 days again. Keep the phone on Wi-Fi overnight, ideally charging.

**Refreshing or updating on mobile data** (backup for trips): SideStore 0.7.0-alpha has an
experimental **Cellular Refresh** that briefly turns mobile data off while it installs on the phone.

1. In Shortcuts, create a shortcut named exactly `TurnOffData` with **Set Mobile Data** › Off, and
   one named exactly `TurnOnData` with **Set Mobile Data** › On.
2. SideStore › Settings › **Experimental Features** › **Cellular Refresh** on.
3. With LocalDevVPN connected and no Wi-Fi, refresh or update as usual; it jumps to Shortcuts
   briefly. Tested and working on 24 Nov 2026.

---

## 4. Everyday use

**Settings** — in the app, Profile › **App** (only visible in the iPhone app):

- **Face ID lock** — asks for Face ID (or the passcode) when the app opens and when you return
  after the chosen time (default 5 min). Cancelling keeps it locked with an **Unlock** button.
  The app switcher always shows a blurred screen. Turning the lock off asks for Face ID first.
- **Zoom** — size of the whole page, like Safari's page zoom. Default 85 % (matches the PWA).
- **Daily reminder** — 20:00, to log the day's spending; skipped on days you've already logged something.
- **Recurring payments** — 07:00 on the day each recurring payment is due ("auto-post" for ones
  the Raspberry Pi posts automatically at 05:00).
- **Send test notification** — arrives 5 s later; lock the phone or leave the app to see it.

Notifications are scheduled on the phone (no server push on a free Apple account): they're
refreshed every time you open the app, so a recurring payment changed on the website is picked
up the next time you open Budget. iOS asks for notification permission once; if you said no,
turn them on in Settings › Notifications › Budget. With privacy mode on, notifications don't
show amounts.

---

## 5. Updating

- **Website changes** (dashboard, pages, fixes): nothing to do. The app loads the live site, so
  they appear the next time you open it.
- **App changes** (Face ID, notifications, widget…): a new version appears in SideStore ›
  **My Apps** (or the Budget page in your source) — tap **Update**. LocalDevVPN must be on.

---

**Expiry banner** — free signing lasts 7 days. When the app has under 3 days left, the dashboard
shows a yellow banner: open SideStore with LocalDevVPN on and refresh. If it expires anyway, the
app just won't open until refreshed — **don't delete it**, or its data (login, settings) is lost.
Profile › App › **Test the expiry warning** fakes 2 days left so you can see the banner.

**Widgets** — all come from the one Budget widget extension:

| Where | Widget | Shows |
|---|---|---|
| Home screen | **This month** (small, medium) | Spent this month vs your usual month (6-month average), days left; medium adds cash flow, % of income and **per day** (cash flow left ÷ days left) |
| Home screen | **Upcoming payments** (medium) | Next 3 recurring payments |
| Home screen | **Pace** (medium) | This month's spending line vs the 6-month average |
| Lock screen | **Next payment** (rectangular) | Name, day and amount |
| Lock screen | **Per day** (circular) | What you can spend per day |
| Lock screen | **Cash flow** (circular) | Cash flow as % of income |
| Lock screen / Control Center / Action Button | **Add transaction**, **Import screenshot** | Open the app straight there |

- Add home-screen widgets: long-press the home screen › **Edit** › **Add Widget** › Budget.
- Lock screen: long-press the lock screen › **Customize** › Lock Screen › tap the widget area
  (below the clock) or a bottom corner button › Budget.
- Control Center: open it › **+** (top left) › Add a Control › Budget. Action Button:
  Settings › Action Button › Controls › Budget.
- Tapping a widget opens the matching page in the app.
- **Freshness:** widgets show the data from the last time the app was open (or a transaction was
  saved); "days left" and "per day" are recalculated every day on their own. After a month
  change they ask you to open Budget.
- **Privacy:** with privacy mode on, home-screen widgets show "•••" instead of amounts.
  Lock-screen amounts are hidden by iOS while the phone is locked and appear once Face ID
  recognises you; percentages are always visible.
- The daily 20:00 reminder skips today if you've already logged something today.

---

## 6. Troubleshooting

Try these in order — it's the order other SideStore users found effective.

1. **"Not connected to Wi-Fi and/or VPN"** (the most common error): **reboot the phone**, then
   open LocalDevVPN and connect again, then retry in SideStore.
2. **Still failing / "Could not determine UDID" / pairing errors:** re-create the pairing file.
   On the PC: iloader › Settings › **Delete Stored Pairing**, connect the iPhone by USB, then
   **Manage Pairing File** › **Place** next to SideStore.
3. **Sign-in errors** (503, "ADI native error -45063", freezing):
   SideStore › Settings › **Anisette Servers** — pick a Mac-based one (SideStore (New) or
   jkcoxson) and turn off Auto Rotation; User Customizations › **On-Device Anisette** off;
   **Reset adi.pb**. During the Nov 2026 outage, also the Client Info fix in section 1.
4. **Error 1006 after a reset or a new pairing:** a newly registered device can take
   **24–72 hours** on Apple's side. Wait, then retry.
5. **"Maximum number of App IDs"**: a free Apple ID gets 10 per 7 days (SideStore, Budget and its
   widget each use one). IDs free up 7 days after they were created — wait it out; don't rename
   or reinstall apps under new IDs in the meantime.
6. **App expired / won't open:** refresh it in SideStore (VPN on). Never delete it to "fix" it —
   deleting loses its data. If SideStore itself expired, reinstall SideStore with iloader
   (Budget keeps its data), then refresh.
7. **Stopgap when nothing else works:** install the latest `.ipa` from
   https://github.com/OndrejKutil/budgeting_dashboard/releases with iloader › **Import IPA** —
   another 7 days while SideStore gets fixed.

When asking for help, include the exact error text and SideStore's log
(Settings › Developer › logs, or a screenshot of the error).

---

## 7. Before an iOS update

Apple has broken SideStore with iOS updates several times (e.g. iOS 26.4 refresh, the autumn 2026
sign-in changes). Before installing an update:

1. Refresh all apps in SideStore first, so you have a full 7 days either way.
2. Check https://github.com/SideStore/SideStore/issues for the new iOS version number — if
   people report broken refresh or sign-in, wait for a fix.
3. Turn off automatic iOS updates (Settings › General › Software Update › Automatic Updates) so
   this check happens before, not after.

The PWA (budget.ondrejkutil.com added to the home screen) keeps working whatever happens to
SideStore.
