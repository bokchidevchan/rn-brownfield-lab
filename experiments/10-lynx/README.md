# 10. Lynx: ByteDance 의 렌더링 프레임워크를 RN 과 비교

ByteDance 가 2025년 3월에 오픈소스로 낸 Lynx 를 실제로 돌려 보고, 08 번에서 만든 RN 앱과 같은 화면을 만들어 비교한 실험입니다.

09 번의 Stackflow 와는 층이 다릅니다. Stackflow 는 DOM 위에서 도는 웹 네비게이션 라이브러리라 RN 의 대체재가 아니었지만, Lynx 는 자체 렌더링 엔진과 자체 JS 엔진을 가진 프레임워크라 RN 과 같은 자리를 놓고 겨룹니다.

## 실측

Pixel 9 에뮬레이터, LynxExplorer 4.0.1, `@lynx-js/rspeedy` 0.16.3, `@lynx-js/react` 0.123.3 기준입니다.

같은 카운터 화면을 세 가지로 만들어 번들했습니다.

| | 번들 크기 | 빌드 시간 (콜드 3회) |
|---|---|---|
| RN + Metro | 905,528 bytes | 6.4~7.6초 |
| RN + Re.Pack(Rspack) | 836,382 bytes | 3.8~4.2초 |
| Lynx + Rspeedy | 90,588 bytes | 2.2~2.5초 |

번들이 열 배 차이 납니다. Lynx 번들 안에는 `AppRegistry`, `StyleSheet`, `__fbBatchedBridge` 가 하나도 없습니다. RN 은 프레임워크의 JS 계층이 번들에 통째로 들어가는데, Lynx 는 그 역할을 네이티브(Lynx 엔진)와 PrimJS 가 맡고 JS 번들에는 앱 코드와 ReactLynx(Preact 기반) 정도만 남습니다.

공짜는 아닙니다. 그만큼이 LynxExplorer 쪽으로 옮겨 간 것이고, 그 APK 는 154MB 입니다(디버그 심볼과 모든 확장 요소를 담은 개발용 셸이라 그렇습니다). 06 번의 granite 테스트 앱 169MB 와 같은 성격입니다. "번들이 작다"는 말은 언제나 "런타임을 누가 미리 들고 있다"와 짝입니다.

빌드는 Rspeedy 가 담당합니다. Rspack 과 Rsbuild 위에 얹은 Lynx 전용 빌드 도구라, 08 번에서 Re.Pack 이 Rspack 을 쓰는 것과 같은 계보입니다. HMR 은 코드를 고치면 0.3~1.1초에 다시 빌드되고 에뮬레이터 화면이 바로 바뀌었습니다.

## 코드가 어떻게 다른가

RN 을 쓰던 사람이 보면 비슷해 보이는데 세 군데가 다릅니다.

```tsx
// Lynx
<view className="Screen" bindtap={onTapArea}>
  <text className="Title">번들러 비교</text>
  <view className="Button" bindtap={onCount}>
    <text className="ButtonText">{`카운터 ${count}`}</text>
  </view>
</view>
```

**엘리먼트가 소문자 내장 태그입니다.** `view`, `text`, `image` 입니다. RN 의 `View`, `Text` 처럼 import 해서 쓰는 컴포넌트가 아니고, HTML 태그도 아닙니다.

**이벤트가 `bindtap` 입니다.** `onPress` 도 `onClick` 도 아닙니다.

**스타일이 진짜 CSS 파일입니다.** RN 의 `StyleSheet.create` 로 만드는 자바스크립트 객체가 아니라 `.css` 파일에 클래스 선택자를 씁니다. 웹 하던 사람에게는 이쪽이 익숙하고, 반대로 기존 RN 스타일 코드를 그대로 옮길 수는 없습니다.

여기까지는 문서에 있는 이야기이고, 직접 돌리면서 걸린 것도 있습니다. `<text>카운터 {count}</text>` 처럼 문자열과 숫자를 섞어 넣으면 숫자가 화면에 안 나옵니다. RN 에서는 되는 표현이라 그냥 썼다가 카운터가 안 보여서 한참 봤습니다. 템플릿 문자열로 하나의 문자열을 만들어 넘겨야 합니다.

## 이중 스레드가 코드에 드러납니다

Lynx 의 정체성이 가장 잘 보이는 부분입니다.

```tsx
const onCount = useCallback(() => {
  'background only'
  setCount(prev => prev + 1)
}, [])
```

`'background only'` 는 이 함수를 백그라운드 스레드에서 돌리라는 지시어입니다. Lynx 는 메인 스레드가 UI 를 그리고 백그라운드 스레드가 앱 로직을 돕니다.

RN 에도 UI 스레드와 JS 스레드 구분이 있지만 방향이 반대입니다. RN 은 JS 스레드가 기본이고 필요할 때 UI 스레드로 일을 보냅니다(Reanimated 의 worklet 이 그 예입니다). Lynx 는 이 지시어로 "이건 UI 를 막지 않아도 된다"를 표시합니다. 지시어를 지우면 메인 스레드에서 돕니다.

이 구조 덕분에 첫 프레임을 JS 없이 그릴 수 있다는 게 Lynx 가 내세우는 부분인데, 그 시작 시간 이득 자체는 이 실험에서 재지 않았습니다. 셸 앱 안에서 번들을 URL 로 여는 개발 흐름이라 콜드 스타트를 RN 앱과 같은 조건으로 맞출 수 없었습니다.

## 개발 흐름은 granite 와 닮았습니다

```bash
npm create rspeedy@latest      # 프로젝트 생성
npm run dev                    # 3001 포트, QR 코드 출력
# LynxExplorer 앱에서 번들 URL 을 입력하거나 QR 을 찍음
```

앱을 직접 빌드하지 않고 셸 앱(LynxExplorer)에 번들 주소를 넘기는 방식입니다. 06 번의 granite 테스트 앱과 구조가 같습니다. 셸이 런타임을 들고 있고 서비스는 번들만 배달하는 모델이라, 이 계열 프레임워크들이 비슷한 개발 경험으로 수렴한 것으로 보입니다.

에뮬레이터에서는 `adb reverse tcp:3001 tcp:3001` 을 해 두고 `http://localhost:3001/main.lynx.bundle?fullscreen=true` 를 입력창에 넣으면 됩니다. QR 코드는 실기기용입니다.

브라운필드 통합 경로도 문서에 있습니다(기존 네이티브 앱에 Lynx 를 UI 구성 요소로 넣는 가이드). 이 실험에서는 셸 앱까지만 확인했고 직접 통합해 보지는 않았습니다.

## 셋을 한자리에 놓으면

| | Stackflow (09) | Lynx (10) | React Native |
|---|---|---|---|
| 층 | 웹 네비게이션 라이브러리 | 렌더링 프레임워크 | 렌더링 프레임워크 |
| 그리는 것 | DOM (웹뷰 안) | Lynx 엔진의 네이티브 뷰 | 플랫폼 네이티브 뷰 |
| JS 엔진 | 웹뷰의 것 | PrimJS | Hermes (기본) |
| 스타일 | CSS | CSS | StyleSheet 객체 |
| 만든 곳 | 당근 | ByteDance | Meta |
| RN 과의 관계 | 대체재 아님. 웹뷰 쪽 개선 | 같은 자리의 경쟁자 | |

Stackflow 를 RN 과 비교하는 건 층이 어긋납니다. 웹뷰로 가기로 했다면 Stackflow 를 얹는 게 맞고, 네이티브 뷰로 그리기로 했다면 RN 이냐 Lynx 냐를 고르는 것입니다.

## 지금 Lynx 를 쓸 것인가

번들 크기와 빌드 속도는 실측으로 확인했고 인상적입니다. 그런데 브라운필드 관점에서 보면 판단이 달라집니다.

이 저장소의 01~07 번이 RN 을 기존 앱에 넣으면서 부딪힌 것들인데, 그 대부분은 프레임워크의 성능이 아니라 생태계와 도구에서 왔습니다. 서드파티 라이브러리, 네이티브 모듈 충돌, 버전별 진입점 변화, 배포 파이프라인 같은 것들입니다. Lynx 는 그 축에서 RN 보다 한참 젊습니다. TikTok 안에서는 대규모로 돌고 있지만 바깥의 라이브러리와 문서, 사례는 이제 쌓이는 중입니다.

기존 앱에 화면 몇 개를 붙이는 일이라면, 사례가 많고 막혔을 때 검색해서 나오는 쪽이 실제 비용을 줄입니다. 그게 이 저장소에서 RN 브라운필드에 리소스를 쏟으며 반복해서 확인한 것이기도 합니다. 반대로 새로 시작하는 앱이고 웹 개발자가 많고 시작 성능이 중요하다면 Lynx 를 재 볼 값어치가 있습니다.

## 재현 방법

```bash
cd lynx-app && npm install
npm run build          # dist/main.lynx.bundle
npm run dev            # 3001 포트

# 에뮬레이터
adb reverse tcp:3001 tcp:3001
# LynxExplorer 설치 (154MB, 저장 공간을 미리 비워 두세요)
adb install LynxExplorer-noasan-release.apk
# 앱의 Bundle URL 칸에 입력
#   http://localhost:3001/main.lynx.bundle?fullscreen=true
```

LynxExplorer 는 lynx-family/lynx 릴리스에서 받습니다. 저장소에는 넣지 않았습니다.

## 한계

- Android 에뮬레이터에서만 확인했습니다. iOS 시뮬레이터용 LynxExplorer 도 배포되지만 돌려 보지 않았습니다.
- 시작 시간과 스크롤 성능은 재지 않았습니다. 셸 앱 방식이라 RN 앱과 같은 조건의 콜드 스타트를 만들 수 없었습니다.
- 기존 네이티브 앱에 Lynx 를 직접 통합하는 브라운필드 경로는 문서 확인까지만 했습니다.
- 화면 하나짜리 비교입니다. 화면과 라이브러리가 늘었을 때 번들 격차가 어떻게 변하는지는 다른 문제입니다.
