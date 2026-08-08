import UIKit

/// RN 화면이 네이티브에 요청하는 동작(닫기, 결과 반환)의 착지점.
///
/// 네이티브 모듈(HostBridge)이 UIViewController 를 직접 아는 순간
/// "지금 화면에 떠 있는 게 어느 컨트롤러인가"를 모듈이 추적해야 합니다.
/// 그 책임을 여기로 빼서, 모듈은 의도만 전달하고 화면 전환은 이쪽이 처리합니다.
final class RnScreenPresenter {

    struct Result {
        let productId: String
        let action: String
    }

    static let shared = RnScreenPresenter()

    /// 지금 떠 있는 RN 화면. 닫힐 때 자동으로 nil 이 되도록 weak 로 잡습니다.
    weak var presentedController: UIViewController?

    /// 결과를 받을 네이티브 화면이 등록해 둡니다.
    var resultHandler: ((Result) -> Void)?

    private init() {}

    func close() {
        DispatchQueue.main.async { [weak self] in
            guard let controller = self?.presentedController else { return }
            if let navigation = controller.navigationController,
               navigation.viewControllers.count > 1 {
                navigation.popViewController(animated: true)
            } else {
                controller.dismiss(animated: true)
            }
        }
    }

    func finish(with result: Result) {
        DispatchQueue.main.async { [weak self] in
            self?.resultHandler?(result)
            self?.close()
        }
    }
}

extension Notification.Name {
    /// 네이티브 → RN 단방향 이벤트를 HostBridge 로 흘려보내는 통로.
    /// 네이티브 화면이 HostBridge 인스턴스를 직접 붙잡지 않아도 되게 합니다.
    static let hostThemeChanged = Notification.Name("com.example.brownfield.hostThemeChanged")
}
