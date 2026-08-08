import UIKit

/// 기존 앱의 AppDelegate 를 흉내 낸 것입니다.
///
/// 그린필드 RN 앱은 여기서 `RCTAppDelegate` 를 상속하고 rootViewController 를 RN 으로 채웁니다.
/// 브라운필드는 반대입니다. 앱의 루트는 계속 네이티브고, RN 은 필요할 때 push/present 됩니다.
/// AppDelegate 가 RN 에 대해 아는 건 "미리 만들어 둘지" 한 줄뿐입니다.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // preloadOnLaunch 가 false 면 아무 일도 하지 않습니다.
        // true 로 바꾸면 여기서 브리지를 만들고, 그만큼 앱 시작이 느려집니다.
        ReactNativeManager.shared.preloadIfNeeded()

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = UINavigationController(
            rootViewController: MainViewController()
        )
        window.makeKeyAndVisible()
        self.window = window

        return true
    }
}
