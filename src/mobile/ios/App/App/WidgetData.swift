import Foundation
import WidgetKit

/// Hands the web app's widget snapshot to the home-screen and lock-screen widgets.
enum WidgetData {
    /// Stores the snapshot JSON (nil clears it) and asks iOS to redraw the widgets.
    @discardableResult
    static func save(json: String?) -> Bool {
        let saved = WidgetStore.save(json: json)
        if saved { WidgetCenter.shared.reloadAllTimelines() }
        return saved
    }
}
