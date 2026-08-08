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

Android 에뮬레이터(Pixel 9, API 36, arm64)와 iOS 시뮬레이터(iPhone 15, iOS 17.5)에서
아래 경로를 전부 눌러 봤습니다. 실기기에서는 돌려보지 않았습니다.

- 네이티브 화면 → RN 전체 화면 진입, initialProps 수신
- RN → 네이티브 결과 반환 (`ADD_TO_CART`)
- RN → 네이티브 Promise 호출 (`getHostInfo`)
- 네이티브 → RN 이벤트 (부분 삽입 화면)
- 인스턴스 공유 (화면을 바꿔 가며 마운트 카운터가 이어지는지)
- Android 는 릴리스 빌드(번들 내장, Metro 없이)까지 실행 확인

동작 원리와 설계 배경은 [EXPLAINER.md](EXPLAINER.md) 에 따로 정리했습니다.
JS 가 네이티브 앱에 어떻게 붙는지, 브리지가 무엇을 주고받는지, 인스턴스 수명을 왜 설계해야
하는지, OTA 가 스토어 정책 안에서 어디까지 되는지를 다룹니다.

## 구성

```
package.json          JS 루트. android/ 와 ios/ 가 이 아래 node_modules 를 씁니다
EXPLAINER.md          동작 원리와 설계 배경
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
아래 네이티브 바의 "테마 바꾸기"를 누르면 바로 위 RN 영역의 "현재 테마"가 그 자리에서
바뀝니다. 네이티브 → RN 이벤트가 도착하는 걸 눈으로 보는 곳입니다.

**테마 바꾸기 (첫 화면)**
같은 이벤트를 보내지만 아무 일도 일어나지 않습니다. 누르는 시점에 RN 화면이 떠 있지 않아서
리스너가 없기 때문입니다. 이벤트는 버퍼링되지 않고 그냥 사라집니다.
화면이 뜬 뒤 최신 상태를 맞춰야 한다면 `initialProps` 나 조회형 메서드를 써야 합니다.

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

### Hermes 와 JSC

`hermesEnabled` 는 엔진을 쓸지 말지가 아니라 어느 엔진을 쓸지 고르는 값입니다.
JS 엔진 없이는 앱이 돌지 않습니다.

Hermes 는 두 부분으로 나뉩니다. 이걸 구분하지 않으면 헷갈립니다.

```
hermesc                            libhermes.so
= 컴파일러                          = 엔진(VM)
= node_modules 안의 macOS 실행파일   = APK 안의 arm64 공유 라이브러리
= 내 맥에서 빌드할 때 한 번 돎        = 사용자 폰에서 앱 켤 때마다 돎
= 앱에 안 들어감                     = 2.27MB 로 들어감
```

APK 안의 `index.android.bundle` 은 `hermesc` 의 출력물입니다.
손으로 직접 돌려도 같은 매직 넘버가 나옵니다.

```bash
node_modules/react-native/sdks/hermesc/osx-bin/hermesc \
  -emit-binary -out out.hbc bundle.js
# c6 1f bc 03 c1 03 19 1f  ← Hermes 바이트코드
```

같은 앱을 arm64 릴리스로 두 번 빌드해서 비교했습니다.

| | Hermes | JSC |
|---|---|---|
| APK | 18.4 MB | 21.7 MB |
| 엔진 `.so` | libhermes 2.27 MB | libjsc 5.82 MB |
| 번들 | 814 KB (바이트코드) | 915 KB (JS 텍스트) |
| 콜드 스타트 | 390 / 239 / 175 | 413 / 486 / 218 |
| 첫 RN 진입 | 188ms | 191ms |

크기는 Hermes 가 3.3MB 작습니다. 엔진 바이너리 차이가 대부분입니다.

시작 시간은 이 에뮬레이터에서 유의미한 차이가 안 났습니다. 3회 측정이라 편차 안에 묻혔고,
호스트가 Apple Silicon 이라 파싱 비용이 저사양 기기만큼 안 드러난 것으로 보입니다.
Hermes 의 시작 시간 이점을 숫자로 보려면 저사양 실기기에서 재야 합니다.

```bash
./gradlew assembleRelease -PabiFilters=arm64-v8a -PhermesEnabled=false
```

### 시작 시간과 진입 시간

Pixel 9 에뮬레이터(API 36, arm64), 호스트 맥은 Apple Silicon.
콜드 스타트는 `adb shell am start -W -S` 의 `TotalTime` 을 3회 잰 값입니다.
진입 시간은 앱이 화면에 직접 표시하는 값(네이티브가 Intent 를 던진 시각부터
JS 컴포넌트 첫 렌더까지)입니다.

| 빌드 | preload | 콜드 스타트 | 첫 RN 진입 | 두 번째 진입 |
|---|---|---|---|---|
| debug (Metro) | false | 478 / 529 / 533 | 791ms | 52ms |
| debug (Metro) | true | 650 / 474 / 463 | 191ms | - |
| release (번들 내장) | false | 390 / 239 / 175 | 188ms | 55ms |

읽을 때 주의할 점 세 가지입니다.

디버그 값은 Metro 를 끼고 있어서 그대로 쓸 수 없습니다. 릴리스와 비교하면 콜드 스타트가
2배 넘게 차이 납니다. 디버그로 잰 숫자를 근거로 판단하면 안 됩니다.

`PRELOAD_REACT_INSTANCE` 를 켜도 콜드 스타트가 거의 안 늘었습니다. 예상과 다른데,
`createReactContextInBackground()` 가 백그라운드 스레드로 도는 데다
`am start -W` 는 첫 프레임까지만 재기 때문입니다. 비용이 사라진 게 아니라
이 측정 방법에 안 잡히는 것뿐입니다. 실제로는 앱 시작 직후 CPU 를 나눠 쓰게 되므로,
저사양 기기나 시작 직후 다른 초기화가 몰리는 앱에서는 다르게 나올 수 있습니다.

첫 진입과 두 번째 진입의 차이(릴리스 기준 188ms → 55ms)가 인스턴스 생성 비용입니다.
preload 를 켜면 첫 진입이 그만큼 당겨집니다(791 → 191ms, 디버그 기준).
결국 이 비용을 앱 시작 때 낼 것이냐 화면 진입 때 낼 것이냐의 선택입니다.

### 측정 범위 밖

위 숫자를 인용할 때 다음은 빠져 있다고 보면 됩니다.

- 실기기. 전부 에뮬레이터에서 잰 값입니다
- RN 을 붙이기 전 호스트 앱만의 콜드 스타트. 증가분을 따로 떼려면 이게 필요합니다
- iOS 의 시작 시간과 앱 크기. 시뮬레이터 빌드는 슬라이스가 여러 개 들어가서
  배포 크기와 비교가 안 됩니다. 실기기 아카이브로 재야 합니다

## 이 저장소에 넣지 않은 것

- 키스토어, provisioning profile, 인증서, 팀 ID
  안드로이드 디버그 빌드는 각자 로컬의 `~/.android/debug.keystore` 를 씁니다.
  iOS 시뮬레이터 빌드는 서명 없이 됩니다. 실기기에 올리려면 Xcode 에서 팀을 직접 고릅니다.
- `local.properties`, `.xcode.env.local`, `.env`
  전부 `.gitignore` 에 있습니다.
- 평문 통신 허용은 Android 의 `src/debug/AndroidManifest.xml` 에만 있습니다.
  릴리스 매니페스트로 새지 않습니다. iOS 는 `NSAllowsArbitraryLoads` 대신
  `NSAllowsLocalNetworking` 만 켰습니다.

## 돌려 보고 나서야 나온 것들

빌드가 통과한 것과 화면이 뜨는 것은 별개였습니다. 네 가지가 실행 단계에서 걸렸습니다.

**`ReactActivity` 생성자에서 `intent` 를 읽으면 죽습니다.**
`ReactActivity` 는 필드 초기화로 `createReactActivityDelegate()` 를 부릅니다.
그 시점에는 Activity 가 attach 되기 전이라 `intent` 가 null 입니다.
`moduleName` 을 Intent 로 받는 구조에서는 반드시 밟게 되는 지점인데,
컴파일도 통과하고 정적 분석에도 안 걸립니다. delegate 의 `getMainComponentName()` 과
`getLaunchOptions()` 안에서 읽으면 됩니다. 그쪽은 `onCreate` 시점에 불립니다.

**iOS 에서 `RCTRootView` 를 `view` 에 그대로 대입하면 safe area 를 침범합니다.**
RN 화면만 따로 보면 멀쩡한데, 네이티브 네비게이션 컨트롤러 위에 올리는 순간
콘텐츠가 상태바와 뒤로가기 버튼에 겹칩니다. 그린필드 템플릿에는 없는 문제입니다.
거기서는 RN 이 화면 전체를 갖기 때문입니다. safe area 를 네이티브가 책임질지
RN 이 책임질지 한쪽으로 정해야 하고, 양쪽에서 각자 처리하면 여백이 두 번 들어갑니다.

**측정값을 렌더 본문에서 계산하면 측정이 안 됩니다.**
"네이티브 호출 → 첫 렌더"를 렌더 본문에서 계산했더니 버튼을 누를 때마다 값이 바뀌었습니다.
4172ms 로 시작해서 34960ms 가 됐습니다. `useState` 초기화 함수로 옮겨서 고정했습니다.

**끌 수 없는 스위치를 스위치라고 적어 뒀습니다.**
`hermesEnabled=false` 로 바꿀 수 있다고 README 에 써 놨는데, `app/build.gradle` 에
`if (hermesEnabled) { hermes-android }` 만 있고 `else` 가 없었습니다. 끄면 JS 엔진이
하나도 안 들어갑니다. 빌드는 멀쩡히 통과하고 앱을 켤 때 죽습니다.
JSC 를 붙여서 실제로 빌드하고 돌려 본 뒤에야 확인됐습니다.

**확인할 수 없는 데모는 데모가 아닙니다.**
"테마 바꾸기" 버튼을 네이티브 첫 화면에 뒀는데, 누르는 시점에는 RN 화면이 떠 있지 않아
리스너가 없었습니다. 이벤트는 나가지만 받는 쪽이 없어서 화면에서는 아무것도 안 보입니다.
네이티브와 RN 이 한 화면에 공존하는 부분 삽입 화면으로 버튼을 옮기고 나서야
동작을 확인할 수 있었습니다.

## 알려진 문제

`npm audit` 에 high 6건이 뜹니다. 전부 Metro 가 의존하는 `image-size` 한 곳에서 나오고,
번들링할 때만 도는 빌드 도구 쪽입니다. 앱에 실려 나가는 코드가 아닙니다.
RN 0.76 라인을 유지하는 동안은 해소되지 않아서 그대로 둡니다.

## 다음에 해 볼 것

- 실기기에서 다시 측정. 에뮬레이터 값은 순서만 믿을 수 있습니다
- RN 을 붙이기 전 호스트 앱만의 콜드 스타트를 재서 증가분 확인
- `newArchEnabled=true` 로 바꿨을 때 뭐가 깨지는지
- 서드파티 RN 라이브러리를 하나 넣었을 때 autolinking 이 양쪽에서 어떻게 도는지
- 기존 앱이 이미 쓰고 있는 `.so` 와 충돌하는 상황 재현
