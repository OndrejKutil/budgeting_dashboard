import Foundation

/// The App Group shared by the app and its widget, found at runtime.
///
/// The build declares `group.com.ondrejkutil.budget`, but SideStore renames groups when it signs
/// (`group.X` becomes `group.X.<TEAMID>`), so the final name can't be hardcoded. Lookup order:
/// 1. `ALTAppGroups` in Info.plist (written by SideStore 0.7.0-alpha at signing),
/// 2. the groups in this bundle's own provisioning profile (`embedded.mobileprovision`),
/// 3. the declared name (works when the build isn't renamed, e.g. a paid account).
/// Compiled into both the app and the widget extension; each reads its own bundle.
enum AppGroup {
    static let declared = "group.com.ondrejkutil.budget"

    struct Resolved {
        let identifier: String
        /// Where the name came from: "ALTAppGroups", "profile" or "declared".
        let source: String
        /// Whether the system actually grants access to the group's shared container.
        let accessible: Bool
    }

    static let current: Resolved = {
        let candidates: [(String, [String])] = [
            ("ALTAppGroups", Bundle.main.object(forInfoDictionaryKey: "ALTAppGroups") as? [String] ?? []),
            ("profile", profileAppGroups()),
        ]
        for (source, groups) in candidates {
            if let match = groups.first(where: { $0.hasPrefix(declared) }) {
                return Resolved(identifier: match, source: source, accessible: isAccessible(match))
            }
        }
        return Resolved(identifier: declared, source: "declared", accessible: isAccessible(declared))
    }()

    /// Shared UserDefaults, or nil if the group isn't accessible.
    static var defaults: UserDefaults? {
        current.accessible ? UserDefaults(suiteName: current.identifier) : nil
    }

    private static func isAccessible(_ identifier: String) -> Bool {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier) != nil
    }

    /// `Entitlements › com.apple.security.application-groups` from embedded.mobileprovision
    /// (a signed blob with an XML plist inside; only the plist is read).
    private static func profileAppGroups() -> [String] {
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let data = try? Data(contentsOf: url),
              let start = data.range(of: Data("<?xml".utf8)),
              let end = data.range(of: Data("</plist>".utf8), in: start.lowerBound..<data.endIndex),
              let plist = try? PropertyListSerialization.propertyList(
                from: data.subdata(in: start.lowerBound..<end.upperBound), format: nil) as? [String: Any],
              let entitlements = plist["Entitlements"] as? [String: Any] else {
            return []
        }
        return entitlements["com.apple.security.application-groups"] as? [String] ?? []
    }
}
