import UIKit

final class MainViewController: UIViewController {

    private lazy var statusLabel = makeLabel(13, UIColor(white: 0.42, alpha: 1))
    private lazy var resultLabel = makeLabel(14, .black)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        navigationItem.title = "웹뷰 vs RN"
        resultLabel.text = "화면에서 돌아온 결과가 여기 표시됩니다."

        BenchCoordinator.shared.onResult = { [weak self] productId, action in
            self?.resultLabel.text = "결과: \(action) (\(productId))"
            self?.updateStatus()
        }

        let stack = UIStackView(arrangedSubviews: [
            statusLabel,
            makeButton("웹뷰 프리워밍", #selector(warmWeb)),
            makeButton("RN 인스턴스 미리 생성", #selector(warmRn)),
            makeButton("웹뷰로 상품 상세 열기", #selector(openWeb)),
            makeButton("RN 으로 상품 상세 열기", #selector(openRn)),
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

        updateStatus()
        handleAuto()
    }

    // MARK: - 자동 측정

    private func handleAuto() {
        let defaults = UserDefaults.standard
        guard let target = defaults.string(forKey: "auto") else { return }
        let warm = defaults.bool(forKey: "warm")

        guard warm else {
            // 앱이 자리를 잡을 시간만 줍니다. 그 전에 누르면 앱 시작 비용이 섞입니다.
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { self.launch(target) }
            return
        }

        switch target {
        case "webview": WebViewWarmer.warmUp()
        case "rn": ReactNativeManager.shared.preload()
        default: break
        }

        // Android 쪽은 준비 상태를 폴링했습니다. iOS 는 두 런타임 모두 생성이 동기라
        // 여기 도달한 시점에 이미 준비돼 있습니다. 한 박자만 두고 누릅니다.
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { self.launch(target) }
    }

    private func launch(_ target: String) {
        switch target {
        case "webview": openWeb()
        case "rn": openRn()
        default: break
        }
    }

    // MARK: - 화면 전환

    @objc private func openWeb() {
        // 이 한 줄이 측정의 시작점입니다.
        Bench.start(WebViewWarmer.isWarmed ? "webview_warm" : "webview_cold")
        navigationController?.pushViewController(
            WebViewController(productId: "SKU-1024"), animated: true)
    }

    @objc private func openRn() {
        Bench.start(ReactNativeManager.shared.isCreated ? "rn_warm" : "rn_cold")
        navigationController?.pushViewController(
            RnViewController(productId: "SKU-1024"), animated: true)
    }

    @objc private func warmWeb() {
        WebViewWarmer.warmUp()
        updateStatus()
    }

    @objc private func warmRn() {
        ReactNativeManager.shared.preload()
        updateStatus()
    }

    private func updateStatus() {
        statusLabel.text = "웹뷰 런타임: \(WebViewWarmer.isWarmed ? "준비됨" : "없음")"
            + " / RN 인스턴스: \(ReactNativeManager.shared.isCreated ? "준비됨" : "없음")"
    }

    private func makeLabel(_ size: CGFloat, _ color: UIColor) -> UILabel {
        let label = UILabel()
        label.font = .systemFont(ofSize: size)
        label.textColor = color
        label.numberOfLines = 0
        return label
    }

    private func makeButton(_ title: String, _ selector: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        button.contentHorizontalAlignment = .leading
        button.addTarget(self, action: selector, for: .touchUpInside)
        return button
    }
}
