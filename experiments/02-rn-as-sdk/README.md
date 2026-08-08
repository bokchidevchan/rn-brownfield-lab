# RN 을 SDK 로 빼기

01 번은 RN 과 네이티브 앱이 한 저장소에 같이 있었습니다.
여기서는 RN 부분을 배포 가능한 산출물로 빼고, 그걸 가져다 쓰는 앱을 따로 둡니다.

```
rn-sdk/            RN 팀이 소유. AAR 과 XCFramework 를 만들어 배포합니다
consumer-android/  RN 을 모르는 순수 Kotlin 앱. node_modules 가 없습니다
consumer-ios/      RN 을 모르는 순수 Swift 앱. node_modules 가 없습니다
```

기준: RN 0.76.9, Old Architecture, Hermes
최종 확인일: 2026-08-08

검증 수준이 두 플랫폼에서 다릅니다. Android 는 에뮬레이터에서 화면을 눌러 가며 전 기능을
확인했고, iOS 는 시뮬레이터에서 빌드, 설치, 기동, RN 브리지 생성과 번들 로드까지만
확인했습니다. iOS 의 개별 버튼 동작은 미확인이고 실기기는 양쪽 다 안 했습니다.
자세한 범위는 아래 "확인한 것"에 적었습니다.

## 무엇이 달라지는가

| | 01 번 (한 저장소) | 02 번 (SDK 분리) |
|---|---|---|
| 소비 앱에 Node 필요 | 필요 | 불필요 |
| 소비 앱 소스 파일 수 | 15개 (android/ 만) | 12개 |
| RN 버전 올리기 | 앱 팀이 같이 겪음 | SDK 팀이 흡수, 버전 문자열만 |
| 번들 만드는 시점 | 앱 릴리스 빌드 | SDK 배포 |
| `com.facebook.react` 등장 | 앱 코드 전반 | 0회 |

실무에서 이게 중요해지는 지점은 조직입니다. 앱 팀 전원이 nvm 과 watchman 을 깔아야 하느냐,
RN 팀만 깔면 되느냐의 차이입니다.

이게 가능한 전제는 `com.facebook.react:react-android` 가 Maven Central 에 올라가 있다는
점입니다. 소비 앱이 node_modules 없이 Gradle 의존성만으로 RN 을 받을 수 있습니다.

## 무엇을 얻고 무엇을 잃는가

### 얻는 것

**앱 팀이 RN 도구를 안 깔아도 됩니다.** 이게 제일 큽니다. nvm, Node 버전, watchman,
Metro 설정이 전부 SDK 팀 안으로 들어갑니다. 앱 팀 20명이 겪던 걸 3명이 겪습니다.

**RN 버전 업그레이드를 SDK 팀이 흡수합니다.** 01 번에서는 RN 을 올리면 앱의
`gradle.properties`, `settings.gradle`, `build.gradle`, Podfile 이 같이 흔들렸습니다.
02 번에서 앱 팀이 바꾸는 건 버전 문자열 하나입니다.

**앱 코드에 RN 타입이 안 남습니다.** 소비 앱 소스에 `com.facebook.react` 도
`React` 도 `RCT` 도 0회입니다. 나중에 RN 을 걷어내거나 다른 것으로 바꿀 때
고칠 표면이 좁습니다.

**빠뜨리면 터지는 코드를 앱 팀에 안 줍니다.** 01 번의 부분 삽입은 `onHostResume`,
`onHostPause`, `onHostDestroy`, `onBackPressed` 네 개를 앱이 손으로 연결해야 했고,
빠뜨려도 즉시 안 보이고 나중에 누수로 나타났습니다. 02 번은 `addView` 한 줄입니다.

**같은 화면을 여러 앱에 배포할 수 있습니다.** 사내에 앱이 여럿이면 이 구조가 아니면
소스를 복제하게 됩니다.

### 잃는 것

**autolinking 이 사라집니다.** 서드파티 RN 라이브러리를 추가할 때마다 SDK 가 손으로
등록해야 합니다. Android 는 `MainReactPackage` 옆에 Package 를 추가하고, iOS 는
Podfile 에 pod 을 적습니다. 라이브러리를 자주 추가하는 팀이면 이 비용이 계속 듭니다.

**개발 루프가 느려집니다.** 이게 실무에서 제일 아플 지점입니다.
JS 한 줄을 고쳤을 때 SDK 팀은 Metro 를 붙여 즉시 보지만, 앱 팀 환경에서 확인하려면
SDK 를 다시 만들어 배포해야 합니다. 이번 실측으로 AAR 재배포가 34초입니다.
iOS XCFramework 는 시뮬레이터와 기기 두 슬라이스를 각각 아카이브하므로 몇 분 단위입니다.

**디버깅 경로가 길어집니다.** 앱 팀은 SDK 안을 못 봅니다. 크래시 스택이 난독화된
프레임워크 안에서 끊기므로, SDK 팀이 심볼과 소스맵을 같이 배포하고 매핑하는 절차를
따로 만들어야 합니다. 01 번에서는 그냥 소스로 들어가면 됐습니다.

**버전 스큐가 생깁니다.** 앱 v1 이 SDK v2 를 쓰는 조합이 실제로 존재하게 됩니다.
공개 API 를 바꿀 때 하위 호환을 지켜야 하고, 이건 한 저장소일 때 없던 제약입니다.

**소비 앱의 권한과 매니페스트가 조용히 늘어납니다.** 아래 절에 실측이 있습니다.
앱 팀이 선언하지 않은 `SYSTEM_ALERT_WINDOW` 가 붙습니다.

**iOS 는 산출물이 둘이라 배포 파이프라인이 복잡합니다.** Android 는 Maven 에 AAR 하나를
올리면 끝인데, iOS 는 두 xcframework 를 묶어 podspec 으로 배포해야 합니다.

**앱 크기는 안 줄어듭니다.** SDK 로 뺀다고 RN 이 작아지지 않습니다.
같은 몫이 그대로 소비 앱에 들어갑니다.

### 언제 이 방식이 맞나

맞는 경우입니다.

- RN 팀과 앱 팀이 조직적으로 분리돼 있고, 앱 팀에 RN 도구를 강요하기 어렵다
- 같은 RN 화면을 두 개 이상의 앱에 넣어야 한다
- RN 이 앱의 일부 기능이고, 매일 고치는 영역이 아니다
- 앱 빌드에서 RN 빌드 시간을 떼어내고 싶다

맞지 않는 경우입니다.

- 한 팀이 네이티브와 RN 을 같이 만든다. 얻는 게 거의 없고 개발 루프만 느려집니다
- RN 화면이 앱의 대부분이다. 그러면 브라운필드가 아니라 그린필드가 맞습니다
- JS 를 매일 고친다. 재배포 비용이 이득을 넘습니다
- 서드파티 RN 라이브러리를 자주 추가한다. autolinking 상실이 계속 발목을 잡습니다

**01 번과 02 번 중 하나를 고르는 문제가 아닙니다.** 시작은 01 번으로 하고,
앱 팀과 RN 팀이 갈라지는 시점에 02 번으로 옮기는 순서가 자연스럽습니다.
02 번의 공개 API 표면(`RnSdk` 파일 하나)을 01 번에서 미리 만들어 두면
그 이전이 쉬워집니다.

## 소비 앱에서 사라진 코드

01 번의 `HostApplication` 은 이랬습니다.

```kotlin
class HostApplication : Application(), ReactApplication {
    override val reactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getPackages() = PackageList(this@HostApplication).packages.apply { ... }
        override fun getJSMainModuleName() = "index"
        override fun getUseDeveloperSupport() = BuildConfig.DEBUG
        override val isNewArchEnabled = false
        override val isHermesEnabled = true
    }
    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, OpenSourceMergedSoMapping)
    }
}
```

02 번의 `ShopApplication` 은 이렇습니다.

```kotlin
class ShopApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        RnSdk.initialize(this, RnSdk.Config(appName = ..., appVersion = ...))
    }
}
```

부분 삽입도 같습니다. 01 번은 `onHostResume`, `onHostPause`, `onHostDestroy`,
`onBackPressed` 네 개를 손으로 연결해야 했습니다. 02 번은 이 한 줄입니다.

```kotlin
binding.rnContainer.addView(RnSdk.createSettingsView(this, userTier = "PRO"))
```

돌려주는 타입이 `ReactRootView` 가 아니라 `View` 입니다. 생명주기는 SDK 뷰가 부모의
`LifecycleOwner` 를 찾아 스스로 붙습니다. 빠뜨릴 수 있는 코드를 앱 팀에게 주지 않는 게
SDK 의 일입니다.

## SDK 를 만드는 쪽에 생기는 일

편해진 만큼 책임이 옮겨 왔습니다.

**`ReactApplication` 을 못 쓰게 됩니다.** RN 은 기본적으로
`((ReactApplication) activity.getApplication()).getReactNativeHost()` 로 host 를 찾습니다.
소비 앱의 Application 은 그 인터페이스를 구현하지 않으므로 그대로 두면
`ClassCastException` 입니다. `ReactActivityDelegate.getReactNativeHost()` 를
오버라이드해서 SDK 가 들고 있는 host 를 돌려줘야 합니다. RN 소스 주석이 이 경로를
정식 확장점으로 안내합니다.

**autolinking 이 없습니다.** `PackageList` 가 생성되지 않으므로
`MainReactPackage()` 를 직접 넣어야 합니다. 서드파티 RN 라이브러리를 추가할 때마다
그 라이브러리의 Package 도 SDK 안에서 손으로 등록해야 합니다.

**번들 자동화가 없습니다.** 01 번에서는 `react {}` 블록이 릴리스 빌드마다 번들을 뽑았습니다.
여기서는 `npm run bundle:android` 를 배포 전에 직접 돌려야 합니다.
빼먹으면 런타임에 흰 화면이 되므로, Gradle 에서 파일 존재를 검사해 빌드를 세웁니다.

**난독화 규칙을 SDK 가 밝혀야 합니다.** 소비 앱은 SDK 안에서 무엇이 리플렉션으로
쓰이는지 알 수 없습니다. `consumer-rules.pro` 에 넣으면 AAR 에 담겨 소비 앱의 R8 설정에
자동으로 합쳐집니다.

## 매니페스트가 조용히 늘어납니다

소비 앱은 권한을 하나도 선언하지 않았습니다. 그런데 병합 결과는 이렇습니다.

```
uses-permission android.permission.INTERNET
uses-permission android.permission.SYSTEM_ALERT_WINDOW
uses-permission com.example.shop.debug.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION
activity        com.facebook.react.devsupport.DevSettingsActivity
```

`INTERNET` 은 이 SDK 가 넣었습니다. `SYSTEM_ALERT_WINDOW`(다른 앱 위에 그리기)와
`DevSettingsActivity` 는 `react-android:0.76.9-debug` 가 넣습니다. 개발자 메뉴 오버레이용입니다.

편한 만큼 위험합니다. SDK 하나 넣었더니 소비 앱이 민감한 권한을 얻습니다.
앱 팀은 병합 결과를 확인하는 습관이 필요합니다.

```bash
app/build/outputs/logs/manifest-merger-debug-report.txt
```

## 실행

### SDK 빌드와 배포 (Android)

```bash
cd rn-sdk
npm install
npm run bundle:android          # 번들을 AAR 의 assets 로

cd android
./gradlew :rnsdk:publishToMavenLocal
```

`~/.m2/repository/com/example/rnsdk/rn-sdk/0.1.0/` 에 AAR 이 올라갑니다.
실제로는 이 자리에 사내 Nexus 나 Artifactory 가 들어갑니다.

### 소비 앱

```bash
cd consumer-android
./gradlew installDebug -PabiFilters=arm64-v8a
```

이 디렉토리에는 `node_modules` 도 Metro 설정도 없습니다.
`npm` 을 한 번도 부르지 않습니다.

### SDK 빌드와 배포 (iOS)

```bash
cd rn-sdk
npm run bundle:ios               # 번들을 ios/RnSdk/Resources 로

cd ios
ruby scripts/generate_project.rb # .xcodeproj 를 다시 만들 때만
pod install
./scripts/build_xcframework.sh   # dist/ 에 두 개의 xcframework
```

### 소비 앱 (iOS)

```bash
cd consumer-ios
ruby scripts/generate_xcodeproj.rb
pod install
open ShopApp.xcworkspace
```

## 측정

Pixel 9 에뮬레이터(API 36, arm64, RAM 4GB), 디버그 빌드.

| 항목 | 값 |
|---|---|
| AAR 크기 | 253 KB (JS 번들 914KB 포함 전) |
| 소비 앱 debug APK (arm64) | 36.6 MB |
| 소비 앱 콜드 스타트 | 380 ms |
| SDK 호출 → 첫 렌더 | 246 ms |
| 부분 삽입 화면 (인스턴스 재사용) | 마운트 카운터 이어짐 |
| `releaseMemory()` 후 재진입 | 313 ms (마운트 1 로 리셋) |

첫 렌더 246ms 가 01 번 릴리스의 188ms 보다 느린 건 디버그 빌드라서입니다.
같은 조건 비교는 아직 하지 않았습니다.

소비 앱 debug APK 가 36.6MB 인 이유는 Gradle 이 `react-android` 의 **debug 변종**을
가져오기 때문입니다. 그쪽 `libreactnative.so` 는 심볼이 안 벗겨져서 20.5MB 입니다.
릴리스 변종은 6.5MB 입니다.

## iOS: 산출물이 하나로 안 됩니다

Android 는 AAR 하나였습니다. iOS 는 둘입니다.

```
RnSdkKit.xcframework   25 MB   우리 Swift 코드 + React pod 40여 개를 정적으로 흡수한 동적 프레임워크
hermes.xcframework     35 MB   RN 이 미리 빌드해 배포하는 동적 프레임워크
```

hermes 를 흡수할 수 없는 이유는 이미 동적으로 배포되기 때문입니다.

```
Pods/hermes-engine/.../hermes.framework/hermes:
  Mach-O 64-bit dynamically linked shared library
```

정적 병합(`libtool`)은 `.a` 만 다룹니다. 그래서 소비 앱이 둘 다 embed 해야 하고,
podspec 이 그 둘을 함께 vendored_frameworks 로 묶습니다.
소비 앱 입장에서는 여전히 `pod 'RnSdk'` 한 줄이고 node_modules 도 없습니다.

### 만드는 과정에서 걸린 것

Android 는 한 번에 됐는데 iOS 는 여섯 번 막혔습니다. 전부 빌드나 설치나 런타임 중
서로 다른 단계에서 터졌고, 원인이 표면 메시지와 멀었습니다.

**프레임워크 타깃은 브리징 헤더를 못 씁니다.**
01 번에서 쓰던 방법이 그대로 막힙니다. `use_frameworks! :linkage => :static` 으로
React pod 을 모듈로 만들고 Swift 에서 `import React` 를 씁니다.

**`use_native_modules!` 가 실패합니다.**
RN CLI 가 저장소를 "앱"이라고 가정하고 `android/app/build.gradle` 을 찾습니다.
SDK 저장소는 `android/rnsdk` 라이브러리 모듈이라 파싱에 실패합니다.
서드파티가 없으므로 경로를 직접 주고 넘어갑니다.

**`ios/build` 를 지우면 안 됩니다.**
빌드 스크립트가 그 디렉토리를 청소했는데, 거기가 `pod install` 이 만든 codegen 산출물
(`build/generated/ios/FBReactNativeSpec`) 자리였습니다.

**`.swiftinterface` 로 내부 의존이 새어 나갑니다.**
`BUILD_LIBRARY_FOR_DISTRIBUTION` 이 만드는 텍스트 인터페이스에 `import React` 가
실려 나가고, React 모듈이 없는 소비 앱에서 `no such module 'React'` 로 깨집니다.
`@_implementationOnly import React` 로 숨깁니다. 공개 API 가 React 타입을 노출하지
않아야 쓸 수 있는 방법입니다.

**모듈 이름과 타입 이름이 같으면 안 됩니다.**
둘 다 `RnSdk` 였더니 인터페이스에서 `RnSdk.RnSdk.Config` 로 풀리며
`'RnSdk' is not a member type of class 'RnSdk.RnSdk'` 가 났습니다.
모듈을 `RnSdkKit` 으로 바꾸고 공개 클래스는 `RnSdk` 로 뒀습니다.

**프레임워크에 `Info.plist` 가 필요합니다.**
`GENERATE_INFOPLIST_FILE` 을 빠뜨렸더니 xcframework 는 만들어지고 앱 빌드도 되는데
**설치 단계**에서 거부됐습니다. 빌드가 아니라 설치에서 터져서 원인이 멀었습니다.

**리소스는 자동으로 안 담깁니다.**
Android 는 `src/main/assets` 에 파일만 두면 AAR 이 담아서 APK 로 병합합니다.
iOS 는 Resources 빌드 페이즈에 명시해야 합니다. 빠뜨리면 빌드도 설치도 되고
**런타임에** `main.jsbundle 을 찾지 못했습니다` 로 죽습니다.

이 목록이 이 실험의 결론입니다. SDK 로 빼는 난이도가 두 플랫폼에서 대칭이 아닙니다.

## 확인한 것

에뮬레이터에서 아래를 전부 눌러 봤습니다. 실기기에서는 돌려보지 않았습니다.

- 소비 앱 기동, SDK 화면 진입, initialProps 전달
- `getHostInfo` Promise 왕복. 소비 앱이 `initialize` 에서 넘긴 `appName` 이 RN 까지 도착
- 결과 반환 (`ADD_TO_CART`) 이 SDK 리스너를 거쳐 소비 앱으로
- 부분 삽입 뷰. `addView` 한 줄로 동작하고 인스턴스를 공유
- 네이티브 → RN 테마 이벤트
- `releaseMemory()` 로 인스턴스 파괴 후 재진입

iOS 는 시뮬레이터(iPhone 15, iOS 17.5)에서 여기까지 확인했습니다.

- `pod install` 이 의존성 1개로 끝남. node_modules 없이
- 소비 앱 빌드 성공. 소스에 `React` 도 `RCT` 도 등장하지 않음
- 앱에 `RnSdkKit.framework` 와 `hermes.framework` 두 개가 embed 됨
- 앱 실행 후 RN 브리지 생성 성공. JS 번들을 프레임워크 리소스에서 로드
  (`RnSdk.isRunning` 이 true, 화면에 "RN 인스턴스: 살아 있음")

iOS 는 화면을 눌러 가며 각 기능을 확인하지는 못했습니다. 시뮬레이터 창을
GUI 자동화로 잡지 못해서, 대신 `preloadOnInit` 을 켜고 브리지 생성과 번들 로드를
로그와 화면으로 확인했습니다. Android 는 전 경로를 눌러 봤습니다.

## 이 저장소에 넣지 않은 것

- 키스토어, provisioning profile, 인증서, 팀 ID
- `local.properties`, `.env`
- `rn-sdk/android/rnsdk/src/main/assets/index.android.bundle`
  산출물이라 커밋하지 않습니다. `npm run bundle:android` 로 만듭니다
