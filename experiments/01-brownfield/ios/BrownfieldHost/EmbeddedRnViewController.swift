import UIKit

/// 진입점 2: 네이티브 화면 안에 RN 을 부분 삽입하는 경우.
/// 안드로이드의 EmbeddedRnActivity 와 짝입니다.
///
/// 안드로이드는 여기서 onHostResume/onHostPause/onHostDestroy 를 손으로 연결해야 했지만
/// iOS 는 RCTRootView 를 그냥 서브뷰로 붙이면 끝입니다. 브리지 생명주기가 앱 전체에 묶여 있고
/// Activity 처럼 화면 단위로 붙었다 떨어지는 개념이 없기 때문입니다.
/// 같은 "부분 삽입"이라도 양쪽에서 신경 쓸 게 다른 부분입니다.
final class EmbeddedRnViewController: UIViewController {

    private lazy var headerLabel: UILabel = {
        let label = UILabel()
        label.text = "네이티브 헤더"
        label.textColor = .white
        label.font = .boldSystemFont(ofSize: 16)
        label.backgroundColor = UIColor(white: 0.07, alpha: 1)
        label.textAlignment = .center
        return label
    }()

    private lazy var footerLabel: UILabel = {
        let label = UILabel()
        label.text = "위아래는 네이티브 뷰, 가운데만 RCTRootView 입니다."
        label.textColor = UIColor(white: 0.42, alpha: 1)
        label.font = .systemFont(ofSize: 12)
        label.textAlignment = .center
        label.numberOfLines = 0
        label.backgroundColor = UIColor(white: 0.96, alpha: 1)
        return label
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        navigationItem.title = "부분 삽입"

        let rnView = RCTRootView(
            bridge: ReactNativeManager.shared.bridge,
            moduleName: RnHostViewController.Module.settings,
            initialProperties: ["userTier": "PRO"]
        )

        let stack = UIStackView(arrangedSubviews: [headerLabel, rnView, footerLabel])
        stack.axis = .vertical
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            headerLabel.heightAnchor.constraint(equalToConstant: 48),
            footerLabel.heightAnchor.constraint(equalToConstant: 44),
        ])

        RnScreenPresenter.shared.presentedController = self
    }
}
