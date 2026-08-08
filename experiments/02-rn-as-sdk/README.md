# RN 을 SDK 로 빼기

01 번은 RN 과 네이티브 앱이 한 저장소에 같이 있었습니다.
여기서는 RN 부분을 배포 가능한 산출물로 빼고, 그걸 가져다 쓰는 앱을 따로 둡니다.

```
rn-sdk/            RN 팀이 소유. AAR 을 만들어 배포합니다
consumer-android/  RN 을 모르는 순수 Kotlin 앱. node_modules 가 없습니다
consumer-ios/      iOS 소비 앱
```

기준: RN 0.76.9, Old Architecture, Hermes
최종 확인일: 2026-08-08

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

### SDK 빌드와 배포

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

## 확인한 것

에뮬레이터에서 아래를 전부 눌러 봤습니다. 실기기에서는 돌려보지 않았습니다.

- 소비 앱 기동, SDK 화면 진입, initialProps 전달
- `getHostInfo` Promise 왕복. 소비 앱이 `initialize` 에서 넘긴 `appName` 이 RN 까지 도착
- 결과 반환 (`ADD_TO_CART`) 이 SDK 리스너를 거쳐 소비 앱으로
- 부분 삽입 뷰. `addView` 한 줄로 동작하고 인스턴스를 공유
- 네이티브 → RN 테마 이벤트
- `releaseMemory()` 로 인스턴스 파괴 후 재진입

## 이 저장소에 넣지 않은 것

- 키스토어, provisioning profile, 인증서, 팀 ID
- `local.properties`, `.env`
- `rn-sdk/android/rnsdk/src/main/assets/index.android.bundle`
  산출물이라 커밋하지 않습니다. `npm run bundle:android` 로 만듭니다
