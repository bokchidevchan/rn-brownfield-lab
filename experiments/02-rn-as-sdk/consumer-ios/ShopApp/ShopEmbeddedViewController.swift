import RnSdkKit
import UIKit

/// 네이티브 화면 안에 SDK 뷰를 부분 삽입합니다.
///
/// SDK 가 돌려주는 타입이 `UIView` 라 이 파일에 RN 타입이 없습니다.
/// 01 번에서는 `RCTRootView(bridge:moduleName:initialProperties:)` 를 앱이 직접 만들었습니다.
final class ShopEmbeddedViewController: UIViewController {

    private static let themes = ["light", "dark", "sepia"]
    private var themeIndex = 0

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        navigationItem.title = "부분 삽입"

        let header = UILabel()
        header.text = "네이티브 헤더 (소비 앱 코드)"
        header.textColor = .white
        header.textAlignment = .center
        header.font = .boldSystemFont(ofSize: 16)
        header.backgroundColor = UIColor(white: 0.07, alpha: 1)

        let themeButton = UIButton(type: .system)
        themeButton.setTitle("테마 바꾸기 (SDK 로 알림)", for: .normal)
        themeButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        themeButton.backgroundColor = UIColor(white: 0.96, alpha: 1)
        themeButton.addTarget(self, action: #selector(changeTheme), for: .touchUpInside)

        let footer = UILabel()
        footer.text = "가운데는 SDK 가 돌려준 UIView 입니다. 소비 앱은 addSubview 만 했습니다."
        footer.font = .systemFont(ofSize: 12)
        footer.textColor = UIColor(white: 0.42, alpha: 1)
        footer.textAlignment = .center
        footer.numberOfLines = 0
        footer.backgroundColor = UIColor(white: 0.96, alpha: 1)

        let stack = UIStackView(arrangedSubviews: [
            header,
            RnSdk.makeSettingsView(userTier: "PRO"),
            themeButton,
            footer,
        ])
        stack.axis = .vertical
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            header.heightAnchor.constraint(equalToConstant: 48),
            themeButton.heightAnchor.constraint(equalToConstant: 44),
            footer.heightAnchor.constraint(equalToConstant: 56),
        ])
    }

    @objc private func changeTheme() {
        themeIndex = (themeIndex + 1) % Self.themes.count
        RnSdk.notifyThemeChanged(Self.themes[themeIndex])
    }
}
