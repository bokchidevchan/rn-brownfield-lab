# 09. Stackflow: 웹뷰 네비게이션을 직접 비교해 보기

03 번에서 웹뷰의 불편함으로 "화면을 오갈 때마다 서버를 다녀온다"와 "뒤로가기 스택이 두 개가 된다"를 꼽았습니다. 당근에서 만든 Stackflow 가 그 불편함을 어디까지 해결하는지, 그냥 React 로 만든 웹뷰와 무엇이 다른지 직접 눌러 보고 확인할 수 있게 만든 실험입니다.

화면 내용이 완전히 같은 세 벌을 준비했습니다. 다른 것은 화면을 옮기는 방식뿐입니다.

| | 방식 | 이게 흔한 경우 |
|---|---|---|
| plain MPA | URL 마다 문서를 다시 받음 | 서버 렌더링 웹을 웹뷰에 그대로 얹은 경우 |
| plain SPA | React 상태로 화면 교체 | 가장 흔하게 쓰는 방식 |
| Stackflow | 스택에 화면을 쌓음 | 당근이 만든 라이브러리 |

## 먼저 알아야 할 것: Stackflow 는 RN 의 대체재가 아닙니다

비교 대상이 아니라 층이 다릅니다. Stackflow 의 peer 의존성은 `react` 하나뿐이고, 기본 UI 패키지는 vanilla-extract 로 만든 CSS 를 씁니다. 즉 DOM 위에서 도는 웹 라이브러리입니다.

그래서 이 실험의 자리는 05 번(RN 을 host 와 feature 로 나누기) 옆이 아니라 03 번(웹뷰와 RN 비교)의 웹뷰 쪽입니다. "웹뷰를 쓰기로 했다면 이걸 얹으면 얼마나 나아지나"에 대한 답입니다.

## 실측 결과

Pixel 9 에뮬레이터, 09 번 전용 웹뷰 호스트 앱에서 확인했습니다.

| | 화면 이동 시 네트워크 | 돌아왔을 때 스크롤 | 전환 애니메이션 |
|---|---|---|---|
| plain MPA | 문서 554 bytes + 번들 147,799 bytes 재다운로드 | 처음으로 (0px) | 없음 |
| plain SPA | 0건 | 처음으로 (0px) | 없음 |
| Stackflow | 0건 | 유지됨 | cupertino 350ms |

스크롤 유지가 눈에 가장 잘 띕니다. 목록을 상품 26번 근처까지 내리고 상세로 들어갔다 돌아오면, Stackflow 는 그 자리로 돌아오고 plain SPA 는 상품 1번으로 돌아갑니다. 이전 화면을 unmount 하느냐 스택에 남겨 두느냐의 차이입니다.

plain SPA 도 네트워크는 안 탑니다. 그러니까 Stackflow 가 해결하는 건 네트워크가 아니라 그 위의 것들입니다. 화면 보존, 전환 애니메이션, 스와이프백, 그리고 History API 연동.

## 백 버튼은 라이브러리가 해결하지 못합니다

이게 이 실험에서 가장 중요한 발견입니다. 호스트 앱에 백 버튼을 웹뷰로 넘길지 말지를 토글로 두고 재 봤습니다.

| | 백 버튼 안 넘김 (기본) | 백 버튼 넘김 (`webView.goBack()`) |
|---|---|---|
| plain MPA | 화면 닫힘 | 이전 문서로. 번들 147,799 bytes 재다운로드 |
| plain SPA | 화면 닫힘 | 화면 닫힘 (히스토리 항목이 없음) |
| Stackflow | 스택 깊이 3에서도 화면 닫힘 | 스택 한 단계 pop |

Stackflow 를 붙여도 앱이 백 버튼을 넘겨주지 않으면 화면 세 개를 쌓아 놓고 한 번에 전부 닫힙니다. 웹 안에서 아무리 스택을 잘 만들어도 안드로이드 백 버튼은 앱의 것이기 때문입니다. 넘겨주는 코드는 다섯 줄이면 되지만, 그 다섯 줄을 아무도 안 짜면 사용자는 앱이 이상하다고 느낍니다.

```kotlin
onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
    override fun handleOnBackPressed() {
        if (webView.canGoBack()) { webView.goBack(); return }
        isEnabled = false
        onBackPressedDispatcher.onBackPressed()
    }
})
```

plain SPA 는 넘겨줘도 소용이 없습니다. 브라우저 히스토리에 아무것도 안 쌓았기 때문입니다. Stackflow 는 historySyncPlugin 이 스택을 History API 와 동기화해 두기 때문에 저 다섯 줄이 그대로 pop 이 됩니다. 라이브러리가 하는 일과 앱이 해야 하는 일이 여기서 갈립니다.

## 값

번들이 커집니다. 같은 화면인데 Stackflow 판은 239,428 bytes + CSS 19,608 bytes 이고 plain SPA 판은 147,675 bytes 입니다. 약 111KB 가 스택 관리, 전환 애니메이션, 스와이프백, 히스토리 동기화의 값입니다.

제스처 충돌도 생각해야 합니다. cupertino 테마의 스와이프백은 웹에서 구현한 제스처입니다. iOS 앱의 네이티브 가장자리 스와이프백과 겹치면 둘이 동시에 반응합니다. 웹뷰 화면에서 네이티브 스와이프백을 끄거나, 웹 쪽 스와이프백을 끄거나 하나는 골라야 합니다.

## 직접 해보기

```bash
cd web && npm install && npm run build
node server.js                 # 4300 포트

cd ../android
./gradlew installDebug

# 세 비교군을 골라서 띄웁니다. forwardBack 으로 백 버튼 전달 여부를 바꿉니다.
ADB=$HOME/Library/Android/sdk/platform-tools/adb
$ADB shell am start -n com.example.navlab.debug/com.example.navlab.MainActivity \
  --es url "http://10.0.2.2:4300/plain-spa/" --ez forwardBack false
```

`url` 을 `/plain-mpa/`, `/plain-spa/`, `/stackflow/` 로 바꿔 가며 봅니다. 주소를 안 주면 선택 화면이 뜹니다.

확인할 것 다섯 가지입니다.

1. 목록을 한참 내린 뒤 상품을 누르고 다시 뒤로 옵니다. 스크롤이 유지되나요?
2. 화면이 바뀔 때 애니메이션이 있나요, 툭 바뀌나요?
3. 상세 화면에서 왼쪽 가장자리를 오른쪽으로 미세요. 이전 화면이 따라오나요?
4. `curl localhost:4300/__log` 로 화면을 옮길 때 요청이 늘었는지 봅니다.
5. `forwardBack` 을 켜고 끄면서 백 버튼을 눌러 봅니다.

## 겪은 것

`useFlow` 는 `stackflow()` 의 반환값이 아니라 `@stackflow/react` 에서 직접 import 하는 API 입니다. 구버전 예제를 보고 `const { Stack, useFlow } = stackflow(...)` 로 쓰면 undefined 가 되고, 렌더 시점에 "is not a function" 으로 흰 화면이 됩니다. 에러 메시지가 미니파이된 변수명이라 원인을 찾기 어렵습니다.

`initialActivity` 를 config 에 두고 historySyncPlugin 을 같이 쓰면 플러그인이 덮어씁니다. 경고가 콘솔에만 나오므로 웹뷰에서는 안 보입니다.

그리고 03 번의 웹뷰 화면으로 이 데모를 열었더니 링크를 누르는 순간 외부 크롬으로 빠져나갔습니다. `WebViewClient` 를 안 달아서입니다. 03 번은 화면 하나를 띄워 시간만 재는 용도라 문제가 안 됐는데, 화면을 오가는 실험에서는 이게 없으면 실험 자체가 성립하지 않습니다. 그래서 09 번은 전용 호스트 앱을 따로 만들었습니다.

## 한계

- Android 에뮬레이터에서만 확인했습니다. iOS 는 WKWebView 라 스와이프백 충돌 양상이 다를 수 있는데 재현하지 않았습니다.
- 스크롤 성능(프레임 드랍)은 측정하지 않았습니다. 이 실험은 네비게이션 동작과 네트워크만 봅니다.
- Stackflow 의 플러그인 생태계(preload, devtools 등)와 데스크탑 대응은 다루지 않았습니다.
