import AuthenticationServices
import Capacitor
import UIKit

/// The app's own Capacitor plugin. Its JavaScript side is
/// src/frontend/src/lib/native/budgetNative.ts; keep the two in sync.
@objc(BudgetNativePlugin)
public class BudgetNativePlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "BudgetNativePlugin"
    public let jsName = "BudgetNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startAuthSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setStatusBarStyle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAppSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAppSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProvisioningInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setDebugExpiryOverride", returnType: CAPPluginReturnPromise)
    ]

    /// The only URL scheme the sign-in sheet may return to. Must match the backend's
    /// NATIVE_IOS_OAUTH_CALLBACK_URL and the Supabase redirect URL allow list.
    static let oauthCallbackScheme = "com.ondrejkutil.budget"

    private var authSession: ASWebAuthenticationSession?

    // MARK: - OAuth sign-in sheet

    /// Opens the provider's sign-in page in ASWebAuthenticationSession. Google allows its sign-in
    /// there (it blocks embedded web views), and the sheet shares Safari's logins and passkeys.
    /// Resolves with the full callback URL; Supabase puts the tokens in its fragment.
    @objc func startAuthSession(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString),
              url.scheme?.lowercased() == "https" else {
            call.reject("A valid https sign-in URL is required.", "INVALID_URL")
            return
        }
        guard call.getString("callbackScheme") == Self.oauthCallbackScheme else {
            call.reject("Unexpected callback scheme.", "INVALID_SCHEME")
            return
        }

        DispatchQueue.main.async {
            guard self.authSession == nil else {
                call.reject("A sign-in is already in progress.", "IN_PROGRESS")
                return
            }

            let completion: ASWebAuthenticationSession.CompletionHandler = { [weak self] callbackURL, error in
                self?.authSession = nil
                if let error = error {
                    if let authError = error as? ASWebAuthenticationSessionError, authError.code == .canceledLogin {
                        call.reject("Sign-in was canceled.", "CANCELED")
                    } else {
                        call.reject(error.localizedDescription, "FAILED", error)
                    }
                    return
                }
                guard let callbackURL = callbackURL else {
                    call.reject("The sign-in sheet returned no URL.", "FAILED")
                    return
                }
                call.resolve(["url": callbackURL.absoluteString])
            }

            let session: ASWebAuthenticationSession
            if #available(iOS 17.4, *) {
                session = ASWebAuthenticationSession(
                    url: url,
                    callback: .customScheme(Self.oauthCallbackScheme),
                    completionHandler: completion
                )
            } else {
                session = ASWebAuthenticationSession(
                    url: url,
                    callbackURLScheme: Self.oauthCallbackScheme,
                    completionHandler: completion
                )
            }
            session.presentationContextProvider = self
            // Share Safari's cookies so an existing GitHub/Google login (and passkeys) can be reused.
            session.prefersEphemeralWebBrowserSession = false

            self.authSession = session
            if !session.start() {
                self.authSession = nil
                call.reject("Could not open the sign-in sheet.", "FAILED")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    // MARK: - Status bar

    /// `light` = light text (dark theme), `dark` = dark text (light theme).
    @objc func setStatusBarStyle(_ call: CAPPluginCall) {
        let style: UIStatusBarStyle = call.getString("style") == "dark" ? .darkContent : .lightContent
        DispatchQueue.main.async {
            (self.bridge?.viewController as? CAPBridgeViewController)?.setStatusBarStyle(style)
            call.resolve()
        }
    }

    // MARK: - App settings (Face ID lock, page zoom)

    private func settingsPayload() -> [String: Any] {
        let settings = AppSettings.shared
        return [
            "lockEnabled": settings.lockEnabled,
            "lockTimeoutSeconds": settings.lockTimeout,
            "pageZoom": settings.pageZoom,
            "biometry": PrivacyLock.biometryName()
        ]
    }

    @objc func getAppSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(self.settingsPayload())
        }
    }

    /// Any subset of `lockEnabled`, `lockTimeoutSeconds`, `pageZoom`. Turning the lock off
    /// requires Face ID / passcode first; a failed check rejects with `CANCELED`.
    @objc func setAppSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let settings = AppSettings.shared
            let controller = self.bridge?.viewController as? BudgetBridgeViewController

            let apply = {
                if let timeout = call.getDouble("lockTimeoutSeconds") {
                    settings.lockTimeout = timeout
                }
                if let zoom = call.getDouble("pageZoom") {
                    settings.pageZoom = zoom
                    controller?.applyPageZoom()
                }
                if let enabled = call.getBool("lockEnabled") {
                    settings.lockEnabled = enabled
                }
                call.resolve(self.settingsPayload())
            }

            let turningLockOff = call.getBool("lockEnabled") == false && settings.lockEnabled
            guard turningLockOff, let lock = controller?.privacyLock else {
                apply()
                return
            }
            lock.runOwnerCheck(reason: LockCoverView.text.unlockReason) { success in
                if success {
                    apply()
                } else {
                    call.reject("Face ID check was canceled.", "CANCELED")
                }
            }
        }
    }

    // MARK: - Signing profile expiry

    private func provisioningPayload() -> [String: Any] {
        var payload: [String: Any] = ["isOverride": ProvisioningInfo.debugOverrideDays != nil]
        if let date = ProvisioningInfo.expirationDate {
            payload["expiresAt"] = ISO8601DateFormatter().string(from: date)
        }
        return payload
    }

    /// `expiresAt` (ISO 8601) is missing when the build has no profile (simulator).
    @objc func getProvisioningInfo(_ call: CAPPluginCall) {
        call.resolve(provisioningPayload())
    }

    /// `{ days: number }` fakes an expiry that many days from now; `{}` clears it.
    @objc func setDebugExpiryOverride(_ call: CAPPluginCall) {
        ProvisioningInfo.debugOverrideDays = call.getDouble("days")
        call.resolve(provisioningPayload())
    }
}
