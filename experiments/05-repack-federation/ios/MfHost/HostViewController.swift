import UIKit

/// RCTRootView 로 호스트 셸을 붙입니다.
///
/// initialProperties 의 autoOpen 이 핵심입니다. 시뮬레이터에서 좌표 탭을
/// 자동화하는 대신, JS 쪽이 이 값을 보고 두 원격 피처를 시차를 두고 엽니다.
/// 검증 스크립트는 서버 요청 로그만 보면 됩니다.
final class HostViewController: UIViewController {

    private var bridge: RCTBridge?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        guard let bridge = RCTBridge(delegate: self, launchOptions: nil) else {
            fatalError("RCTBridge 생성 실패")
        }
        self.bridge = bridge

        let rootView = RCTRootView(
            bridge: bridge,
            moduleName: "HostApp",
            initialProperties: ["autoOpen": true]
        )
        rootView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(rootView)

        // safe area 를 침범하지 않습니다. 01 번에서 상태바 아래로 파고들어
        // 고친 뒤로 이 저장소의 규칙입니다.
        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            rootView.topAnchor.constraint(equalTo: safe.topAnchor),
            rootView.leadingAnchor.constraint(equalTo: safe.leadingAnchor),
            rootView.trailingAnchor.constraint(equalTo: safe.trailingAnchor),
            rootView.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
        ])
    }
}

extension HostViewController: RCTBridgeDelegate {

    func sourceURL(for bridge: RCTBridge!) -> URL! {
        // 호스트 번들은 앱에 내장합니다. 원격 피처만 네트워크에서 옵니다.
        guard let url = Bundle.main.url(forResource: "main", withExtension: "jsbundle") else {
            fatalError("main.jsbundle 이 없습니다. host 에서 npm run bundle:ios 후 ios/ 로 복사하세요.")
        }
        return url
    }
}
