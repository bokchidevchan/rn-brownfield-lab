import WebKit

/// 웹뷰 프리워밍. Android 의 WebViewWarmer.kt 와 같은 의도입니다.
///
/// iOS 에서 비싼 것은 WKWebView 뷰 객체가 아니라 WebKit 콘텐츠 프로세스 기동입니다.
/// WKWebView 는 렌더링을 별도 프로세스에서 합니다. 그 프로세스를 미리 띄워 두면
/// 그 뒤로 싸집니다.
///
/// WKProcessPool 을 공유하면 프로세스를 재사용할 수 있어서, 그것도 같이 잡아 둡니다.
/// Android 는 Chromium 초기화가 프로세스 단위라 아무 WebView 나 하나 만들면 됐는데,
/// iOS 는 pool 을 명시적으로 넘겨야 재사용됩니다. 같은 목적, 다른 손잡이입니다.
enum WebViewWarmer {

    static let processPool = WKProcessPool()

    private static var warmed: WKWebView?

    static var isWarmed: Bool { warmed != nil }

    static func warmUp() {
        guard warmed == nil else { return }
        let config = WKWebViewConfiguration()
        config.processPool = processPool
        let view = WKWebView(frame: .zero, configuration: config)
        view.loadHTMLString("<html><body></body></html>", baseURL: nil)
        warmed = view
        Bench.log("webview_warmup_done")
    }

    static func release() {
        warmed = nil
    }
}
