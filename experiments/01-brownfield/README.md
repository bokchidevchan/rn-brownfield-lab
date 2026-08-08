# 브라운필드 통합 예제

이미 있는 네이티브 앱에 RN 화면을 얹는 최소 구성입니다.
Kotlin 호스트 앱과 Swift 호스트 앱이 같은 JS 번들을 공유합니다.

앱의 진입점은 네이티브 화면입니다. RN 은 거기서 들어가는 하위 화면으로만 존재합니다.
이 전제가 그린필드와 다른 부분이고, 코드 대부분이 그 차이에서 나옵니다.

최종 확인일: 2026-08-08

| | |
|---|---|
| React Native | 0.76.9 |
| 아키텍처 | Old Architecture (`newArchEnabled=false`) |
| JS 엔진 | Hermes |
| Android | Kotlin 2.0.21, AGP 8.6.0, Gradle 8.10.2, compileSdk 35, minSdk 24 |
| iOS | Swift 5.0, 배포 타깃 15.1, CocoaPods 1.15.2 |

빌드는 양쪽 다 확인했습니다. Android 는 `assembleDebug` 와 `assembleRelease`,
iOS 는 시뮬레이터 디버그 빌드(`xcodebuild -sdk iphonesimulator`)까지입니다.
기기에 올려서 실제로 화면을 넘겨 보는 것은 아직 안 했습니다. `[미검증]`

## 구성

```
package.json          JS 루트. android/ 와 ios/ 가 이 아래 node_modules 를 씁니다
index.js              AppRegistry 에 화면 2개 등록
js/
  screens/            RN 화면
  native/HostBridge.js  네이티브 호출을 모아 둔 래퍼
  instanceCounter.js  JS 컨텍스트 공유 여부 확인용
android/              Kotlin 호스트 앱
ios/                  Swift 호스트 앱
```

## 실행

Metro 를 먼저 띄웁니다.

```bash
cd experiments/01-brownfield
npm install
npm start
```

### Android

```bash
cd android
./gradlew installDebug
adb reverse tcp:8081 tcp:8081   # 실기기일 때만
```

JDK 17 이 필요합니다. Android SDK 경로는 `local.properties` 에 `sdk.dir` 를 적거나
`ANDROID_HOME` 환경변수로 넘깁니다. 두 파일 모두 저장소에 없습니다.

### iOS

```bash
cd ios
ruby scripts/generate_xcodeproj.rb   # .xcodeproj 를 다시 만들 때만
pod install
open BrownfieldHost.xcworkspace
```

`.xcodeproj` 는 커밋돼 있어서 받자마자 `pod install` 로 넘어가도 됩니다.
프로젝트 설정을 바꿀 일이 생기면 Xcode 에서 직접 고치지 말고
`scripts/generate_xcodeproj.rb` 를 고치고 다시 돌리는 쪽이 diff 가 읽힙니다.

## 화면에서 확인할 수 있는 것

호스트 앱 첫 화면에 버튼 네 개가 있습니다.

**RN 상품 상세 열기**
전체 화면 RN 진입점입니다. 네이티브가 `initialProps` 로 `productId`, `entryPoint`,
`launchedAtMs` 를 넘깁니다. 화면 안에서 "장바구니에 담고 닫기"를 누르면 결과가 네이티브로
돌아와 첫 화면에 표시됩니다.

**RN 설정 열기**
두 번째 진입점입니다. 상세 화면을 먼저 열었다가 이걸 열면 화면 안의 마운트 카운터가
이어집니다. 같은 JS 컨텍스트를 쓰고 있다는 뜻입니다.

**네이티브 화면 안에 RN 부분 삽입**
위아래는 네이티브 뷰, 가운데만 RN 입니다. 안드로이드는 `ReactRootView` 를 직접 붙이고
생명주기를 손으로 연결하고, iOS 는 `RCTRootView` 를 서브뷰로 넣기만 하면 됩니다.

**테마 바꾸기**
네이티브에서 RN 으로 이벤트를 보냅니다. RN 화면에 한 번도 안 들어간 상태에서 누르면
"인스턴스가 없어서 버려졌다"고 나옵니다. 이벤트는 버퍼링되지 않는다는 걸 확인하는 용도입니다.

## 진입점 구조 정리

| | Android | iOS |
|---|---|---|
| 인스턴스 보관 | `HostApplication` 의 `ReactNativeHost` | `ReactNativeManager.shared` 의 `RCTBridge` |
| 전체 화면 | `RnHostActivity : ReactActivity` | `RnHostViewController` + `RCTRootView` |
| 부분 삽입 | `EmbeddedRnActivity` + `ReactRootView` | `EmbeddedRnViewController` + `RCTRootView` |
| 생명주기 연결 | 부분 삽입 시 수동 (`onHostResume` 등 4개) | 불필요 |
| initialProps | `Intent` 의 `Bundle` | `initialProperties` 딕셔너리 |
| 네이티브 모듈 | `ReactPackage` 를 `getPackages()` 에 추가 | `RCT_EXTERN_MODULE` (.m 파일 필요) |

iOS 에는 `ReactNativeHost` 에 해당하는 기성 클래스가 없습니다. 그린필드 템플릿은
`RCTAppDelegate` 상속으로 해결하는데, 기존 앱의 AppDelegate 를 그렇게 바꾸기는 어렵습니다.
그래서 브리지를 들고 있는 객체를 따로 두는 게 사실상 표준입니다.

## 인스턴스 생성 시점 스위치

두 플랫폼에 같은 스위치를 뒀습니다. 앱 시작 때 미리 만들 것인가, 첫 진입 때 만들 것인가.

- Android: `HostApplication.PRELOAD_REACT_INSTANCE`
- iOS: `ReactNativeManager.preloadOnLaunch`

바꿔 가며 콜드 스타트, 첫 RN 화면 진입, 두 번째 진입 세 개를 같이 재야 판단이 됩니다.
하나만 재면 "빨라졌다"가 어디서 온 건지 알 수 없습니다.
RN 화면 안에 네이티브 호출부터 첫 렌더까지 걸린 시간이 표시됩니다.

## 측정

측정 환경: MacBook (Apple Silicon), macOS 14.5, JDK 17, RN 0.76.9, Hermes.
2026-08-08 기준.

### APK 크기

| 빌드 | 크기 |
|---|---|
| debug, ABI 4개 | 111.5 MB |
| release, ABI 4개, R8 off | 50.7 MB |
| release, arm64-v8a 만, R8 off | 18.4 MB |
| release, arm64-v8a 만, R8 on | 14.4 MB |

명령은 이렇습니다.

```bash
./gradlew assembleRelease -PabiFilters=arm64-v8a -Pminify
```

이 호스트 앱은 화면 두 개짜리라 자기 코드가 사실상 없습니다. 위 숫자는 그대로
"RN 을 붙이면 늘어나는 몫"으로 봐도 됩니다.

arm64 릴리스(R8 off) 안을 열어 보면 이렇게 나뉩니다. 압축 전 기준입니다.

| 항목 | 크기 |
|---|---|
| classes.dex + classes2.dex | 12.8 MB |
| lib/arm64-v8a/libreactnative.so | 6.5 MB |
| lib/arm64-v8a/libhermes.so | 2.3 MB |
| lib/arm64-v8a/libc++_shared.so | 1.3 MB |
| assets/index.android.bundle | 813 KB |

R8 을 켰을 때 줄어드는 4 MB 는 거의 전부 dex 쪽입니다. `.so` 는 R8 과 무관합니다.

ABI 를 줄일 때 헷갈리는 지점이 하나 있습니다. `gradle.properties` 의
`reactNativeArchitectures` 를 줄여도 APK 는 안 줄어듭니다. 그 값은 RN 을 소스에서
빌드할 때 쓰는 것이고, RN 0.76 은 기본적으로 미리 빌드된 바이너리를 받아 쓰기 때문입니다.
실제로 빼려면 `abiFilters` 나 `splits.abi` 를 써야 합니다. 위 표의 50.7 MB 와 18.4 MB 가
같은 릴리스 빌드에서 이 차이 하나로 갈린 결과입니다.

### 아직 안 잰 것 `[미검증]`

- 콜드 스타트 (RN 붙이기 전후)
- 첫 RN 화면 진입 시간, 두 번째 진입 시간
- `PRELOAD_REACT_INSTANCE` 를 켰을 때 위 세 값이 어떻게 움직이는지
- Hermes 를 끄고 JSC 로 바꿨을 때의 크기와 시작 시간
- iOS 쪽 크기. 시뮬레이터 빌드는 슬라이스가 여러 개 들어가서 배포 크기와 비교가 안 됩니다.
  실기기 아카이브로 다시 재야 합니다.

## 이 저장소에 넣지 않은 것

- 키스토어, provisioning profile, 인증서, 팀 ID
  안드로이드 디버그 빌드는 각자 로컬의 `~/.android/debug.keystore` 를 씁니다.
  iOS 시뮬레이터 빌드는 서명 없이 됩니다. 실기기에 올리려면 Xcode 에서 팀을 직접 고릅니다.
- `local.properties`, `.xcode.env.local`, `.env`
  전부 `.gitignore` 에 있습니다.
- 평문 통신 허용은 Android 의 `src/debug/AndroidManifest.xml` 에만 있습니다.
  릴리스 매니페스트로 새지 않습니다. iOS 는 `NSAllowsArbitraryLoads` 대신
  `NSAllowsLocalNetworking` 만 켰습니다.

## 알려진 문제

`npm audit` 에 high 6건이 뜹니다. 전부 Metro 가 의존하는 `image-size` 한 곳에서 나오고,
번들링할 때만 도는 빌드 도구 쪽입니다. 앱에 실려 나가는 코드가 아닙니다.
RN 0.76 라인을 유지하는 동안은 해소되지 않아서 그대로 둡니다.

## 다음에 해 볼 것

- 인스턴스 생성 시점을 바꿔 가며 콜드 스타트와 진입 시간 실측
- `newArchEnabled=true` 로 바꿨을 때 뭐가 깨지는지
- 서드파티 RN 라이브러리를 하나 넣었을 때 autolinking 이 양쪽에서 어떻게 도는지
- 기존 앱이 이미 쓰고 있는 `.so` 와 충돌하는 상황 재현
