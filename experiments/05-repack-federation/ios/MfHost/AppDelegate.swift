import UIKit

/// 호스트 셸을 전체 화면으로 띄우는 최소 구성입니다.
///
/// 01 번의 RCTRootView 방식과 같습니다. 다른 점은 번들이 Metro 가 아니라
/// Re.Pack(Rspack) 산출물이라는 것, 그리고 화면 일부(장바구니, 프로필)가
/// 앱에 없고 런타임에 로컬 서버에서 내려온다는 것입니다.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = HostViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}
