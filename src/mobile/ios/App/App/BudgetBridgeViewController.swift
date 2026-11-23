import UIKit
import Capacitor

/// Capacitor's web view controller, plus the app's own plugin, the Face ID lock and page zoom.
class BudgetBridgeViewController: CAPBridgeViewController {
    private(set) var privacyLock: PrivacyLock?
    private var hasAppeared = false

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BudgetNativePlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        applyPageZoom()
        privacyLock = PrivacyLock(host: self)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if !hasAppeared {
            hasAppeared = true
            privacyLock?.viewDidAppear()
        }
    }

    /// Same effect as Safari's page zoom (aA menu), which the PWA follows but a web view doesn't.
    func applyPageZoom() {
        webView?.pageZoom = CGFloat(AppSettings.shared.pageZoom)
    }
}
