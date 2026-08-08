import UIKit

/// 손으로 눌러 볼 수 있는 앱이자, 스크립트로 자동 측정을 돌리는 진입점입니다.
///
/// Android 는 Intent extras 로 조건을 받았습니다. iOS 는 launch arguments 를 씁니다.
///
///   xcrun simctl launch --console-pty <udid> com.example.bench -auto webview -warm 0
///
/// `-key value` 형태로 넘기면 UserDefaults 가 그대로 읽어 줍니다.
/// 시뮬레이터 창을 GUI 로 자동화하지 않아도 반복 측정이 됩니다.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let root = MainViewController()
        let nav = UINavigationController(rootViewController: root)
        BenchCoordinator.shared.navigationController = nav

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = nav
        window.makeKeyAndVisible()
        self.window = window

        return true
    }
}
