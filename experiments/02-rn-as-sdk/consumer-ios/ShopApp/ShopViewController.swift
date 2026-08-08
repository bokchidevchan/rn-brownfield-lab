import RnSdkKit
import UIKit

/// 순수 네이티브 화면. RN 을 모릅니다.
final class ShopViewController: UIViewController {

    private static let themes = ["light", "dark", "sepia"]
    private var themeIndex = 0

    private lazy var statusLabel = makeLabel(size: 13, color: UIColor(white: 0.42, alpha: 1))
    private lazy var resultLabel = makeLabel(size: 14, color: .black)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        navigationItem.title = "소비 앱 (쇼핑)"

        resultLabel.text = "SDK 에서 돌아온 결과가 여기 표시됩니다."

        // 01 번의 RnScreenPresenter 대신 SDK 가 노출한 리스너 하나입니다.
        RnSdk.resultListener = { [weak self] result in
            self?.resultLabel.text = "SDK 결과: \(result.action) (\(result.productId))"
        }

        let stack = UIStackView(arrangedSubviews: [
            makeLabel(size: 12, color: UIColor(white: 0.42, alpha: 1), text: "NATIVE ONLY (RN 을 모르는 앱)"),
            statusLabel,
            makeButton("RN SDK 상품 상세 열기", #selector(openDetail)),
            makeButton("네이티브 화면 안에 SDK 뷰 삽입", #selector(openEmbedded)),
            makeButton("테마 바꾸기 (SDK 로 알림)", #selector(changeTheme)),
            makeButton("RN 인스턴스 해제 (releaseMemory)", #selector(releaseMemory)),
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

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        updateStatus()
    }

    @objc private func openDetail() {
        // SDK 가 UIViewController 를 돌려줍니다. 네비게이션은 소비 앱이 정합니다.
        let controller = RnSdk.productDetailViewController(productId: "SKU-1024")
        navigationController?.pushViewController(controller, animated: true)
    }

    @objc private func openEmbedded() {
        navigationController?.pushViewController(ShopEmbeddedViewController(), animated: true)
    }

    @objc private func changeTheme() {
        themeIndex = (themeIndex + 1) % Self.themes.count
        RnSdk.notifyThemeChanged(Self.themes[themeIndex])
        resultLabel.text = "테마 전달: \(Self.themes[themeIndex])"
            + " — 받을 SDK 화면이 떠 있어야 반영됩니다."
    }

    @objc private func releaseMemory() {
        RnSdk.releaseMemory()
        resultLabel.text = "RN 인스턴스를 해제했습니다. 다음 진입에서 다시 만들어집니다."
        updateStatus()
    }

    private func updateStatus() {
        statusLabel.text = "RN 인스턴스: \(RnSdk.isRunning ? "살아 있음" : "없음")"
    }

    private func makeLabel(size: CGFloat, color: UIColor, text: String? = nil) -> UILabel {
        let label = UILabel()
        label.font = .systemFont(ofSize: size, weight: size <= 12 ? .bold : .regular)
        label.textColor = color
        label.numberOfLines = 0
        label.text = text
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
