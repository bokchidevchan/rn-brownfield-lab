# 신아키텍처는 브라운필드에서 무엇을 바꾸는가

같은 앱을 아키텍처 플래그만 바꿔 두 번 빌드해서 비교했습니다.
화면도 측정 코드도 기기도 같고 `newArchEnabled` 하나만 다릅니다.

```
rn/        JS. 화면 두 개(서피스 두 개용)
android/   한 소스, 두 빌드
bench.sh   조건별 반복 측정
```

기준: RN 0.76.9, Hermes, Pixel 9 에뮬레이터(API 36, arm64, RAM 4GB)
릴리스 빌드, arm64 단독, 조건당 10회, 중앙값
최종 확인일: 2026-08-08

## 결론 먼저

**RN 0.76 에서 아키텍처를 바꿔도 진입 시간과 앱 크기는 거의 안 바뀌었습니다.**

| 중앙값 | 구아키텍처 | 신아키텍처 | 차이 |
|---|---|---|---|
| 서피스 1개, 엔진 예열 없음 | 447 ms | 444 ms | 없음 |
| 서피스 1개, 엔진 예열 있음 | 268 ms | 245 ms | 9% |
| 서피스 2개 중 첫 번째 | 459 ms | 388 ms | 15% |
| **두 번째 서피스 추가 비용** | 66 ms | **59 ms** | 11% |
| APK 크기 | 17.39 MB | 17.41 MB | 없음 |

편차가 커서(구 280~1213ms, 신 304~704ms) 9~15% 는 노이즈와 구분하기 어렵습니다.
눈에 띄는 건 **신아키텍처 쪽 편차가 작다**는 정도입니다. 최대값이 1213ms 에서 704ms 로
줄었습니다. 평균이 아니라 꼬리가 짧아진 것이 Fabric 의 동기 레이아웃과 관계있을 수 있는데,
이 실험으로 인과를 확인하지는 못했습니다.

**"서피스는 값싸다"는 구아키텍처에서도 이미 성립합니다.** 66ms 대 59ms 입니다.
두 방식 모두 JS 컨텍스트를 공유하니 두 번째 화면이 싼 건 당연합니다.
신아키텍처의 이점은 속도가 아니라 아래 코드 쪽입니다.

## 진짜 달라지는 건 코드입니다

같은 파일 안에서 두 경로를 나란히 뒀습니다. `SurfaceActivity.kt` 를 보세요.

```kotlin
if (BuildConfig.IS_NEW_ARCH) {
    // 엔진에게 화면 하나를 만들어 달라고 요청합니다
    val surface = host.createSurface(this, moduleName, props)
    surface.start()                       // 시작이 명시적
    container.addView(surface.view)
} else {
    // 앱이 RootView 를 직접 만들고 인스턴스 매니저를 넘깁니다
    val rootView = ReactRootView(this)
    rootView.startReactApplication(reactInstanceManager, moduleName, props)
    container.addView(rootView)
}
```

정리하면 이렇습니다.

| | 구아키텍처 | 신아키텍처 |
|---|---|---|
| 엔진 | `ReactInstanceManager` | `ReactHost` |
| 화면 | `ReactRootView` | `ReactSurface` |
| 화면 시작 | `startReactApplication()` | `surface.start()` |
| 화면 종료 | `unmountReactApplication()` | `surface.stop()` |
| 엔진 예열 | `createReactContextInBackground()` | `reactHost.start()` |
| 렌더러 | Paper | Fabric |

**대칭성이 생긴 게 핵심입니다.** 구아키텍처에는 "화면을 시작한다"에 대응하는
"멈춘다"가 없었습니다. `unmountReactApplication` 이 그 자리를 대신했는데 이름부터
대칭이 아니고, 언제 무엇이 정리되는지도 불명확했습니다. `start()` / `stop()` 은
네이티브 화면의 생명주기와 짝지어 쓰기 쉽습니다.

다만 **자동은 아닙니다.** `stop()` 을 `onDestroy` 와 짝지어 부르는 건 여전히
개발자 몫입니다. 이 예제도 직접 부릅니다.

## 두 서피스가 같은 런타임을 공유합니다

화면에서 확인할 수 있게 카운터를 뒀습니다. 상품 상세와 리뷰가 `shared.mounts` 를
같이 씁니다. 두 번째 화면에서 2 가 나오면 같은 JS 런타임입니다.

두 아키텍처 모두 2 가 나옵니다. 번들을 다시 파싱하지 않는다는 뜻이고,
그래서 두 번째 서피스가 59~66ms 로 쌉니다.

편한 만큼 대가가 있습니다. 화면 사이에 격리가 없습니다. 한 화면에서 만든 전역 상태,
타이머, 구독이 다른 화면에서 그대로 보입니다. 01 번에서 짚은 것과 같은 문제입니다.

## 빌드에서 걸린 것

**`ReactSurface` 의 패키지가 다릅니다.**

```kotlin
import com.facebook.react.interfaces.fabric.ReactSurface
```

`com.facebook.react` 아래에 있을 것 같은데 아닙니다. Fabric 전용 인터페이스라는 게
경로에 드러납니다. 이름만 보고 import 하면 안 나옵니다.

**ABI 를 줄이는 방법이 01 번과 반대입니다.**

01 번에서 "`reactNativeArchitectures` 를 줄여도 APK 는 안 줄어들고 `abiFilters` 를
써야 한다"고 적었습니다. 신아키텍처에서는 그것만으로 부족합니다.

| | ABI 를 줄이려면 |
|---|---|
| 구아키텍처 (prebuilt 소비) | `abiFilters` 만으로 됩니다 |
| 신아키텍처 (codegen C++ 를 직접 빌드) | `abiFilters` 와 `reactNativeArchitectures` 둘 다 |

`abiFilters` 만 준 신아키텍처 릴리스가 50.4MB 로 나왔습니다. 4개 ABI 가 다 들어갔습니다.
`reactNativeArchitectures` 를 같이 주니 18.3MB 가 됐습니다.

**앱 크기가 안 바뀐 이유.** 두 APK 의 `.so` 합계가 10.90MB 와 10.91MB 로 같습니다.
신아키텍처에만 있는 건 `libappmodules.so` 하나뿐이고, 이건 우리 앱 모듈의 codegen
산출물이라 작습니다. RN 0.76 의 `libreactnative.so` 안에 Paper 와 Fabric 이 둘 다
들어 있어서, 플래그를 꺼도 Fabric 코드가 앱에 실려 나갑니다.

0.84 부터는 다릅니다. iOS 빌드에서 레거시 코드가 빠지고 Android 에서도 레거시 클래스가
삭제되기 시작했습니다. 그 버전대에서는 이 항목의 결과가 달라질 것입니다.

## 네이티브 모듈은 안 고쳐도 됩니다

`BenchModule.kt` 는 두 아키텍처에서 코드가 같습니다. `@ReactMethod` 를 붙인
`ReactContextBaseJavaModule` 그대로입니다. 인터롭 레이어가 기존 모듈을 받아 줍니다.

JS 쪽도 같습니다. `NativeModules.Bench` 로 접근하는 코드가 그대로 동작합니다.

완전한 TurboModule 로 만들려면 Codegen 스펙(TS 타입 정의)을 쓰고 생성된 인터페이스를
구현해야 하는데, 그건 라이브러리 저자의 일입니다. 앱 개발자는 대개 이 상태로 넘어갑니다.
**"신아키텍처로 바꾸면 모듈을 다 다시 써야 한다"는 사실이 아닙니다.**

진짜 관문은 자기 모듈이 아니라 **쓰고 있는 서드파티 라이브러리들이 신아키텍처를
지원하는지**입니다. 이 예제는 서드파티가 없어서 그 관문을 통과할 일이 없었습니다.

## 버전별로 무엇이 달라지나

0.78 과 0.8x 의 차이를 정리합니다. 이 절은 측정이 아니라 릴리스 노트 조사입니다.

| 버전 | 시기 | 브라운필드 관점에서 중요한 것 |
|---|---|---|
| 0.76 | 2024-10 | 신아키텍처가 기본값. 끄는 것도 가능 |
| 0.78 | 2025-02 | React 19. 아직 구아키텍처로 되돌릴 수 있음 |
| 0.79 | 2025-04 | JSC 가 커뮤니티 패키지로 분리. 원격 JS 디버깅 제거 |
| 0.80 | 2025-06 | **구아키텍처 동결.** 더 이상 수정이 안 들어감. iOS 사전 컴파일 실험적 도입 |
| 0.81 | 2025-08 | Android 16 지원. `SafeAreaView` deprecated |
| 0.82 | 2025-10 | **구아키텍처 선택 자체가 제거.** `newArchEnabled=false` 를 무시함. Hermes V1 opt-in |
| 0.83 | 2025-12 | 파괴적 변경 없는 첫 릴리스 |
| 0.84 | 2026-02 | **Hermes V1 기본.** iOS 사전 컴파일 바이너리 기본. 레거시 코드 삭제 시작 |
| 0.85 | 2026-04 | 새 애니메이션 백엔드 |
| 0.86 | 2026-06 | Android 15+ edge-to-edge 전면 지원. 파괴적 변경 없음. 저장소가 `facebook` 에서 `react` org 으로 이동 |

**갈림길은 0.82 입니다.** 그전까지는 문제가 생기면 구아키텍처로 도망갈 수 있었고,
0.82 부터는 퇴로가 없습니다. 0.84 에서 레거시 코드가 물리적으로 빠지기 시작합니다.

브라운필드 앱이 0.7x 에 머물러 있다면 업그레이드 시 통합 코드 재작성이 사실상 필수입니다.
그런데 이 실험이 보여주듯 **재작성 자체는 크지 않습니다.** `SurfaceActivity.kt` 의
분기 하나 분량입니다. 진짜 비용은 서드파티 라이브러리 호환성 확인 쪽입니다.

## iOS 는 다릅니다

RN 0.76 에는 `RCTReactNativeFactory` 가 없습니다. `RCTRootViewFactory` 만 있습니다.
흔히 인용되는 iOS 신아키텍처 브라운필드 API 는 0.77 이후 기준입니다.

그래서 이 실험은 Android 만 했습니다. 0.76 에서 iOS 쪽을 만들면 지금 버전에만 있는
과도기 API 를 문서화하게 되고, 그건 참고 가치가 떨어집니다.

`react-native-brownfield`(Callstack) 같은 도구가 RN 파트를 XCFramework 나 AAR 로
패키징해 주는 방향으로 가고 있고, 0.80 의 iOS 사전 컴파일 의존성이 0.84 에서 기본이
되면서 그 방향이 공식화됐습니다. 02 번에서 손으로 만든 것이 그 개념입니다.

## 실행

```bash
cd rn && npm install && npm run bundle:android

cd ../android
./gradlew installDebug -PabiFilters=arm64-v8a -PnewArchEnabled=false
./gradlew installDebug -PabiFilters=arm64-v8a -PnewArchEnabled=true

cd .. && BENCH_PKG=com.example.arch.debug ./bench.sh 10
```

릴리스로 재려면 두 플래그를 다 줘야 합니다.

```bash
./gradlew assembleRelease -PabiFilters=arm64-v8a \
  -PreactNativeArchitectures=arm64-v8a -PnewArchEnabled=true
```

## 확인한 것과 안 한 것

릴리스 빌드로 두 아키텍처 각각 4조건 10회씩, 총 80회 측정했습니다.
Fabric 이 실제로 도는 것은 화면의 "렌더러: Fabric" 표시로 확인했습니다.

안 한 것입니다.

- 실기기. 에뮬레이터라 절대값을 믿을 수 없습니다
- iOS
- 서드파티 라이브러리를 넣었을 때의 호환성. 업그레이드의 진짜 관문인데 안 다뤘습니다
- 동기 레이아웃 측정의 효과. Fabric 의 대표 장점인데, 네이티브 레이아웃 안에 RN 조각을
  끼울 때 깜빡임이 줄어드는지를 재려면 다른 측정 설계가 필요합니다
- 편차가 왜 줄었는지. 최대값이 1213ms 에서 704ms 로 줄었는데 원인은 확인 못 했습니다
- 메모리. `ReactHost` 와 `ReactInstanceManager` 의 상주 메모리 차이
- 0.8x 버전대. 위 표는 릴리스 노트 조사이고 직접 돌려본 것이 아닙니다
