# 05. Re.Pack + Module Federation: host 와 feature 로 나누기

번들을 host(앱에 내장)와 feature(원격에서 다운로드)로 나누고, 에뮬레이터에서 실제로 무엇이 오가는지 측정한 실험입니다. feature 는 두 개(장바구니, 프로필)를 만들어 한 호스트가 여러 원격을 로드하는 것까지 확인했습니다.

03번에서 이 문제를 적어 뒀습니다. 화면 A 와 화면 B 를 별도 번들로 만들면 두 번들 각각에 프레임워크 JS 가 통째로 들어갑니다. 같은 것을 두 번 받고 두 번 파싱합니다. Module Federation 이 그 해법입니다. 호스트가 react 와 react-native 를 들고 있고, 원격 번들은 참조만 합니다.

Metro 로는 안 됩니다. Metro 에는 원격 코드 스플리팅이 없습니다. 그래서 번들러를 Rspack(Re.Pack 5)으로 바꿉니다. 네이티브 쪽(브라운필드 통합 구조)은 01번과 같고, 바뀌는 것은 JS 빌드 파이프라인뿐입니다.

## 검증된 것

Pixel 9 에뮬레이터(arm64), dev=false 번들 기준입니다. 서버가 로컬이라 네트워크 시간이 거의 0 인 조건이고, 실서비스에서는 CDN 왕복이 더해집니다.

| 항목 | 결과 |
|---|---|
| 호스트 내장 번들 | 934,280 bytes |
| 장바구니 피처 | 컨테이너 152,315 + 화면 청크 3,173 bytes |
| 프로필 피처 | 컨테이너 152,894 + 화면 청크 3,459 bytes |
| 첫 탭에서 다운로드 | 피처당 2건이 전부. react-native 재다운로드 없음 |
| 탭 → 원격 화면 마운트 | 첫 피처 87~192ms, 두 번째 피처 71ms |
| 두 번째 탭 | 4ms, 네트워크 요청 0건 |
| 두 피처 동시 표시 | 한 화면에 두 원격이 같이 렌더, 원격 코드의 useState 정상 동작 |
| 피처만 재배포 | 피처 재빌드 + 앱 재시작만으로 반영. APK 재설치 없음 |
| 서버 죽은 상태에서 탭 | 크래시 없이 에러 UI + 다시 시도 버튼 |
| 서버 복구 후 다시 시도 | 재다운로드 2건, 87ms 에 마운트 |

두 번째 피처(71ms)가 첫 피처(192ms)보다 빨리 뜨는 이유는 공유 스코프 협상이 첫 로드에서 이미 끝나 있기 때문입니다. 원격 코드 안의 useState 가 정상 동작한다는 것은 React 인스턴스가 하나뿐이라는 증거입니다. 두 벌이면 "Invalid hook call" 로 깨집니다.

iOS 도 같은 구조로 검증했습니다. iPhone 15 시뮬레이터에서 두 피처가 `/ios/` 경로의 산출물 4건(장바구니 152,311 + 3,166, 프로필 152,890 + 3,455 bytes)만 받아 렌더됐고, 탭 대신 initialProps 의 autoOpen 으로 구동해 장바구니 67ms, 프로필 48ms 에 마운트됐습니다. 시뮬레이터는 실기기와 하드웨어가 달라 이 수치는 부정확하며 경향만 봐야 합니다. JS 쪽 차이는 주소 하나(Android 에뮬레이터 10.0.2.2, iOS 시뮬레이터 localhost)와 산출물 경로 세그먼트뿐이고, 네이티브 쪽은 01 번과 같은 RCTRootView 통합에 ATS 로컬 네트워크 예외(NSAllowsLocalNetworking)만 추가됩니다. Re.Pack 의 ScriptManager 가 네이티브 모듈(callstack-repack pod)이라 iOS 에서도 autolinking 이 필요하다는 점은 같습니다.

"react-native 를 안 받는다"는 주장은 번들 크기만 봐서는 증명이 안 됩니다. 빌드하면 폴백용 vendors 청크(react-native 조각들)가 같이 생기기 때문입니다. 그래서 서버(`server/server.js`)가 요청을 전부 기록하게 만들고, 런타임에 실제로 내려간 목록으로 확인했습니다. 폴백 청크는 한 번도 요청되지 않았습니다.

공유가 깨진 상태와의 대비도 숫자로 남깁니다. Re.Pack 의 MF2 플러그인 기본값(`eager: true`)으로 피처를 빌드하면 컨테이너가 842,774 bytes 가 되고 그 안에 AppRegistry 와 StyleSheet 까지 들어갑니다. `eager: false` 로 바꾸면 152,315 bytes 로 줄고 react-native 심볼이 사라집니다. 피처 화면 코드 자체는 3KB 라는 것까지 보면, 나머지 149KB 는 federation 런타임과 공유 협상 코드의 몫입니다.

## 구조

```
05-repack-federation/
├─ host/           # RN 런타임 + 공유 의존성 + 셸 화면. 앱에 내장
│  ├─ rspack.config.mjs      # ModuleFederationPluginV2, remotes 등록
│  └─ src/
│     ├─ HostScreen.js       # FEATURES 목록과 import() 경계
│     ├─ scriptManager.js    # 조각을 어디서 받을지 답하는 곳
│     └─ mfFallbackPlugin.js # 원격 로드 실패를 크래시 대신 값으로
├─ feature-cart/    # 원격 피처 1. exposes 로 화면을 내놓음
├─ feature-profile/ # 원격 피처 2. 다른 팀이 만든다고 가정한 화면
├─ server/          # 정적 서버 + 요청 로그(측정 도구). 플랫폼별 산출물 서빙
├─ android/         # 소비 앱. 번들 생성은 Gradle 에 안 맡김
└─ ios/             # 소비 앱. RCTRootView + autoOpen initialProps
```

피처를 하나 추가하는 비용은 이렇습니다. 피처 쪽은 feature-cart 를 복사해 rspack 설정의 name, filename, exposes 세 값을 바꾸는 게 전부입니다. 호스트 쪽은 remotes 에 주소 한 줄, HostScreen 의 FEATURES 목록에 항목 하나, scriptManager 의 컨테이너 목록에 이름 하나. 서버(CDN 역할)는 이름 → 디렉토리 매핑 한 줄입니다. 호스트를 재배포해야 하는 변경은 remotes 와 FEATURES 뿐이고, 피처 내용의 변경은 피처 재빌드로 끝납니다.

주의할 이름 규칙이 하나 있습니다. 피처의 package.json name 에서 webpack 전역 변수(webpackChunkfeature_cart 같은)가 나오므로, 피처끼리 package.json name 이 겹치면 한 호스트 안에서 전역이 충돌합니다.

### host 와 feature 에 각각 무엇이 있나

설정은 같은 플러그인의 반대 방향 선언입니다. host 는 "가져다 쓰는 쪽"이라 `remotes`(어떤 원격이 어디 있나)를 선언하고 react 를 eager 로 소유합니다. feature 는 "내놓는 쪽"이라 `exposes`(공개할 모듈)와 `filename`(컨테이너 이름)을 선언하고 shared 를 `eager: false` 로 두어 호스트 것을 빌립니다. 이 eager 방향이 반대라는 게 두 설정의 본질적 차이입니다.

코드도 역할대로 갈립니다. host 에만 있는 것: `AppRegistry.registerComponent` 진입점(앱은 host 만 앱입니다), 다운로드 주소를 정하는 scriptManager 리졸버, 실패를 크래시 대신 값으로 바꾸는 폴백 플러그인, `import()` 경계를 쥔 셸 화면. feature 에만 있는 것: 화면 컴포넌트와 버전 문자열, 그리고 CLI 형식 요구용 빈 엔트리. feature 에는 AppRegistry 가 없습니다. 앱이 아니라 모듈이기 때문입니다.

배포 경로가 갈리는 것이 이 구조의 목적입니다.

| | host | feature |
|---|---|---|
| 산출물 | 번들 하나 (934KB, RN 런타임 포함) | 컨테이너 152KB + 청크 3KB |
| 위치 | APK/IPA 에 내장 | 서버에만 존재 |
| 배포 방법 | 앱 스토어 릴리스 | 서버 파일 교체 |
| 로드 시점 | 앱 시작 시 | 해당 화면 진입 시 |

앱이 켜지면 호스트 번들만 파싱합니다. "장바구니 열기"를 누르는 순간 `import()` 가 실행되고, 컨테이너를 받아 초기화하면서 공유 스코프로 호스트의 react 를 넘겨주고, 화면 청크를 받아 렌더합니다. React 인스턴스가 하나라는 게 중요합니다. 두 벌이 로드되면 훅이 깨지고, RN 은 네이티브 모듈 레지스트리가 런타임 하나를 전제하기 때문에 웹보다 더 심하게 깨집니다.

## Re.Pack 을 쓰는 데 필요한 것

- 의존성: `@callstack/repack`, `@rspack/core`, `@module-federation/enhanced`, 그리고 `@swc/helpers`. 마지막 것은 문서에 잘 안 보이는데 없으면 트랜스파일된 코드가 참조하는 헬퍼가 없다며 수백 개 에러가 납니다.
- `react-native.config.js` 에 명령 등록. `const commands = require('@callstack/repack/commands/rspack'); module.exports = { commands };` 이 파일이 없으면 `react-native bundle` 이 Metro 로 돌아갑니다. 에러도 안 나면서 Module Federation 설정만 통째로 무시되므로, 산출물이 이상할 때 가장 먼저 의심할 지점입니다.
- `rspack.config.mjs`. Metro 설정과 달리 webpack 계열 설정입니다. `Repack.getResolveOptions`, `getJsTransformRules`, `RepackPlugin` 이 RN 특유의 처리(플랫폼별 확장자, Flow 타입 제거, 에셋)를 담당합니다.
- 네이티브 쪽은 그대로. autolinking 도 그대로 씁니다. Re.Pack 의 ScriptManager 가 네이티브 모듈이라 autolinking 이 오히려 필요합니다.
- Android 프로젝트 루트에서 node 를 실행할 수 있어야 합니다. Re.Pack 의 gradle 스크립트가 `node --print require.resolve('react-native/package.json')` 을 프로젝트 루트에서 돌립니다. JS 폴더와 android 폴더를 분리해 뒀다면 android 루트에 node_modules 심링크가 필요합니다. 여기서는 `android/node_modules -> ../host/node_modules` 로 해결했습니다.

## Re.Pack 을 쓰면서 알아야 하는 것

전부 이 실험에서 직접 부딪힌 것들입니다.

**빌드 단계**

- 원격(피처) 쪽 shared 는 반드시 `eager: false` 로 명시해야 합니다. 플러그인 기본값은 호스트에 맞는 `eager: true` 라서, 그대로 두면 피처 번들에 react-native 가 통째로 들어갑니다(842KB). 기본값이 역할에 따라 달라져야 한다는 걸 플러그인이 모릅니다.
- 컨테이너 파일명(`filename`)을 CLI 가 강제하는 엔트리 번들 이름과 다르게 잡아야 합니다. 같으면 "Multiple assets emit different content to the same filename" 충돌이 납니다. 피처는 엔트리가 필요 없는데 CLI 가 요구하므로 빈 파일을 엔트리로 넘깁니다.
- 산출물 위치가 흩어집니다. `--bundle-output` 경로에는 엔트리 번들만 놓이고, 컨테이너, 청크, mf-manifest.json 은 `--assets-dest` 아래 `generated/<platform>/` 에 놓입니다. 서빙할 때 필요한 것은 후자입니다.
- `react {}` gradle 블록의 `bundleInDebug` / `bundleInRelease` 는 RN 0.71 에서 사라진 속성입니다. 옛 문서를 보고 쓰면 "Could not set unknown property" 로 빌드가 죽습니다. 지금은 `bundleCommand`(기본값 "bundle" 이 Re.Pack 명령으로 연결됨)와 `debuggableVariants`(기본값 ["debug"], 디버그 빌드는 번들 생성 생략)로 제어합니다.

**런타임**

- 원격 주소는 mf-manifest.json 대신 컨테이너 번들을 직접 가리키는 게 낫습니다. 요청이 한 건 줄고, 무엇보다 매니페스트 fetch 실패가 `import()` 의 promise 체인 밖에서 터져서 릴리스 빌드에서는 그대로 앱 크래시가 됩니다. try/catch 로 못 잡는 위치입니다.
- 컨테이너 직접 지정이어도 로드 실패는 크래시입니다. `errorLoadRemote` 런타임 플러그인으로 실패를 가로채 값을 돌려줘야 합니다. 이때 돌려주는 객체에 `__esModule: true` 를 넣지 않으면 ESM interop 이 `{ default: 값 }` 으로 한 겹 감싸서, 받는 쪽의 실패 검사가 뚫리고 "Element type is invalid" 로 화면 전체가 내려갑니다.
- 폴백으로 돌려준 값은 federation 런타임이 정상 모듈로 캐시합니다. 서버가 살아난 뒤 다시 `import()` 해도 네트워크 대신 캐시된 실패가 옵니다. `moduleCache` 삭제와 `registerRemotes({ force: true })` 로도 안 비워졌습니다(5.3.0 기준). 여기서는 재시도 경로가 런타임을 우회해 컨테이너 프로토콜을 직접 밟습니다. `ScriptManager.loadScript` 로 컨테이너를 받고, `container.init(공유 스코프)`, `container.get('./CartScreen')` 순서입니다. import() 한 줄이 내부에서 하는 일이 정확히 이 세 단계라서, 우회 코드가 곧 동작 원리 설명이 됩니다.
- `ScriptManager.loadScript` 를 직접 부르면 Re.Pack 내장 리졸버가 "Reference URL is missing" 을 던집니다. 내장 리졸버는 import() 경로가 주는 문맥을 전제하기 때문입니다. 커스텀 리졸버를 `priority` 를 높여 등록하면 먼저 URL 을 돌려주고 체인이 거기서 끝나므로 문제가 안 됩니다.
- `Script.getRemoteURL(url)` 은 URL 을 그대로 쓰지 않고 webpack 컨텍스트의 확장자 규칙을 덧붙입니다. 완성된 URL 을 넘긴다면 `{ excludeExtension: true }` 가 필요합니다.
- React.lazy + Suspense 대신 import() 의 promise 를 직접 다루는 게 낫습니다. 원격 로드는 실패가 정상 경로의 일부라 상태 기계(idle → loading → ready | error)로 두는 쪽이 실패 처리와 재시도가 단순해지고, 탭 → 모듈 평가와 탭 → 마운트를 나눠 재는 것도 promise 를 손에 쥐고 있어야 가능합니다.

**개발 환경**

- 번들 서버는 `0.0.0.0` 에 명시적으로 바인딩해야 합니다. Node 기본값(IPv6 와일드카드)으로 두면 에뮬레이터의 10.0.2.2 NAT 가 IPv4 로 붙는 환경에서 연결이 조용히 실패합니다.
- Metro 가 아니므로 watchman 상태와 무관하게 돌아갑니다. 이 프로젝트에서는 watchman 이 깨진 환경이라 이 점이 실제로 편했습니다.

## 실패 처리가 왜 이 실험의 절반인가

번들이 하나일 때는 "화면이 안 뜬다"가 버그였습니다. 원격으로 쪼개는 순간 그것은 네트워크가 끊기면 언제든 일어나는 정상 경로가 됩니다. 그래서 이 실험은 성공 경로만큼 실패 경로를 검증했습니다. 서버를 내리고 탭 → 크래시 없이 에러 UI(FATAL 0건 확인), 서버를 올리고 다시 시도 → 컨테이너부터 재다운로드해 87ms 에 마운트. 폴백 플러그인, 실패 마커, 컨테이너 프로토콜 재시도가 그 결과물입니다.

같은 자리에 무결성 검증도 붙습니다. 원격 번들은 앱 서명 바깥에서 오는 코드라서, 실서비스라면 Re.Pack 의 CodeSigningPlugin 으로 번들 서명을 검증해야 합니다. 07번에서 다룹니다.

## Re.Pack 이 아니라면

host / feature 분리가 목표일 때 검토할 수 있는 다른 길들입니다.

- Metro 단독: 원격 코드 스플리팅이 없습니다. inline requires 와 RAM bundle 은 파싱을 미룰 뿐 다운로드를 나누지 못합니다. 후보가 아닙니다.
- CodePush, Expo Updates: 번들 전체를 통으로 교체하는 OTA 입니다. 배포 주기 분리는 되지만 host / feature 로 나뉘지는 않습니다. 전체 번들이 커지는 문제와 "피처 팀이 독립적으로 배포"가 안 되는 문제가 남습니다.
- 화면마다 번들 + RN 인스턴스 분리(01~03의 구조를 확장): 나눠지긴 하는데 03에서 측정한 그 문제, 번들마다 프레임워크 700KB 중복이 그대로입니다. 화면 간 상태 공유도 네이티브를 거쳐야 합니다.
- Toss granite: Re.Pack 처럼 직접 조립하는 대신 esbuild 기반 자체 번들러(mpack)와 CLI 로 이 구조를 만들어 주는 프레임워크입니다. 06번에서 별도로 적용해 보고, 직접 만든 이번 구조와 무엇이 다른지 비교합니다.

정리하면 RN 에서 이 구조를 만드는 실질적 선택지는 Re.Pack + Module Federation 직접 조립과 granite 류 프레임워크 둘입니다. 이 실험이 전자고, 후자가 06번입니다.

## 재현 방법

```bash
# 1. 의존성
cd host && npm install
cd ../feature-cart && npm install

# 2. 피처 번들 (컨테이너 + 청크가 각 build/generated/android/ 에 생김)
cd feature-cart && npm run bundle:android
cd ../feature-profile && npm run bundle:android

# 3. 호스트 번들 → 앱 assets 로 복사
cd ../host && npm run bundle:android
cp build/index.android.bundle ../android/app/src/main/assets/

# 4. 번들 서버
node ../server/server.js   # 4100 포트, 요청 로그가 측정 도구

# 5. 앱 설치 후 "장바구니 열기" 탭
cd ../android && ./gradlew installDebug -PabiFilters=arm64-v8a

# 6. 실제로 뭘 받아갔는지
curl localhost:4100/__log

# iOS: 피처와 호스트를 ios 로도 번들 → 앱 리소스로 복사 → 빌드
#   (앱이 autoOpen 으로 알아서 두 피처를 엽니다)
cd feature-cart && npm run bundle:ios
cd ../feature-profile && npm run bundle:ios
cd ../host && npm run bundle:ios && cp build/main.jsbundle ../ios/main.jsbundle
cd ../ios && ruby scripts/generate_xcodeproj.rb && pod install
xcodebuild -workspace MfHost.xcworkspace -scheme MfHost -sdk iphonesimulator build
```

## 한계

- 수치는 전부 에뮬레이터와 시뮬레이터 것입니다. 특히 iOS 시뮬레이터는 실기기와 하드웨어가 달라 절대값이 부정확합니다.
- 서버가 로컬이라 다운로드 시간이 실서비스보다 낙관적입니다. 87~136ms 라는 숫자는 "파싱과 초기화 비용"에 가깝고, 실제로는 CDN 왕복이 더해집니다.
- 캐시를 끄고 측정했습니다(`cache: false`). 실제 앱에서는 켜야 하고, 켜면 두 번째 실행부터는 첫 탭도 네트워크를 안 탑니다.
- 두 피처가 공유 의존성을 같은 버전으로 씁니다. 버전이 어긋날 때(피처 A 는 lib@1, B 는 lib@2)의 공유 스코프 충돌은 다루지 않았습니다.
