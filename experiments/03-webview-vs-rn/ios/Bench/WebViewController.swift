import UIKit
import WebKit

/// 웹뷰로 상품 상세를 띄웁니다. Android 의 WebViewActivity 와 같은 일을 합니다.
///
/// RN 쪽 RnViewController 와 길이를 비교해 보세요.
/// 늘어난 부분이 전부 통신 계층입니다.
final class WebViewController: UIViewController {

    private var webView: WKWebView!

    // 에뮬레이터와 달리 iOS 시뮬레이터는 호스트와 네트워크를 공유해서 localhost 로 바로 붙습니다.
    // Android 는 10.0.2.2 라는 특수 주소를 써야 했습니다.
    static let baseURL = "http://localhost:3000/"

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
        navigationItem.title = "웹뷰"

        let config = WKWebViewConfiguration()
        // 프리워밍한 프로세스를 재사용합니다.
        config.processPool = WebViewWarmer.processPool

        // RN 의 네이티브 모듈에 해당하는 자리입니다.
        // RN 은 ReactPackage 에 넣으면 JS 에서 바로 보이는데,
        // 여기서는 이름을 문자열로 등록하고 JSON 을 직접 파싱해야 합니다.
        config.userContentController.add(self, name: "iosBridge")

        // 측정 조건을 통제합니다. 캐시를 켜면 두 번째 진입이 빨라지는데
        // 그건 웹뷰 최적화의 효과지 웹뷰 자체의 성능이 아닙니다.
        config.websiteDataStore = .nonPersistent()

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        var components = URLComponents(string: Self.baseURL)!
        components.queryItems = [
            URLQueryItem(name: "productId", value: productId),
            URLQueryItem(name: "entryPoint", value: "네이티브 목록"),
        ]
        webView.load(URLRequest(url: components.url!))
    }

    deinit {
        // 핸들러를 떼지 않으면 컨트롤러가 통째로 남습니다.
        webView?.configuration.userContentController
            .removeScriptMessageHandler(forName: "iosBridge")
    }
}

extension WebViewController: WKScriptMessageHandler {

    /// JS 가 부르는 창구. RN 의 @objc 메서드 하나하나에 해당하는 것을
    /// 여기서는 문자열 type 으로 분기합니다.
    func userContentController(
        _ controller: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let raw = message.body as? String,
              let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String
        else { return }

        switch type {
        case "FIRST_PAINT":
            let elapsed = Bench.firstPaint()
            // 화면에 되돌려 주는 것도 JS 문자열 주입입니다.
            webView.evaluateJavaScript("window.__showTtfp && window.__showTtfp(\(elapsed))")

        case "HOST_INFO":
            let id = json["id"] as? String ?? ""
            let version = Bundle.main
                .object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
            let payload = #"{"appVersion":"\#(version)","platform":"ios"}"#
            // 이스케이프를 잘못하면 컴파일도 되고 실행도 되는데 조용히 깨집니다.
            let escaped = payload.replacingOccurrences(of: "\"", with: "\\\"")
            webView.evaluateJavaScript("window.__resolve('\(id)', \"\(escaped)\")")

        case "FINISH":
            BenchCoordinator.shared.finish(
                productId: json["productId"] as? String ?? "",
                action: json["action"] as? String ?? ""
            )

        default:
            break
        }
    }
}
