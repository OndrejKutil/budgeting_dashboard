import Foundation

/// Native settings, stored on the device (UserDefaults). They live natively rather than in the
/// web app so the lock and zoom apply before the site has loaded.
final class AppSettings {
    static let shared = AppSettings()

    static let defaultLockTimeout: TimeInterval = 5 * 60
    /// Matches Safari's 85 % page zoom the owner uses for the PWA.
    static let defaultPageZoom = 0.85
    static let pageZoomRange = 0.5...1.5

    private enum Key {
        static let lockEnabled = "budget.lock.enabled"
        static let lockTimeout = "budget.lock.timeoutSeconds"
        static let pageZoom = "budget.pageZoom"
    }

    private let defaults = UserDefaults.standard

    var lockEnabled: Bool {
        get { defaults.object(forKey: Key.lockEnabled) as? Bool ?? true }
        set { defaults.set(newValue, forKey: Key.lockEnabled) }
    }

    /// Seconds in the background after which Face ID is asked again. 0 = every time.
    var lockTimeout: TimeInterval {
        get { max(0, defaults.object(forKey: Key.lockTimeout) as? Double ?? Self.defaultLockTimeout) }
        set { defaults.set(max(0, newValue), forKey: Key.lockTimeout) }
    }

    var pageZoom: Double {
        get { Self.clampZoom(defaults.object(forKey: Key.pageZoom) as? Double ?? Self.defaultPageZoom) }
        set { defaults.set(Self.clampZoom(newValue), forKey: Key.pageZoom) }
    }

    static func clampZoom(_ value: Double) -> Double {
        min(max(value, pageZoomRange.lowerBound), pageZoomRange.upperBound)
    }
}
