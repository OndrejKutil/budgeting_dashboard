import Foundation

/// When the app's signing profile expires. SideStore signs with a free Apple ID, so profiles last
/// 7 days; if the app isn't refreshed in time it stops opening.
///
/// The profile is `embedded.mobileprovision` in the app bundle: a signed (CMS) blob with an XML
/// plist inside. Only the plist is needed, so it's cut out of the raw bytes rather than verifying
/// the signature. Builds without a profile (simulator, unsigned) report no date.
enum ProvisioningInfo {
    private static let overrideKey = "budget.debug.expiryOverrideDays"

    /// Debug override used to test the expiry banner: when set, the profile "expires" this many
    /// days from now. `nil` clears it.
    static var debugOverrideDays: Double? {
        get { UserDefaults.standard.object(forKey: overrideKey) as? Double }
        set {
            if let days = newValue {
                UserDefaults.standard.set(days, forKey: overrideKey)
            } else {
                UserDefaults.standard.removeObject(forKey: overrideKey)
            }
        }
    }

    static var expirationDate: Date? {
        if let days = debugOverrideDays {
            return Date().addingTimeInterval(days * 24 * 60 * 60)
        }
        return profileExpirationDate
    }

    private static let profileExpirationDate: Date? = {
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let data = try? Data(contentsOf: url),
              let start = data.range(of: Data("<?xml".utf8)),
              let end = data.range(of: Data("</plist>".utf8), in: start.lowerBound..<data.endIndex) else {
            return nil
        }
        let plistData = data.subdata(in: start.lowerBound..<end.upperBound)
        guard let plist = try? PropertyListSerialization.propertyList(from: plistData, format: nil) as? [String: Any] else {
            return nil
        }
        return plist["ExpirationDate"] as? Date
    }()
}
