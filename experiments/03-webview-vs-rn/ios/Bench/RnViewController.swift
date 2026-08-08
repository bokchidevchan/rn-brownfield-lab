import UIKit

/// RN 으로 상품 상세를 띄웁니다. WebViewController 와 나란히 놓고 보세요.
/// 통신 계층이 통째로 없습니다.
final class RnViewController: UIViewController {

    private let productId: String

    init(productId: String) {
        self.productId = productId
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError() }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        navigationItem.title = "RN"

        let rootView = RCTRootView(
            bridge: ReactNativeManager.shared.bridge,
            moduleName: "BenchProductDetail",
            initialProperties: [
                "productId": productId,
                "entryPoint": "네이티브 목록",
            ]
        )

        // 01 번에서 배운 것. view 에 그대로 대입하면 safe area 를 침범합니다.
        // 웹뷰 쪽도 같은 제약을 걸어 뒀습니다. 조건을 맞춰야 비교가 됩니다.
        rootView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(rootView)
        NSLayoutConstraint.activate([
            rootView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            rootView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            rootView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            rootView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
    }
}

/// RN 화면과 웹뷰 화면이 공통으로 쓰는 착지점.
final class BenchCoordinator {

    static let shared = BenchCoordinator()

    weak var navigationController: UINavigationController?
    var onResult: ((String, String) -> Void)?

    private init() {}

    func finish(productId: String, action: String) {
        DispatchQueue.main.async {
            self.onResult?(productId, action)
            self.navigationController?.popViewController(animated: true)
        }
    }
}
