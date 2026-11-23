import Foundation

/// The data the widgets show, written by the web app (through `BudgetNative.setWidgetData`) each
/// time the app opens or a transaction changes, and stored as JSON in the App Group. Mirrors
/// `WidgetSnapshot` in src/frontend/src/lib/native/widgets.ts; keep the two in sync.
struct WidgetSnapshot: Codable {
    struct Month: Codable {
        let year: Int
        /// 1-12.
        let month: Int
        let spent: Double
        let income: Double
        let cashFlow: Double
        /// Average monthly spending over the previous six months; nil without history.
        let usualSpent: Double?
        /// Cumulative spending by day of month (index 0 = day 1), up to the day it was generated.
        let cumulative: [Double]
        /// The six-month average of the same, one value per day of the month.
        let usualCumulative: [Double]
    }

    struct Payment: Codable {
        let name: String
        let amount: Double
        let currency: String
        /// `YYYY-MM-DD`.
        let date: String
        let autoPost: Bool
    }

    let version: Int
    let generatedAt: Date
    /// e.g. `cs-CZ`.
    let locale: String
    /// Base currency of the month figures, e.g. `CZK`.
    let currency: String
    /// The app's privacy mode: home-screen widgets hide amounts.
    let privacyMode: Bool
    let month: Month
    /// Upcoming recurring payments, soonest first.
    let upcoming: [Payment]
    /// Localized UI strings (from the web app's translations), keyed by name.
    let labels: [String: String]
}

enum WidgetStore {
    static let snapshotKey = "widget.snapshot"

    static func load() -> WidgetSnapshot? {
        guard let data = AppGroup.defaults?.data(forKey: snapshotKey) else { return nil }
        return try? decoder.decode(WidgetSnapshot.self, from: data)
    }

    /// Validates and stores the JSON; nil clears it (logout). Returns false if it doesn't decode.
    @discardableResult
    static func save(json: String?) -> Bool {
        guard let defaults = AppGroup.defaults else { return false }
        guard let json = json, let data = json.data(using: .utf8) else {
            defaults.removeObject(forKey: snapshotKey)
            return true
        }
        guard (try? decoder.decode(WidgetSnapshot.self, from: data)) != nil else { return false }
        defaults.set(data, forKey: snapshotKey)
        return true
    }

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}

/// Deep links into the app (`com.ondrejkutil.budget://…`), used by widget taps and controls.
enum DeepLink {
    static let scheme = "com.ondrejkutil.budget"

    static let addTransaction = URL(string: "\(scheme)://add")!
    static let importScreenshot = URL(string: "\(scheme)://import-screenshot")!

    static func open(path: String) -> URL {
        var components = URLComponents()
        components.scheme = scheme
        components.host = "open"
        components.queryItems = [URLQueryItem(name: "path", value: path)]
        return components.url!
    }

    /// What the web app should do for a deep link: `add`, or a path under /dashboard.
    /// nil for anything else (including the OAuth callback, which the sign-in sheet handles).
    static func target(of url: URL) -> String? {
        guard url.scheme?.lowercased() == scheme else { return nil }
        switch url.host {
        case "add":
            return "add"
        case "import-screenshot":
            return "/dashboard/import/screenshot"
        case "open":
            let path = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "path" })?.value
            guard let path = path, path == "/dashboard" || path.hasPrefix("/dashboard/") else { return nil }
            return path
        default:
            return nil
        }
    }
}
