// React 는 SDK 내부 구현에만 씁니다. 공개 API 는 UIKit/Foundation 타입만 노출합니다.
// 일반 import 로 두면 BUILD_LIBRARY_FOR_DISTRIBUTION 이 만드는 .swiftinterface 에
// `import React` 가 그대로 실려 나가고, React 모듈이 없는 소비 앱에서
// "no such module 'React'" 로 빌드가 깨집니다.
@_implementationOnly import React
import UIKit

/// 부분 삽입용. 소비 앱에는 `UIView` 로 건네집니다.
///
/// Android 의 RnSdkView 와 달리 생명주기를 연결할 일이 없습니다.
/// iOS 는 브리지 수명이 앱 전체에 묶여 있고 Activity 처럼 화면 단위로
/// 붙었다 떨어지는 개념이 없기 때문입니다. 같은 "부분 삽입"이라도
/// 플랫폼별로 SDK 가 감춰 주는 양이 다릅니다.
final class RnSdkView: UIView {

    init(moduleName: String, initialProperties: [String: Any]) {
        super.init(frame: .zero)

        let rootView = RCTRootView(
            bridge: SdkReactHost.shared.bridge,
            moduleName: moduleName,
            initialProperties: initialProperties
        )
        rootView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(rootView)
        NSLayoutConstraint.activate([
            rootView.topAnchor.constraint(equalTo: topAnchor),
            rootView.bottomAnchor.constraint(equalTo: bottomAnchor),
            rootView.leadingAnchor.constraint(equalTo: leadingAnchor),
            rootView.trailingAnchor.constraint(equalTo: trailingAnchor),
        ])
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("스토리보드로 만들지 않습니다.")
    }
}
