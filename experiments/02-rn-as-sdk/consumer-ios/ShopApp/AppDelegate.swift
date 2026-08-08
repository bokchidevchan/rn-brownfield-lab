import RnSdkKit
import UIKit

/// 01 번의 AppDelegate 와 비교해 보세요.
///
/// 01 번은 ReactNativeManager 를 직접 만들고 RCTBridgeDelegate 를 구현했습니다.
/// 여기서는 `import RnSdk` 한 줄과 initialize 호출이 전부입니다.
/// `import React` 도 `RCTBridge` 도 이 앱 코드에 없습니다.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let version = Bundle.main
            .object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"

        RnSdk.initialize(
            RnSdk.Config(
                appName: "소비 앱 (쇼핑)",
                appVersion: version,
                useDeveloperSupport: false,
                preloadOnInit: false
            )
        )

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = UINavigationController(
            rootViewController: ShopViewController()
        )
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}
