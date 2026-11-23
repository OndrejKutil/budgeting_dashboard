import UIKit
import Capacitor

/// Capacitor's web view controller, plus registration of the app's own plugin.
class BudgetBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BudgetNativePlugin())
    }
}
