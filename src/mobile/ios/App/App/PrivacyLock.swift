import LocalAuthentication
import UIKit

/// Face ID (or passcode) lock plus a privacy cover.
///
/// - The cover goes up whenever the app stops being active, so the app switcher never shows
///   amounts.
/// - Face ID is asked on a cold start and when returning after `AppSettings.lockTimeout` in the
///   background. Cancelling keeps the app covered with an Unlock button (no prompt loop).
/// - The Face ID sheet itself makes the scene inactive; `authenticating` keeps that from
///   re-triggering the lock.
final class PrivacyLock {
    private weak var host: UIViewController?
    private let cover = LockCoverView()
    private var needsUnlock: Bool
    private var authenticating = false
    /// Set after a cancelled/failed prompt: wait for the Unlock button instead of re-prompting.
    private var waitingForButton = false
    private var backgroundedAt: Date?

    init(host: UIViewController) {
        self.host = host
        needsUnlock = AppSettings.shared.lockEnabled
        cover.onUnlock = { [weak self] in self?.authenticate() }

        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(sceneWillDeactivate),
                           name: UIScene.willDeactivateNotification, object: nil)
        center.addObserver(self, selector: #selector(sceneDidEnterBackground),
                           name: UIScene.didEnterBackgroundNotification, object: nil)
        center.addObserver(self, selector: #selector(sceneDidActivate),
                           name: UIScene.didActivateNotification, object: nil)

        if needsUnlock { showCover(locked: true) }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    /// Called from the view controller once it is on screen, in case the scene was already
    /// active before this object started observing.
    func viewDidAppear() {
        if needsUnlock, !waitingForButton, UIApplication.shared.applicationState == .active {
            authenticate()
        }
    }

    // MARK: - Scene lifecycle

    @objc private func sceneWillDeactivate() {
        guard !authenticating else { return }
        showCover(locked: needsUnlock)
    }

    @objc private func sceneDidEnterBackground() {
        guard !authenticating else { return }
        if backgroundedAt == nil { backgroundedAt = Date() }
        waitingForButton = false
        showCover(locked: needsUnlock)
    }

    @objc private func sceneDidActivate() {
        guard !authenticating else { return }
        let settings = AppSettings.shared
        if settings.lockEnabled, let since = backgroundedAt,
           Date().timeIntervalSince(since) >= settings.lockTimeout {
            needsUnlock = true
        }
        backgroundedAt = nil

        guard settings.lockEnabled, needsUnlock else {
            needsUnlock = false
            hideCover()
            return
        }
        showCover(locked: true)
        if !waitingForButton { authenticate() }
    }

    // MARK: - Authentication

    func authenticate() {
        guard !authenticating else { return }
        runOwnerCheck(reason: LockCoverView.text.unlockReason) { [weak self] success in
            guard let self = self else { return }
            if success {
                self.needsUnlock = false
                self.waitingForButton = false
                self.hideCover()
            } else {
                self.waitingForButton = true
                self.showCover(locked: true)
            }
        }
    }

    /// Asks for Face ID / passcode without touching the lock state (e.g. before the lock is
    /// switched off). Calls back on the main thread. A device without a passcode passes, since
    /// there is nothing to check against.
    func runOwnerCheck(reason: String, completion: @escaping (Bool) -> Void) {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            completion(true)
            return
        }
        authenticating = true
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, _ in
            DispatchQueue.main.async {
                self.authenticating = false
                completion(success)
            }
        }
    }

    static func biometryName() -> String {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        switch context.biometryType {
        case .faceID: return "faceID"
        case .touchID: return "touchID"
        default: return "none"
        }
    }

    // MARK: - Cover

    private func showCover(locked: Bool) {
        guard let container = host?.view else { return }
        cover.setLocked(locked)
        if cover.superview !== container {
            cover.frame = container.bounds
            cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            container.addSubview(cover)
        }
        container.bringSubviewToFront(cover)
        cover.alpha = 1
    }

    private func hideCover() {
        guard cover.superview != nil else { return }
        UIView.animate(withDuration: 0.2, animations: { self.cover.alpha = 0 }, completion: { _ in
            if self.cover.alpha == 0 { self.cover.removeFromSuperview() }
        })
    }
}

/// Blurred full-screen cover; when locked it shows a lock icon and an Unlock button.
final class LockCoverView: UIView {
    struct Text {
        let title: String
        let unlock: String
        let unlockReason: String
    }

    static let text: Text = {
        let czech = Locale.preferredLanguages.first?.hasPrefix("cs") ?? false
        return czech
            ? Text(title: "Budget je zamčený", unlock: "Odemknout", unlockReason: "Odemknout Budget")
            : Text(title: "Budget is locked", unlock: "Unlock", unlockReason: "Unlock Budget")
    }()

    var onUnlock: (() -> Void)?
    private let stack = UIStackView()

    override init(frame: CGRect) {
        super.init(frame: frame)

        backgroundColor = UIColor(red: 6 / 255, green: 13 / 255, blue: 16 / 255, alpha: 0.6)
        let blur = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterialDark))
        blur.frame = bounds
        blur.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(blur)

        let icon = UIImageView(image: UIImage(systemName: "lock.fill"))
        icon.tintColor = .white
        icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 34, weight: .semibold)

        let title = UILabel()
        title.text = Self.text.title
        title.textColor = .white
        title.font = .preferredFont(forTextStyle: .headline)

        var config = UIButton.Configuration.filled()
        config.title = Self.text.unlock
        config.cornerStyle = .capsule
        config.baseBackgroundColor = .white
        config.baseForegroundColor = UIColor(red: 6 / 255, green: 13 / 255, blue: 16 / 255, alpha: 1)
        config.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 28, bottom: 12, trailing: 28)
        let button = UIButton(configuration: config, primaryAction: UIAction { [weak self] _ in
            self?.onUnlock?()
        })

        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        [icon, title, button].forEach { stack.addArrangedSubview($0) }
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: centerYAnchor)
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not used")
    }

    func setLocked(_ locked: Bool) {
        stack.isHidden = !locked
    }
}
