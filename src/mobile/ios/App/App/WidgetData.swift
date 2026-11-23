import Foundation
import WidgetKit

/// What the app shares with the home-screen widgets through the App Group.
enum WidgetData {
    /// Round C diagnostic: record that the app reached the shared container, then ask iOS to
    /// redraw the widgets. Called on launch and each time the app comes to the foreground.
    static func writeDiagnostic() {
        guard let shared = AppGroup.defaults else { return }
        shared.set(Date(), forKey: SharedKeys.diagnosticWrittenAt)
        shared.set(AppGroup.current.identifier, forKey: SharedKeys.diagnosticAppGroup)
        shared.set(AppGroup.current.source, forKey: SharedKeys.diagnosticAppGroupSource)
        WidgetCenter.shared.reloadAllTimelines()
    }
}
