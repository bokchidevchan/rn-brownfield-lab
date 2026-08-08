import UIKit

/// 호스트 앱의 네이티브 화면. 안드로이드의 MainActivity 와 짝입니다.
final class MainViewController: UIViewController {

    private static let themes = ["light", "dark", "sepia"]
    private var themeIndex = 0

    private lazy var resultLabel: UILabel = {
        let label = UILabel()
        label.text = "RN 화면에서 돌아온 결과가 여기 표시됩니다."
        label.font = .systemFont(ofSize: 14)
        label.numberOfLines = 0
        return label
    }()

    private lazy var preloadLabel: UILabel = {
        let label = UILabel()
        label.text = "RN 인스턴스 미리 생성: \(ReactNativeManager.preloadOnLaunch)"
        label.font = .systemFont(ofSize: 13)
        label.textColor = UIColor(white: 0.42, alpha: 1)
        return label
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        navigationItem.title = "브라운필드 호스트"

        // RN 화면이 finishWithResult 를 부르면 여기로 들어옵니다.
        RnScreenPresenter.shared.resultHandler = { [weak self] result in
            self?.resultLabel.text = "RN 결과: \(result.action) (\(result.productId))"
        }

        let stack = UIStackView(arrangedSubviews: [
            makeBadgeLabel(),
            preloadLabel,
            makeButton("RN 상품 상세 열기 (전체 화면, 결과 받기)", #selector(openProductDetail)),
            makeButton("RN 설정 열기 (같은 브리지 재사용)", #selector(openSettings)),
            makeButton("네이티브 화면 안에 RN 부분 삽입", #selector(openEmbedded)),
            makeButton("테마 바꾸기 (네이티브 → RN 이벤트)", #selector(changeTheme)),
            resultLabel,
        ])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
        ])
    }

    @objc private func openProductDetail() {
        let initialProperties: [String: Any] = [
            "productId": "SKU-1024",
            "entryPoint": "네이티브 목록 → 상세",
            // JS 에서 "네이티브 호출 → 첫 렌더" 를 재기 위한 값입니다.
            "launchedAtMs": Date().timeIntervalSince1970 * 1000,
        ]
        push(RnHostViewController(
            moduleName: RnHostViewController.Module.productDetail,
            initialProperties: initialProperties
        ))
    }

    @objc private func openSettings() {
        push(RnHostViewController(
            moduleName: RnHostViewController.Module.settings,
            initialProperties: ["userTier": "PRO"]
        ))
    }

    @objc private func openEmbedded() {
        push(EmbeddedRnViewController())
    }

    @objc private func changeTheme() {
        themeIndex = (themeIndex + 1) % Self.themes.count
        let theme = Self.themes[themeIndex]

        // 브리지가 아직 없으면 이벤트를 받을 JS 가 없습니다.
        // 안드로이드의 currentReactContext == null 과 같은 상황입니다.
        guard ReactNativeManager.shared.isBridgeCreated else {
            resultLabel.text = "RN 브리지가 아직 없어서 '\(theme)' 이벤트는 버려졌습니다."
            return
        }

        NotificationCenter.default.post(
            name: .hostThemeChanged,
            object: nil,
            userInfo: ["theme": theme]
        )
        resultLabel.text = "테마 이벤트 전송: \(theme)"
            + " — 받을 RN 화면이 떠 있지 않아 아무 일도 일어나지 않습니다."
            + " 부분 삽입 화면에서 눌러 보세요."
    }

    private func push(_ controller: UIViewController) {
        navigationController?.pushViewController(controller, animated: true)
    }

    private func makeBadgeLabel() -> UILabel {
        let label = UILabel()
        label.text = "NATIVE (Swift)"
        label.font = .boldSystemFont(ofSize: 12)
        label.textColor = UIColor(white: 0.42, alpha: 1)
        return label
    }

    private func makeButton(_ title: String, _ selector: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        button.titleLabel?.numberOfLines = 0
        button.contentHorizontalAlignment = .leading
        button.addTarget(self, action: selector, for: .touchUpInside)
        return button
    }
}
