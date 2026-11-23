import SwiftUI
import WidgetKit

/// All widgets live in this one extension (a free Apple ID pays one App ID per extension).
@main
struct BudgetWidgets: WidgetBundle {
    var body: some Widget {
        DiagnosticWidget()
    }
}

// MARK: - Round C diagnostic widget

/// Throwaway widget that proves the app and the widget share the App Group after SideStore signs
/// (and re-signs) them: it shows the group it found, how it found it, and the value the app wrote.
struct DiagnosticWidget: Widget {
    let kind = "BudgetDiagnostic"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DiagnosticProvider()) { entry in
            DiagnosticView(entry: entry)
        }
        .configurationDisplayName("Budget diagnostic")
        .description("Checks that the app and the widget share data.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct DiagnosticEntry: TimelineEntry {
    let date: Date
    let groupIdentifier: String
    let groupSource: String
    let groupAccessible: Bool
    let appWrittenAt: Date?
    let appGroupIdentifier: String?
    let appGroupSource: String?
}

struct DiagnosticProvider: TimelineProvider {
    func placeholder(in context: Context) -> DiagnosticEntry { makeEntry() }

    func getSnapshot(in context: Context, completion: @escaping (DiagnosticEntry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DiagnosticEntry>) -> Void) {
        completion(Timeline(entries: [makeEntry()], policy: .after(Date().addingTimeInterval(15 * 60))))
    }

    private func makeEntry() -> DiagnosticEntry {
        let group = AppGroup.current
        let shared = AppGroup.defaults
        return DiagnosticEntry(
            date: Date(),
            groupIdentifier: group.identifier,
            groupSource: group.source,
            groupAccessible: group.accessible,
            appWrittenAt: shared?.object(forKey: SharedKeys.diagnosticWrittenAt) as? Date,
            appGroupIdentifier: shared?.string(forKey: SharedKeys.diagnosticAppGroup),
            appGroupSource: shared?.string(forKey: SharedKeys.diagnosticAppGroupSource)
        )
    }
}

struct DiagnosticView: View {
    let entry: DiagnosticEntry
    @Environment(\.widgetFamily) private var family

    private var sameGroup: Bool { entry.appGroupIdentifier == entry.groupIdentifier }

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("Budget · diagnostic").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            Text(entry.groupAccessible ? "✅ Group OK" : "❌ No group access")
                .font(.caption.weight(.semibold))
            Text(entry.groupIdentifier)
                .font(.system(size: 9, design: .monospaced))
                .lineLimit(2)
                .minimumScaleFactor(0.6)
            Text("found via \(entry.groupSource)").font(.system(size: 10)).foregroundColor(.secondary)
            Spacer(minLength: 2)
            if let writtenAt = entry.appWrittenAt {
                (Text("App wrote ") + Text(writtenAt, style: .relative) + Text(" ago"))
                    .font(.caption2)
                Text(sameGroup ? "✅ same group as the app" : "⚠️ app used \(entry.appGroupIdentifier ?? "?")")
                    .font(.system(size: 10))
                    .lineLimit(2)
                    .minimumScaleFactor(0.6)
            } else {
                Text("❌ Nothing from the app yet").font(.caption2)
            }
            if family == .systemMedium {
                Text("Widget rendered \(entry.date.formatted(date: .omitted, time: .standard)) · app via \(entry.appGroupSource ?? "–")")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .foregroundColor(.white)
        .widgetBackground()
    }
}

private let widgetBackgroundColor = Color(red: 6 / 255, green: 13 / 255, blue: 16 / 255)

extension View {
    /// iOS 17+ requires `containerBackground`; older versions use a plain background.
    @ViewBuilder
    func widgetBackground() -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { widgetBackgroundColor }
        } else {
            padding().background(widgetBackgroundColor)
        }
    }
}
