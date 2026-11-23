import UIKit
import WebKit
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

    /// Passes a deep link (widget tap, control) to the web app. Buffered by Capacitor until the
    /// page has registered its listener, so it also works on a cold start.
    func handleDeepLink(_ url: URL) {
        guard let target = DeepLink.target(of: url),
              let plugin = bridge?.plugin(withName: "BudgetNative") as? BudgetNativePlugin else { return }
        plugin.emitDeepLink(target)
    }

    /// Same effect as Safari's page zoom (aA menu), which the PWA follows but a web view doesn't.
    ///
    /// `WKWebView.pageZoom` only shrinks the page and leaves an empty strip on the right, because the
    /// layout width stays at the device width. Instead the viewport meta tag is rewritten so the
    /// page lays out at `screen width / zoom` and is scaled to fit, like Safari does. A user script
    /// applies it to every page load; one is added per change (the latest wins), and the current
    /// page is updated right away.
    func applyPageZoom() {
        guard let webView = webView else { return }
        let script = Self.viewportScript(zoom: AppSettings.shared.pageZoom)
        webView.pageZoom = 1
        webView.configuration.userContentController.addUserScript(
            WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        )
        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    private static func viewportScript(zoom: Double) -> String {
        let value = String(format: "%.3f", zoom)
        return """
        (function () {
          var zoom = \(value);
          var meta = document.querySelector('meta[name="viewport"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'viewport';
            (document.head || document.documentElement).appendChild(meta);
          }
          var width = Math.round(screen.width / zoom);
          meta.setAttribute('content', 'width=' + width + ', initial-scale=' + zoom +
            ', minimum-scale=' + zoom + ', maximum-scale=' + zoom + ', user-scalable=no, viewport-fit=cover');
        })();
        """
    }
}
