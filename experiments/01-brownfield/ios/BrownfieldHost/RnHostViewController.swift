import UIKit

/// 진입점 1: 화면 전체를 RN 이 그리는 경우. 안드로이드의 RnHostActivity 와 짝입니다.
///
/// RCTRootView 는 그냥 UIView 라서, 네이티브 네비게이션 스택 위에 평범한 화면 하나로 올라갑니다.
/// 브라운필드에서 네비게이션을 누가 관리하느냐를 정할 때 이 점이 중요합니다.
/// 여기서는 네이티브(UINavigationController)가 스택을 계속 쥐고 있고,
/// RN 은 화면 한 장짜리로만 씁니다. RN 안에 별도 네비게이션 라이브러리를 넣으면
/// 뒤로가기 제스처와 스택 두 개가 겹쳐서 다루기 까다로워집니다.
final class RnHostViewController: UIViewController {

    /// index.js 의 AppRegistry.registerComponent 이름과 반드시 같아야 합니다.
    enum Module {
        static let productDetail = "RNProductDetail"
        static let settings = "RNSettings"
    }

    private let moduleName: String
    private let initialProperties: [String: Any]

    init(moduleName: String, initialProperties: [String: Any] = [:]) {
        self.moduleName = moduleName
        self.initialProperties = initialProperties
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("스토리보드로 만들지 않습니다.")
    }

    override func loadView() {
        // 여기서 ReactNativeManager.shared.bridge 에 처음 접근하면 그때 브리지가 만들어집니다.
        // preloadOnLaunch = false 일 때 첫 진입이 느린 이유가 이 한 줄입니다.
        view = RCTRootView(
            bridge: ReactNativeManager.shared.bridge,
            moduleName: moduleName,
            initialProperties: initialProperties
        )
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        navigationItem.title = moduleName
        // HostBridge 의 closeScreen / finishWithResult 가 닫을 대상을 등록합니다.
        RnScreenPresenter.shared.presentedController = self
    }
}
