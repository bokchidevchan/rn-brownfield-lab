# RN 브라운필드 통합, 무엇이 어떻게 돌아가는가

`experiments/01-brownfield` 예제를 기준으로 설명합니다.
개념 설명마다 저장소 안에서 직접 확인하는 방법을 붙였습니다.

기준: RN 0.76.9, Old Architecture, Hermes, Kotlin/Swift 호스트
작성일: 2026-08-08

수치는 전부 이 저장소를 직접 빌드해서 측정한 값입니다.
측정 조건은 Pixel 9 에뮬레이터(API 36, arm64), 호스트는 Apple Silicon 맥입니다.

---

## 1. 실행 모델

### 1-1. 바이트코드와 네이티브 바이너리는 다릅니다

네이티브 바이너리는 CPU 가 직접 실행하는 기계어입니다. ISA 에 묶여 있어서 플랫폼마다
따로 빌드해야 합니다.

바이트코드는 가상 머신이 실행하는 중간 형태입니다. DEX(ART), HBC(Hermes),
JVM `.class`, `.pyc` 가 여기 속합니다. CPU 종류와 무관한 대신 VM 이 한 겹 낍니다.

용어에 함정이 하나 있습니다. "바이너리"는 넓게 쓰면 "텍스트가 아닌 파일" 전부를 가리킵니다.
그 뜻이면 `.class` 도 바이너리입니다. 정확히 대비하려면 "네이티브 바이너리 vs 바이트코드"
라고 써야 합니다.

RN 앱 APK 한 장에 두 종류가 다 들어 있습니다.

```
classes.dex                     DEX 바이트코드    (ART 가 실행)
assets/index.android.bundle     HBC 바이트코드    (Hermes 가 실행)
lib/arm64-v8a/libreactnative.so 네이티브 바이너리  (CPU 가 직접 실행)
lib/arm64-v8a/libhermes.so      네이티브 바이너리  (= Hermes VM 본체)
```

Hermes VM 자체는 네이티브 바이너리이고, 그것이 실행하는 대상이 바이트코드입니다.
이 계층 관계를 놓치면 계속 헷갈립니다.

### 1-2. Hermes 는 두 개의 다른 물건입니다

이름이 같아서 가장 많이 헷갈리는 부분입니다.

```
hermesc                            libhermes.so
= 컴파일러                          = 엔진(VM)
= node_modules 안의 macOS 실행파일   = APK 안의 arm64 공유 라이브러리
= 빌드할 때 내 맥에서 한 번 돎        = 사용자 폰에서 앱 켤 때마다 돎
= 앱에 안 들어감                     = 2.27MB 로 들어감
```

APK 의 `index.android.bundle` 은 `hermesc` 의 출력물입니다. Gradle 이 빌드 중에 대신
실행해 줄 뿐입니다. 손으로 돌려도 같은 결과가 나옵니다.

```bash
node_modules/react-native/sdks/hermesc/osx-bin/hermesc \
  -emit-binary -out out.hbc bundle.js

# out.hbc              : c6 1f bc 03 c1 03 19 1f ...
# APK 안 index.android.bundle : c6 1f bc 03 c1 03 19 1f ...
#                        └──────┬──────┘
#                        Hermes 바이트코드 매직 넘버
```

그래서 `hermesEnabled` 는 엔진을 쓸지 말지가 아니라 **어느 엔진을 쓸지** 고르는 값입니다.
JS 엔진 없이는 앱이 돌지 않습니다.

같은 앱을 arm64 릴리스로 두 번 빌드해 비교했습니다.

| | Hermes | JSC |
|---|---|---|
| 빌드할 때 | `hermesc` 가 바이트코드 생성 | 아무것도 안 함 |
| APK 안 번들 | 814 KB, 바이트코드 | 915 KB, JS 텍스트 |
| 엔진 `.so` | libhermes 2.27 MB | libjsc 5.82 MB |
| APK 전체 | 18.4 MB | 21.7 MB |
| 앱 켤 때 | 바이트코드 바로 실행 | 텍스트 파싱하고 컴파일 |
| 콜드 스타트 | 390 / 239 / 175 ms | 413 / 486 / 218 ms |

Hermes 가 빠른 이유는 파싱과 컴파일을 빌드 머신에서 미리 해두기 때문입니다.
폰이 할 일을 개발자 맥으로 옮긴 것입니다.

다만 이 측정에서는 시작 시간 차이가 나오지 않았습니다. 3회 측정이라 편차 안에 묻혔고,
호스트가 Apple Silicon 이라 파싱 비용이 저사양 기기만큼 드러나지 않은 것으로 보입니다.
Hermes 의 시작 시간 이점을 숫자로 보려면 저사양 실기기에서 재야 합니다.
크기 차이 3.3MB 는 조건과 무관하게 그대로입니다.

```bash
# 직접 비교하려면
./gradlew assembleRelease -PabiFilters=arm64-v8a
./gradlew assembleRelease -PabiFilters=arm64-v8a -PhermesEnabled=false
```

### 1-3. APK 디컴파일로 나오는 것

APK 는 zip 입니다. "디컴파일"이라 부르는 작업은 3단계가 겹쳐 있습니다.

1. **압축 해제.** `classes.dex`, `resources.arsc`(바이너리 XML), `lib/*.so`,
   `AndroidManifest.xml`, `META-INF`(서명)
2. **디스어셈블.** `apktool` 이 DEX 를 smali 로 바꿉니다. 리소스도 읽을 수 있는 XML 로 복원됩니다
3. **디컴파일.** `jadx` 가 smali 를 Java 비슷한 코드로 역변환합니다

원본 소스가 그대로 나오지는 않습니다. 주석, 지역 변수명, 제네릭 정보는 컴파일에서
이미 날아갔고, 릴리스 빌드는 R8 로 난독화돼 있습니다. Kotlin 도 DEX 를 거쳐 Java 스타일로
복원됩니다. 동작은 같지만 읽기 힘든 재구성 코드에 가깝습니다.

`.so` 는 이 도구로 안 됩니다. 네이티브 바이너리라 Ghidra 나 IDA 가 필요하고 복원 난이도가
훨씬 높습니다. 라이선스 검증 같은 걸 일부러 NDK 로 내리는 앱이 있는 이유입니다.

RN 앱에서 하나 더 알아둘 점이 있습니다. HBC 번들은 jadx 로 안 열립니다.
반대로 JSC 빌드는 번들이 JS 텍스트 그대로라 zip 만 풀면 소스가 읽힙니다.
난독화 목적이라면 이것도 Hermes 를 고르는 이유가 됩니다.

### 1-4. JS 엔진이 앱을 실행하는 게 아닙니다

흔한 오해입니다. JS 엔진이 돌리는 건 로직과 "무엇을 그릴지에 대한 기술(description)"뿐이고,
화면에 올라가는 건 진짜 `UIView` 와 `android.view.View` 입니다.

```
JS 컴포넌트 트리 → Yoga 레이아웃 계산 → 네이티브 뷰 생성과 업데이트
```

Layout Inspector 로 RN 화면을 열면 WebView 가 아니라 네이티브 뷰 계층이 그대로 보입니다.
`<View>` 는 `ViewGroup` 이 되고 `<Text>` 는 `TextView` 가 됩니다.

두 플랫폼이 정확히 같은 지점으로 수렴합니다.

```java
// ReactRootView.java:684
catalystInstance.getJSModule(AppRegistry.class).runApplication(jsAppModuleName, appParams);
```
```objc
// RCTRootView.m:290
[bridge enqueueJSCall:@"AppRegistry" method:@"runApplication"
                 args:@[ moduleName, appParameters ] completion:NULL];
```

Kotlin 의 `Bundle` 도 Swift 의 딕셔너리도 같은 JSON 이 되어
`AppRegistry.runApplication(moduleName, {rootTag, initialProps})` 하나로 들어갑니다.
두 플랫폼에서 같은 화면을 띄울 수 있는 이유가 이 한 줄입니다.

`rootTag` 는 "이 컴포넌트 트리가 붙을 네이티브 뷰의 ID" 입니다. 그냥 정수 하나입니다.
부분 삽입이 가능한 이유가 여기 있습니다. RN 은 화면 전체를 가질 필요가 없습니다.

### 1-5. 스레드 세 개

```
UI(main)   │ native_modules  │ js
Activity   │ 네이티브 모듈     │ Hermes VM
뷰 생성     │ Yoga 레이아웃    │ React 렌더
```

`ReactQueueConfigurationSpec` 에 그대로 나옵니다.

```java
MessageQueueThreadSpec.newBackgroundThreadSpec("native_modules"),
MessageQueueThreadSpec.newBackgroundThreadSpec("js")
```

JS 는 UI 스레드에서 돌지 않습니다. JS 무한루프가 네이티브 화면을 멈추지 못하고,
반대로 JS 가 뷰를 동기로 읽을 방법도 없습니다.
Old Architecture 에서 `measure()` 가 콜백인 이유입니다.

---

## 2. 브리지

### 2-1. 직접 관찰하는 법

말로 읽는 것보다 이게 빠릅니다. `index.js` 맨 위에 두 줄 넣고 버튼을 누르면 됩니다.

```js
import MessageQueue from 'react-native/Libraries/BatchedBridge/MessageQueue';
MessageQueue.spy(true);
```

Metro 콘솔에 `[moduleIDs[], methodIDs[], params[][], callID]` 가 찍힙니다.
두 가지가 보입니다. 호출이 하나씩 안 가고 프레임 단위로 묶여 가는 것(배칭),
그리고 모든 인자가 JSON 인 것. 이 둘이 브리지의 성격입니다.

### 2-2. 네이티브 모듈이 JS 에 보이게 되는 과정

번들을 실행하기 전에 네이티브가 등록된 모듈 목록을 전역에 심습니다.

```
global.__fbBatchedBridgeConfig.remoteModuleConfig
  = [..., ["HostBridge", null,
           ["closeScreen","finishWithResult","getHostInfo","addListener","removeListeners"],
           [2], []]]
    //      이름        상수  메서드 이름 배열                                    ↑
    //                                                        2번은 Promise 라는 표시
```

`NativeModules.js:183` 이 이걸 읽어서 프록시를 만듭니다.
`NativeModules.HostBridge` 는 Kotlin/Swift 객체가 아니라 `moduleID` 와 `methodID` 만
아는 껍데기 함수 묶음입니다. `closeScreen()` 을 부르면 실제로 일어나는 일은
`enqueueNativeCall(moduleID, methodID, args)` 하나입니다.

Promise 메서드는 config 의 `[2]` 표시를 보고 JS 가 콜백 ID 두 개를 args 뒤에 붙여 보냅니다.
나중에 네이티브가 그 ID 로 되돌려 줍니다. `getHostInfo` 의 `promise.resolve(info)` 가
그 되돌림입니다.

### 2-3. 브리지가 남긴 비용과 New Architecture

| | Bridge (이 예제) | JSI (New Architecture) |
|---|---|---|
| 통신 | JSON 직렬화 후 큐 | C++ 객체 직접 참조 |
| 동기 호출 | 불가 | 가능 |
| 모듈 로딩 | 부팅 시 전체 config 주입 | 접근할 때 lazy |
| 렌더링 | UIManager 명령 큐 | C++ Shadow Tree 직접 조작 |

동기 호출이 가능해진 것과 공짜인 것은 다릅니다. UI 스레드에서 JS 를 부르면 JS 스레드의
락을 기다리게 되므로, 남용하면 브리지 시절보다 나쁜 프레임 드랍이 납니다.

---

## 3. 인스턴스 수명

실무에서 가장 많이 물리는 지점입니다.

### 3-1. "번들만 갈아끼우기"는 존재하지 않습니다

살아있는 JS VM 에 새 번들을 hot-swap 하는 API 가 없습니다.
새 번들 로드는 곧 **JS 컨텍스트 파괴와 재생성**입니다.

| | Old Architecture (이 예제) | New Architecture |
|---|---|---|
| 재생성 | `ReactInstanceManager.recreateReactContextInBackground()` | `ReactHost.reload(reason)` |
| 파괴 | `ReactInstanceManager.destroy()` | `ReactHost.destroy(reason, ex)` |

"단일 인스턴스를 하나 띄워두고 번들만 교체한다"는 계획은 이미 인스턴스를 죽였다 살리는
일입니다. 그래서 "언제 죽일 것인가"가 자동으로 설계 대상이 됩니다.

재생성 순간에 붙어 있던 루트 뷰가 detach 되고 JS 상태가 전부 날아갑니다.
브라운필드에서는 사용자가 마침 RN 화면을 보고 있으면 화면이 비어 버립니다.
그래서 OTA 는 보통 즉시 적용하지 않고 다음 콜드 스타트나 백그라운드 복귀 때 적용합니다.

프로세스를 죽일 일은 없습니다. 안드로이드에서 `System.exit()` 을 부르는 건 안티패턴입니다.

### 3-2. tearDown 이 필요해지는 경우

**메모리 압박.** RN 인스턴스는 JS 힙, 섀도우 트리, 이미지 캐시로 수십에서 수백 MB 를
잡습니다. RN 이 앱의 부가 기능이라면 `onTrimMemory` 와 `didReceiveMemoryWarning` 에서
놓아주는 게 맞습니다. 안 그러면 기존 앱 본체가 OOM 으로 죽고, 사용자 눈에는
"RN 붙이고 나서 앱이 죽는다"로 보입니다.

**로그아웃과 계정 전환.** JS 힙에 남은 토큰, 스토어 상태, 인메모리 캐시를 확실히 비우는
가장 안전한 방법이 인스턴스 파괴입니다. 계정 A 데이터가 B 세션에 새는 버그가 자주 납니다.

**JS 크래시 복구.** 네이티브는 멀쩡한데 RN 영역만 좀비가 된 상태입니다. 재생성이 유일한
복구 경로입니다.

### 3-3. tearDown 순서와 흔한 실수

RN 0.76 기준으로 정정할 것이 있습니다. 여기저기서 안내되는
`onCatalystInstanceDestroy()` 는 이미 제거 예정입니다.

```java
// NativeModule.java:60-63
/** @deprecated use {@link #invalidate()} instead. */
@Deprecated(since = "Use invalidate method instead", forRemoval = true)
default void onCatalystInstanceDestroy() {}
```

`invalidate()` 를 써야 합니다. iOS 도 `RCTBridge.reload` 가 deprecated 이고
`RCTReloadCommand` 로 옮겼습니다.

순서에서 주의할 세 가지입니다.

1. 루트 뷰가 화면에 붙어 있는 상태로 파괴하면 크래시합니다. detach 가 먼저입니다.
   이 예제의 `EmbeddedRnActivity.onDestroy()` 가 `unmountReactApplication()` 을
   먼저 부르는 이유입니다
2. tearDown 은 JS 스레드와 네이티브 모듈 스레드가 정리되는 비동기 과정입니다.
   곧바로 새 인스턴스를 만들면 레이스가 납니다
3. 네이티브 모듈이 기존 앱 싱글턴에 리스너를 걸어 뒀다면 `invalidate()` 에서 반드시
   해제해야 합니다. 빼먹으면 인스턴스를 죽여도 옛 인스턴스가 통째로 살아남고,
   재생성할 때마다 리스너가 쌓여 이벤트가 두 번, 세 번 발화합니다

이 예제의 현재 상태를 밝혀 둡니다. `HostBridgeModule` 은 외부 리스너를 등록하지 않아
누수가 없고, iOS `HostBridge` 는 `startObserving` 과 `stopObserving` 쌍으로 붙였다
뗍니다. 다만 `invalidate()` 는 구현해 두지 않았습니다. 리스너를 하나라도 추가하면
위 3번을 밟게 됩니다.

### 3-4. 이 예제로 확인해 보기

- 첫 화면에 "RN 인스턴스 재생성" 버튼을 붙이고
  `recreateReactContextInBackground()` 를 호출. 마운트 카운터가 1 로 돌아가는지
- 일부러 `invalidate()` 없이 리스너를 걸고 재생성 3회 뒤 이벤트가 몇 번 오는지
- 재생성 도중에 RN 화면으로 진입하면 어떻게 되는지
- `destroy()` 후 다음 진입 시간 측정. 188ms 로 돌아가야 정상입니다

---

## 4. OTA 와 스토어 정책

### 4-1. 왜 JS 는 되고 네이티브는 안 되나

애플 가이드라인 2.5.2 는 앱이 번들 안에서 자체 완결적이어야 하고, 기능을 추가하거나
변경하는 코드를 다운로드해 실행할 수 없다고 합니다. 그런데 개발자 계약에
인터프리티드 코드 예외가 있습니다. 조건은 네 개입니다.

1. Apple 의 WebKit 또는 JavaScriptCore 로 실행될 것
2. 앱의 주 목적을 바꾸지 않을 것
3. 다른 앱이나 코드를 파는 스토어를 만들지 않을 것
4. 코드 서명과 샌드박스 등 OS 보안 기능을 우회하지 않을 것

구글은 더 직설적입니다. Play 외부에서 실행 코드(dex, JAR, `.so`)를 받으면 안 되지만,
가상 머신이나 인터프리터에서 실행되어 Android API 에 간접 접근하는 코드는 예외입니다.

양쪽이 같은 선을 긋습니다. 네이티브 실행 코드는 안 되고 VM 위 코드는 됩니다.

DEX 도 바이트코드라 기술적으로는 대칭입니다. 안드로이드는 `DexClassLoader` 로 런타임
로딩이 실제로 가능하고 순전히 정책으로 막은 것입니다. iOS 는 코드 서명과 W^X 때문에
받아온 실행 페이지를 매핑하는 것 자체가 커널에서 막힙니다.
안드로이드는 정책, iOS 는 정책과 기술 둘 다입니다.

논리는 권한 범위입니다. JS 번들은 이미 심사받은 네이티브 모듈이 열어준 만큼만 할 수
있습니다. 새 모듈이 없으면 새 시스템 권한도 새 syscall 도 못 씁니다. 반면 새 `.so` 를
받아 실행하면 심사받은 적 없는 코드가 앱 권한 전부를 갖고 돕니다.
심사가 무의미해지는 지점이 거기입니다.

### 4-2. RN 에서 걸리는 제약

Hermes 바이트코드도 인터프리터가 실행하는 코드라 같은 예외에 들어갑니다.
Hermes 에 JIT 이 없는 것이 iOS 정책과 궁합이 맞는 이유이기도 합니다.

HBC 는 Hermes 런타임 버전과 강하게 결합됩니다. RN 이나 Hermes 버전을 올리면 기존
네이티브 바이너리가 새 번들을 못 읽어서 OTA 가 아니라 스토어 업데이트가 필요합니다.
Expo 의 `runtimeVersion` 이 이걸 관리하는 장치입니다.

네이티브가 바뀌면 무조건 스토어 업데이트입니다. 네이티브 모듈 추가, 권한 변경,
앱 아이콘과 이름, SDK 버전이 여기 해당합니다.

"주 목적 변경 금지"가 레드라인입니다. 심사 때 A 를 보여주고 통과 후 OTA 로 B 로 바꾸는
패턴은 리젝을 넘어 계정 정지 사유로 다뤄집니다.

### 4-3. 브라운필드 고유 문제: 버전 스큐

RN 화면만 OTA 로 바뀌고 네이티브 화면은 그대로 남습니다. 그래서 둘 사이 인터페이스,
즉 `HostBridge` 의 메서드 시그니처가 버전 스큐를 견뎌야 합니다.
JS 만 앞서 나가고 네이티브가 옛 버전인 조합이 실제 사용자 기기에 존재합니다.

`getHostInfo` 에 필드를 하나 추가했는데 옛 네이티브가 안 주는 상황을 JS 가 견뎌야 하고,
반대로 JS 가 새 메서드를 부르면 옛 네이티브에서는 `undefined is not a function` 이 됩니다.
그린필드에는 없는 문제입니다. 거기서는 JS 와 네이티브가 항상 같이 배포되니까요.

### 4-4. 도구 현황 (2026-08 기준)

Visual Studio App Center 가 2025-03-31 에 종료되면서 CodePush 호스팅도 같이 끝났습니다.
Microsoft 가 CodePush Server 소스를 공개했지만 이후 저장소를 아카이브해서, 지금은
커뮤니티가 유지하는 상태입니다.

선택지는 셋입니다.

1. **Expo EAS Update.** bare RN 에서도 `expo-updates` 로 씁니다.
   Expo SDK 55(2026-02)부터 Hermes 바이트코드 diffing 이 들어가 업데이트 크기가
   많이 줄었습니다. 단계적 롤아웃도 내장입니다
2. **CodePush 서버 자체 호스팅**
3. **토스 granite.** `docs/03-granite` 주제

---

## 5. 브라운필드 설계 문제

브리지는 사실 쉬운 쪽입니다. 이 예제를 실제로 띄우면서 나온 버그 4개 중 3개가
**소유권 경계** 문제였습니다.

| 경계 | 질문 | 이 예제가 택한 답 |
|---|---|---|
| safe area | 네이티브가 그리나 RN 이 그리나 | 네이티브. RN 은 안쪽만 |
| 생명주기 | 누가 attach 와 detach 를 책임지나 | 부분 삽입은 네이티브가 수동으로 |
| 이벤트 수신 | 받을 화면이 살아 있나 | 네이티브는 알 수 없음. 화면이 떠 있을 때만 유효 |
| 네비게이션 | 스택을 누가 쥐나 | 네이티브가 전부. RN 은 화면 한 장씩 |

네비게이션이 제일 위험합니다. RN 안에 react-navigation 을 넣으면 스택이 두 겹이 되고
뒤로가기 제스처가 꼬입니다. 이 예제는 그 상황을 피하는 쪽을 택했습니다.

남은 항목들입니다.

기존 네이티브 레이어(인증, 네트워크, DI)를 모듈로 감싸 JS 에 여는 설계가 통합 작업의
실제 분량 대부분을 차지합니다. `HostBridge` 가 커지는 속도가 곧 결합도입니다.
"화면을 닫는다", "결과를 돌려준다" 정도는 어쩔 수 없지만 비즈니스 로직이 넘어오기 시작하면
그 RN 화면을 다른 앱으로 옮길 수 없게 됩니다.

autolinking 은 서드파티를 하나 넣어봐야 제대로 보입니다. 이 예제는 서드파티가 없어서
`PackageList` 가 비어 있습니다.

빌드 충돌은 기존 앱이 이미 쓰는 `.so` 와 겹칠 때 납니다.
RN 0.76 이 개별 `.so` 수십 개를 `libreactnative.so` 하나로 합친 배경이기도 합니다.

---

## 6. 측정할 때 주의할 것

측정 방법이 결론을 바꾼 사례가 이 예제에서 나왔습니다.

`am start -W` 의 `TotalTime` 은 첫 프레임까지만 잽니다. 그래서 인스턴스 preload 를 켜도
콜드 스타트가 안 늘어난 것처럼 보입니다. `createReactContextInBackground()` 가
백그라운드 스레드로 돌기 때문입니다. 비용이 사라진 게 아니라 이 자로는 안 재집니다.

| 빌드 | preload | 콜드 스타트 | 첫 RN 진입 | 두 번째 진입 |
|---|---|---|---|---|
| debug (Metro) | false | 478 / 529 / 533 | 791ms | 52ms |
| debug (Metro) | true | 650 / 474 / 463 | 191ms | - |
| release (번들 내장) | false | 390 / 239 / 175 | 188ms | 55ms |

디버그 값은 Metro 를 끼고 있어서 그대로 쓸 수 없습니다. 릴리스와 콜드 스타트가 2배 넘게
차이 납니다.

첫 진입과 두 번째 진입의 차이(릴리스 188ms → 55ms)가 인스턴스 생성 비용입니다.
preload 를 켜면 첫 진입이 그만큼 당겨집니다. 이 비용을 앱 시작 때 낼 것이냐 화면 진입 때
낼 것이냐의 선택입니다.

위 숫자를 그대로 인용할 때 주의할 점이 셋 있습니다. 전부 에뮬레이터이고 호스트가
Apple Silicon 이라 실기기보다 낙관적입니다. 3회 측정은 편차를 걸러내지 못합니다.
그리고 여기서 말하는 "진입 시간"은 JS 컴포넌트의 첫 렌더까지이지,
사용자가 실제로 만질 수 있게 되는 시점이 아닙니다.

---

## 읽는 순서 제안

1. `MessageQueue.spy(true)` 를 켜고 버튼 눌러 보기. 30분이면 1장과 2장이 한 번에 잡힙니다
2. 인스턴스 재생성 실험(3-4). OTA 로 가려면 여기를 먼저 이해해야 합니다
3. 네비게이션 소유권. 5장에서 유일하게 답을 안 정한 항목입니다
4. `newArchEnabled=true` 로 바꾸고 2-3 표가 실제로 어떻게 바뀌는지

---

## 출처

- [Device and Network Abuse, Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/9888379)
- [CodePush is dead. The React Native OTA update alternatives that work.](https://rnrescue.dev/blog/react-native-codepush-alternatives)
- [Best CodePush Alternative for React Native 2026, React Native Stallion](https://stalliontech.io/react-native-codepush-alternative)
- RN 0.76.9 소스: `NativeModule.java`, `ReactInstanceManager.java`, `ReactHost.kt`,
  `ReactRootView.java`, `RCTRootView.m`, `NativeModules.js`, `ReactQueueConfigurationSpec.java`
