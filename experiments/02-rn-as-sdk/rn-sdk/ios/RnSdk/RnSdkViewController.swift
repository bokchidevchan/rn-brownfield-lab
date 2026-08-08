// React 는 SDK 내부 구현에만 씁니다. 공개 API 는 UIKit/Foundation 타입만 노출합니다.
// 일반 import 로 두면 BUILD_LIBRARY_FOR_DISTRIBUTION 이 만드는 .swiftinterface 에
// `import React` 가 그대로 실려 나가고, React 모듈이 없는 소비 앱에서
// "no such module 'React'" 로 빌드가 깨집니다.
@_implementationOnly import React
import UIKit

/// 전체 화면 RN 진입점. 소비 앱은 이 타입을 모르고 `UIViewController` 로만 받습니다.
final class RnSdkViewController: UIViewController {

    private let moduleName: String
    private let initialProperties: [String: Any]

    init(moduleName: String, initialProperties: [String: Any]) {
        self.moduleName = moduleName
        self.initialProperties = initialProperties
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("스토리보드로 만들지 않습니다.")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white

        let rootView = RCTRootView(
            bridge: SdkReactHost.shared.bridge,
            moduleName: moduleName,
            initialProperties: initialProperties
        )

        // 01 번에서 배운 것. view 에 그대로 대입하면 상태바와 네비게이션 바를 침범합니다.
        // safe area 를 네이티브가 책임지고 RN 은 안쪽만 그리게 제약을 겁니다.
        rootView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(rootView)
        NSLayoutConstraint.activate([
            rootView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            rootView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            rootView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            rootView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        SdkScreenCoordinator.shared.presentedController = self
    }
}

/// RN 화면이 닫기와 결과 반환을 요청할 때의 착지점.
final class SdkScreenCoordinator {

    static let shared = SdkScreenCoordinator()

    weak var presentedController: UIViewController?

    private init() {}

    func close() {
        DispatchQueue.main.async { [weak self] in
            guard let controller = self?.presentedController else { return }
            if let nav = controller.navigationController, nav.viewControllers.count > 1 {
                nav.popViewController(animated: true)
            } else {
                controller.dismiss(animated: true)
            }
        }
    }

    func finish(with result: RnSdk.CartResult) {
        DispatchQueue.main.async {
            SdkReactHost.shared.resultListener?(result)
            self.close()
        }
    }
}
