import AppIntents
import SwiftUI
import WidgetKit

/// All widgets and controls live in this one extension (a free Apple ID pays one App ID per
/// extension). Data comes from `WidgetSnapshot`, written by the app; see docs/mobile/README.md.
@main
struct BudgetWidgets: WidgetBundle {
    var body: some Widget {
        ThisMonthWidget()
        UpcomingWidget()
        PaceWidget()
        NextPaymentWidget()
        PerDayWidget()
        CashFlowWidget()
        if #available(iOS 18.0, *) {
            AddTransactionControl()
            ImportScreenshotControl()
        }
    }
}

// MARK: - Timeline

struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

/// One entry now and one at each of the next midnights, so "days left" and "per day" stay right
/// even when the app isn't opened. The app reloads the timelines whenever it writes new data.
struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(SnapshotEntry(date: Date(), snapshot: context.isPreview ? (WidgetStore.load() ?? .sample) : WidgetStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let snapshot = WidgetStore.load()
        let now = Date()
        let calendar = Calendar.current
        var dates = [now]
        var next = calendar.startOfDay(for: now)
        for _ in 0..<3 {
            next = calendar.date(byAdding: .day, value: 1, to: next)!
            dates.append(next)
        }
        completion(Timeline(entries: dates.map { SnapshotEntry(date: $0, snapshot: snapshot) }, policy: .atEnd))
    }
}

// MARK: - Model

/// Values derived from a snapshot for a given day.
struct MonthModel {
    let snapshot: WidgetSnapshot
    let date: Date

    private var calendar: Calendar { Calendar.current }
    private var day: Int { calendar.component(.day, from: date) }

    /// False once the month has changed since the app last wrote data.
    var isCurrent: Bool {
        let parts = calendar.dateComponents([.year, .month], from: date)
        return parts.year == snapshot.month.year && parts.month == snapshot.month.month
    }

    var daysInMonth: Int { calendar.range(of: .day, in: .month, for: date)?.count ?? 30 }
    /// Including today.
    var daysLeft: Int { max(1, daysInMonth - day + 1) }

    var spent: Double { snapshot.month.spent }
    var usual: Double? { snapshot.month.usualSpent.flatMap { $0 > 0 ? $0 : nil } }

    /// Spending vs the six-month average month, as on the Overview (+0.08 = 8 % more).
    var vsUsual: Double? { usual.map { (spent - $0) / $0 } }
    /// The bar spans the larger of this month's spending and a usual month, so it only fills up
    /// completely once spending passes a usual month.
    private var barScale: Double? { usual.map { max(spent, $0) } }
    var barFraction: Double? { barScale.map { min(spent / $0, 1) } }
    /// Marker: where a usual month is by the day the data was written.
    var usualMarker: Double? {
        guard let scale = barScale, let byNow = usualByDataDay else { return nil }
        return min(byNow / scale, 1)
    }

    /// The six-month average cumulative spending on the day the data was written.
    var usualByDataDay: Double? {
        let index = snapshot.month.cumulative.count - 1
        let usual = snapshot.month.usualCumulative
        guard index >= 0, !usual.isEmpty else { return nil }
        return usual[min(index, usual.count - 1)]
    }

    /// Positive = spending more than usual by this point of the month.
    var paceDifference: Double? {
        guard let usual = usualByDataDay, let current = snapshot.month.cumulative.last else { return nil }
        return current - usual
    }

    var cashFlow: Double { snapshot.month.cashFlow }
    var cashFlowShare: Double? { snapshot.month.income > 0 ? cashFlow / snapshot.month.income : nil }
    /// What can still be spent per day without the month's cash flow going below zero.
    var perDay: Double { max(0, cashFlow) / Double(daysLeft) }
}

// MARK: - Formatting

struct WidgetFormat {
    let snapshot: WidgetSnapshot

    var locale: Locale { Locale(identifier: snapshot.locale) }

    func text(_ key: String, _ fallback: String, _ params: [String: String] = [:]) -> String {
        var value = snapshot.labels[key] ?? fallback
        for (name, replacement) in params { value = value.replacingOccurrences(of: "{\(name)}", with: replacement) }
        return value
    }

    /// Same as CURRENCY_LOCALE in src/frontend/src/lib/currency.ts: amounts look the way the app
    /// shows them ("18 852 Kč"), whatever the app language.
    static let currencyLocales = [
        "AUD": "en_AU", "CAD": "en_CA", "CZK": "cs_CZ", "EUR": "de_DE",
        "GBP": "en_GB", "PLN": "pl_PL", "USD": "en_US",
    ]

    private func currencyLocale(_ code: String) -> Locale {
        Locale(identifier: Self.currencyLocales[code] ?? "en_US")
    }

    func money(_ value: Double, currency: String? = nil, hideable: Bool = true) -> String {
        if hideable && snapshot.privacyMode { return "•••" }
        let code = currency ?? snapshot.currency
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = currencyLocale(code)
        formatter.currencyCode = code
        formatter.maximumFractionDigits = 0
        formatter.minimumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "\(Int(value))"
    }

    func number(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = currencyLocale(snapshot.currency)
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "\(Int(value))"
    }

    func percent(_ value: Double, signed: Bool = false) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .percent
        formatter.locale = locale
        formatter.maximumFractionDigits = 0
        if signed { formatter.positivePrefix = "+" + formatter.positivePrefix }
        return formatter.string(from: NSNumber(value: value)) ?? "\(Int(value * 100)) %"
    }

    func monthName(_ model: MonthModel) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.setLocalizedDateFormatFromTemplate("LLLL")
        let date = Calendar.current.date(from: DateComponents(year: model.snapshot.month.year, month: model.snapshot.month.month)) ?? Date()
        return formatter.string(from: date).uppercased(with: locale)
    }

    func time(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.setLocalizedDateFormatFromTemplate("Hm")
        return formatter.string(from: date)
    }

    /// "Today", "Tomorrow" or a short date.
    func dueDate(_ isoDate: String, now: Date) -> String {
        guard let date = Self.parseDay(isoDate) else { return isoDate }
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: date).day ?? 0
        if days == 0 { return text("today", "Today") }
        if days == 1 { return text("tomorrow", "Tomorrow") }
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.setLocalizedDateFormatFromTemplate("EEEdMMM")
        return formatter.string(from: date)
    }

    static func parseDay(_ isoDate: String) -> Date? {
        let parts = isoDate.prefix(10).split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    func upcoming(from now: Date, limit: Int) -> [WidgetSnapshot.Payment] {
        let today = Calendar.current.startOfDay(for: now)
        return snapshot.upcoming.filter { (Self.parseDay($0.date) ?? .distantPast) >= today }.prefix(limit).map { $0 }
    }
}

// MARK: - Shared views

let accent = Color(red: 245 / 255, green: 166 / 255, blue: 35 / 255)
let widgetBackgroundColor = Color(red: 11 / 255, green: 18 / 255, blue: 22 / 255)
let mutedText = Color(red: 0.62, green: 0.69, blue: 0.73)
let overColor = Color(red: 0.95, green: 0.47, blue: 0.42)
let underColor = Color(red: 0.34, green: 0.82, blue: 0.61)

extension View {
    /// iOS 17+ container background (dark in full colour; the system's in tinted/clear styles).
    func homeWidgetBackground() -> some View {
        containerBackground(for: .widget) { widgetBackgroundColor }
    }
}

struct Caption: View {
    let text: String
    var body: some View {
        Text(text).font(.system(size: 11, weight: .semibold)).foregroundColor(mutedText).lineLimit(1)
    }
}

struct BigAmount: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 24, weight: .bold, design: .rounded))
            .minimumScaleFactor(0.6)
            .lineLimit(1)
            .widgetAccentable()
    }
}

struct ProgressBar: View {
    let fraction: Double
    /// "Usual by now", drawn as a small caret under the bar so it shows on any fill and in the
    /// clear/tinted home-screen style.
    let marker: Double?

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topLeading) {
                Capsule().fill(Color.primary.opacity(0.18)).frame(height: 7)
                Capsule().fill(accent).frame(width: max(geometry.size.width * fraction, 7), height: 7).widgetAccentable()
                if let marker = marker {
                    Caret()
                        .fill(Color.primary.opacity(0.9))
                        .frame(width: 8, height: 5)
                        .offset(x: geometry.size.width * marker - 4, y: 9)
                }
            }
        }
        .frame(height: 14)
    }
}

struct Caret: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: rect.midX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
            path.closeSubpath()
        }
    }
}

/// Shown when there's no data yet, or the month has changed since the app last ran.
struct OpenAppPrompt: View {
    let text: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "arrow.clockwise.circle").font(.title3).widgetAccentable()
            Text(text).font(.footnote).foregroundColor(mutedText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private func openAppText(_ snapshot: WidgetSnapshot?) -> String {
    snapshot.map { WidgetFormat(snapshot: $0).text("openApp", "Open Budget to update") } ?? "Open Budget to load your data"
}

// MARK: - This month (home screen)

struct ThisMonthWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BudgetThisMonth", provider: SnapshotProvider()) { entry in
            ThisMonthView(entry: entry)
                .homeWidgetBackground()
                .widgetURL(DeepLink.open(path: "/dashboard"))
        }
        .configurationDisplayName("This month")
        .description("Spending vs your usual month, and cash flow.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ThisMonthView: View {
    let entry: SnapshotEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        if let snapshot = entry.snapshot, MonthModel(snapshot: snapshot, date: entry.date).isCurrent {
            let model = MonthModel(snapshot: snapshot, date: entry.date)
            let format = WidgetFormat(snapshot: snapshot)
            HStack(alignment: .top, spacing: 14) {
                spentColumn(model, format)
                if family == .systemMedium {
                    Divider().overlay(Color.white.opacity(0.12))
                    cashFlowColumn(model, format)
                }
            }
            .overlay(alignment: .bottomLeading) {
                Text(format.text("asOf", "as of {time}", ["time": format.time(snapshot.generatedAt)]))
                    .font(.system(size: 9.5)).foregroundColor(mutedText.opacity(0.7))
            }
        } else {
            OpenAppPrompt(text: openAppText(entry.snapshot))
        }
    }

    private func spentColumn(_ model: MonthModel, _ format: WidgetFormat) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Caption(text: "\(format.monthName(model)) · \(format.text("spent", "SPENT").uppercased(with: format.locale))")
            BigAmount(text: format.money(model.spent))
            if let fraction = model.barFraction {
                ProgressBar(fraction: fraction, marker: model.usualMarker).padding(.top, 3)
            }
            if let vsUsual = model.vsUsual {
                (Text(format.percent(vsUsual, signed: true)).foregroundColor(vsUsual > 0 ? overColor : underColor)
                    + Text(" " + format.text("vsUsual", "vs usual")))
                    .font(.caption2).lineLimit(1)
            }
            Text(format.text("daysLeft", "{count} days left", ["count": "\(model.daysLeft)"]))
                .font(.caption2).foregroundColor(mutedText)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func cashFlowColumn(_ model: MonthModel, _ format: WidgetFormat) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Caption(text: format.text("cashFlow", "Cash flow").uppercased(with: format.locale))
            BigAmount(text: format.money(model.cashFlow))
            if let share = model.cashFlowShare {
                Text(format.text("ofIncome", "{rate} of income", ["rate": format.percent(share)]))
                    .font(.caption2).foregroundColor(mutedText).padding(.top, 6)
            }
            Text("≈ " + format.text("perDay", "{amount}/day", ["amount": format.money(model.perDay)]))
                .font(.caption2.weight(.semibold))
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Upcoming payments (home screen)

struct UpcomingWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BudgetUpcoming", provider: SnapshotProvider()) { entry in
            UpcomingView(entry: entry)
                .homeWidgetBackground()
                .widgetURL(DeepLink.open(path: "/dashboard/recurring"))
        }
        .configurationDisplayName("Upcoming payments")
        .description("Your next recurring payments.")
        .supportedFamilies([.systemMedium])
    }
}

struct UpcomingView: View {
    let entry: SnapshotEntry

    var body: some View {
        if let snapshot = entry.snapshot {
            let format = WidgetFormat(snapshot: snapshot)
            let payments = format.upcoming(from: entry.date, limit: 3)
            VStack(alignment: .leading, spacing: 6) {
                Caption(text: format.text("upcoming", "Upcoming payments").uppercased(with: format.locale))
                if payments.isEmpty {
                    Text(format.text("noUpcoming", "Nothing due soon")).font(.footnote).foregroundColor(mutedText)
                }
                ForEach(Array(payments.enumerated()), id: \.offset) { _, payment in
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(payment.name).font(.footnote.weight(.semibold)).lineLimit(1)
                            Text(format.dueDate(payment.date, now: entry.date)
                                 + (payment.autoPost ? " · " + format.text("autoPost", "auto-post") : ""))
                                .font(.caption2).foregroundColor(mutedText).lineLimit(1)
                        }
                        Spacer()
                        Text(format.money(payment.amount, currency: payment.currency))
                            .font(.footnote.weight(.semibold)).widgetAccentable()
                    }
                }
                Spacer(minLength: 0)
            }
        } else {
            OpenAppPrompt(text: openAppText(nil))
        }
    }
}

// MARK: - Pace (home screen)

struct PaceWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BudgetPace", provider: SnapshotProvider()) { entry in
            PaceView(entry: entry)
                .homeWidgetBackground()
                .widgetURL(DeepLink.open(path: "/dashboard/analytics/monthly"))
        }
        .configurationDisplayName("Pace")
        .description("This month's spending vs your six-month average.")
        .supportedFamilies([.systemMedium])
    }
}

struct PaceView: View {
    let entry: SnapshotEntry

    var body: some View {
        if let snapshot = entry.snapshot, MonthModel(snapshot: snapshot, date: entry.date).isCurrent {
            let model = MonthModel(snapshot: snapshot, date: entry.date)
            let format = WidgetFormat(snapshot: snapshot)
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Caption(text: "\(format.text("pace", "Pace").uppercased(with: format.locale)) · \(format.monthName(model))")
                    Spacer()
                    if let difference = model.paceDifference {
                        Text(format.text(difference > 0 ? "aboveUsual" : "belowUsual",
                                         difference > 0 ? "{amount} above usual" : "{amount} below usual",
                                         ["amount": format.money(abs(difference))]))
                            .font(.caption2.weight(.semibold))
                            .foregroundColor(difference > 0 ? overColor : underColor)
                            .lineLimit(1)
                    }
                }
                PaceChart(current: snapshot.month.cumulative,
                          usual: snapshot.month.usualCumulative,
                          days: model.daysInMonth)
                HStack(spacing: 12) {
                    Label(format.text("thisMonth", "this month"), systemImage: "line.diagonal").foregroundColor(accent)
                    Label(format.text("sixMonthAverage", "6-month average"), systemImage: "line.diagonal").foregroundColor(mutedText)
                }
                .font(.caption2)
                .labelStyle(.titleAndIcon)
            }
        } else {
            OpenAppPrompt(text: openAppText(entry.snapshot))
        }
    }
}

struct PaceChart: View {
    let current: [Double]
    let usual: [Double]
    let days: Int

    var body: some View {
        GeometryReader { geometry in
            let maximum = max(current.max() ?? 0, usual.max() ?? 0, 1)
            let size = geometry.size
            ZStack {
                line(usual, maximum: maximum, size: size)
                    .stroke(mutedText, style: StrokeStyle(lineWidth: 1.6, dash: [4, 4]))
                line(current, maximum: maximum, size: size)
                    .stroke(accent, style: StrokeStyle(lineWidth: 2.4, lineCap: .round, lineJoin: .round))
                    .widgetAccentable()
            }
        }
    }

    private func line(_ values: [Double], maximum: Double, size: CGSize) -> Path {
        Path { path in
            guard values.count > 1 else { return }
            let step = size.width / CGFloat(max(days - 1, 1))
            for (index, value) in values.enumerated() {
                let point = CGPoint(x: CGFloat(index) * step,
                                    y: size.height - CGFloat(value / maximum) * (size.height - 2) - 1)
                if index == 0 { path.move(to: point) } else { path.addLine(to: point) }
            }
        }
    }
}

// MARK: - Lock screen
// Amounts are `privacySensitive`: iOS blanks them while the phone is locked and shows them once
// Face ID recognises the owner. Percentages stay visible. Privacy mode doesn't apply here.

struct NextPaymentWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BudgetNextPayment", provider: SnapshotProvider()) { entry in
            NextPaymentView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
                .widgetURL(DeepLink.open(path: "/dashboard/recurring"))
        }
        .configurationDisplayName("Next payment")
        .description("Your next recurring payment.")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct NextPaymentView: View {
    let entry: SnapshotEntry

    var body: some View {
        if let snapshot = entry.snapshot {
            let format = WidgetFormat(snapshot: snapshot)
            VStack(alignment: .leading, spacing: 1) {
                Text(format.text("nextPayment", "Next payment").uppercased(with: format.locale))
                    .font(.system(size: 11, weight: .semibold)).opacity(0.8)
                if let payment = format.upcoming(from: entry.date, limit: 1).first {
                    Text("\(payment.name) · \(format.dueDate(payment.date, now: entry.date).lowercased(with: format.locale))")
                        .font(.headline).lineLimit(1).widgetAccentable()
                    Text(format.money(payment.amount, currency: payment.currency, hideable: false))
                        .font(.subheadline).privacySensitive()
                } else {
                    Text(format.text("noUpcoming", "Nothing due soon")).font(.subheadline)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            Text("Budget").font(.headline)
        }
    }
}

struct PerDayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BudgetPerDay", provider: SnapshotProvider()) { entry in
            PerDayView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
                .widgetURL(DeepLink.open(path: "/dashboard"))
        }
        .configurationDisplayName("Per day")
        .description("What you can spend per day without cash flow going below zero.")
        .supportedFamilies([.accessoryCircular])
    }
}

struct PerDayView: View {
    let entry: SnapshotEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            if let snapshot = entry.snapshot, MonthModel(snapshot: snapshot, date: entry.date).isCurrent {
                let model = MonthModel(snapshot: snapshot, date: entry.date)
                let format = WidgetFormat(snapshot: snapshot)
                VStack(spacing: 0) {
                    Text(format.number(model.perDay))
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .minimumScaleFactor(0.5).lineLimit(1)
                        .privacySensitive()
                        .widgetAccentable()
                    Text(format.text("perDayShort", "/day")).font(.system(size: 10)).opacity(0.8)
                }
                .padding(4)
            } else {
                Image(systemName: "arrow.clockwise")
            }
        }
    }
}

struct CashFlowWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "BudgetCashFlow", provider: SnapshotProvider()) { entry in
            CashFlowView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
                .widgetURL(DeepLink.open(path: "/dashboard"))
        }
        .configurationDisplayName("Cash flow")
        .description("This month's cash flow as a share of income.")
        .supportedFamilies([.accessoryCircular])
    }
}

struct CashFlowView: View {
    let entry: SnapshotEntry

    var body: some View {
        if let snapshot = entry.snapshot, MonthModel(snapshot: snapshot, date: entry.date).isCurrent,
           let share = MonthModel(snapshot: snapshot, date: entry.date).cashFlowShare {
            let format = WidgetFormat(snapshot: snapshot)
            Gauge(value: min(max(share, 0), 1)) {
                Text(format.text("cashFlowShort", "CF"))
            } currentValueLabel: {
                Text(format.percent(share)).minimumScaleFactor(0.5)
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .widgetAccentable()
        } else {
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "arrow.clockwise")
            }
        }
    }
}

// MARK: - Controls (iOS 18: lock-screen corners, Control Center, Action Button)

@available(iOS 18.0, *)
struct OpenAddTransactionIntent: AppIntent {
    static let title: LocalizedStringResource = "Add transaction"

    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(DeepLink.addTransaction))
    }
}

@available(iOS 18.0, *)
struct OpenScreenshotImportIntent: AppIntent {
    static let title: LocalizedStringResource = "Import screenshot"

    func perform() async throws -> some IntentResult & OpensIntent {
        .result(opensIntent: OpenURLIntent(DeepLink.importScreenshot))
    }
}

@available(iOS 18.0, *)
struct AddTransactionControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.ondrejkutil.budget.control.add") {
            ControlWidgetButton(action: OpenAddTransactionIntent()) {
                Label("Add transaction", systemImage: "plus")
            }
        }
        .displayName("Add transaction")
        .description("Opens Budget's Add transaction dialog.")
    }
}

@available(iOS 18.0, *)
struct ImportScreenshotControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.ondrejkutil.budget.control.import") {
            ControlWidgetButton(action: OpenScreenshotImportIntent()) {
                Label("Import screenshot", systemImage: "text.viewfinder")
            }
        }
        .displayName("Import screenshot")
        .description("Opens Budget's screenshot import.")
    }
}

// MARK: - Sample data (widget gallery)

extension WidgetSnapshot {
    static var sample: WidgetSnapshot {
        let now = Date()
        let calendar = Calendar.current
        let parts = calendar.dateComponents([.year, .month, .day], from: now)
        let day = parts.day ?? 15
        let days = calendar.range(of: .day, in: .month, for: now)?.count ?? 30
        let usualCumulative = (1...days).map { Double($0) * 580 }
        let cumulative = (1...day).map { Double($0) * 610 }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let tomorrow = formatter.string(from: calendar.date(byAdding: .day, value: 1, to: now)!)
        let later = formatter.string(from: calendar.date(byAdding: .day, value: 4, to: now)!)
        return WidgetSnapshot(
            version: 1, generatedAt: now, locale: Locale.current.identifier, currency: "CZK", privacyMode: false,
            month: .init(year: parts.year ?? 2026, month: parts.month ?? 1, spent: cumulative.last ?? 0,
                         income: 38_000, cashFlow: 5_400, usualSpent: usualCumulative.last,
                         cumulative: cumulative, usualCumulative: usualCumulative),
            upcoming: [
                .init(name: "Rent", amount: -7_200, currency: "CZK", date: tomorrow, autoPost: true),
                .init(name: "Spotify", amount: -199, currency: "CZK", date: later, autoPost: false),
            ],
            labels: [:]
        )
    }
}
