# 11. 메모리: RN, Lynx, 웹뷰는 각각 어디에 메모리를 쓰나

같은 에뮬레이터에서 세 방식의 화면을 하나씩 띄우고 `dumpsys meminfo` 로 프로세스 메모리(PSS)를 쟀습니다. 03번(웹뷰 vs RN 진입 시간), 10번(Lynx vs RN 번들)에 이어, 이번에는 "떠 있는 동안 무엇이 메모리를 차지하는가"를 봅니다.

## 먼저 구조부터: 셋은 프로세스 모양이 다릅니다

숫자보다 이게 본론입니다. 어디에 메모리가 잡히는지가 세 방식에서 다릅니다.

**웹뷰는 여러 프로세스에 나눠 잡힙니다.** Android O 이후 WebView 는 페이지 렌더링(Blink 의 DOM, 레이아웃, V8 의 JS 힙)을 앱 프로세스가 아니라 별도의 샌드박스 렌더러 프로세스에서 합니다. 앱 프로세스에는 WebView 자바 객체와 엔진 코드 매핑, 합성용 그래픽 버퍼가 잡히고, 페이지의 실체는 렌더러 프로세스에 잡힙니다. 엔진 코드 자체는 OS 가 제공하는 WebView APK 를 여러 앱이 공유 매핑하므로 PSS 상으로는 나눠 계산됩니다. 대신 페이지마다의 데이터(DOM 트리, JS 힙)는 오롯이 렌더러 몫입니다.

**RN 은 전부 앱 프로세스 하나에 잡힙니다.** Hermes 의 JS 힙은 Native Heap 항목으로, React 트리와 그 결과인 네이티브 뷰들, 프레임워크 .so(libreactnative, libhermes)는 앱 전용 매핑으로 들어갑니다. 웹뷰처럼 OS 와 나누는 부분이 없어서 전부 이 앱의 몫이지만, 총량 자체는 브라우저 엔진보다 훨씬 작습니다.

**Lynx 도 단일 프로세스인데 JS 런타임이 두 개입니다.** 메인 스레드 런타임(PrimJS)과 백그라운드 런타임이 같은 프로세스의 Native Heap 에 함께 잡힙니다. 셸 모델이라 엔진은 셸이 한 번 로드하고, 카드(화면)를 추가로 열 때는 그 위에 증분만 쌓입니다.

## 실측

Pixel 9 에뮬레이터(API 36, arm64). 웹뷰와 RN 은 03번 bench 앱(release, RN 0.76.9 Old Arch + Hermes), Lynx 는 LynxExplorer 4.0.1 에 10번 카운터 번들(프로덕션 빌드, 정적 서버 서빙)을 열었습니다. 각 시나리오는 콜드 시작 후 5초 간격 3회 측정, 마지막(안정) 값입니다.

| 시나리오 | PSS | 베이스라인 대비 |
|---|---|---|
| bench 홈 (순수 네이티브 화면) | 54.5 MB | 기준 |
| bench 웹뷰 화면 (앱 프로세스) | 103.2 MB | +48.7 MB |
| 웹뷰 샌드박스 렌더러 (별도 프로세스) | 51.1 MB | +51.1 MB |
| **웹뷰 합계** | **154.3 MB** | **+99.8 MB** |
| bench RN 화면 | 71.8 MB | +17.3 MB |
| LynxExplorer 홈 | 68.8 MB | 기준 (셸) |
| LynxExplorer + 카운터 카드 | 78.8 MB | 카드 +10.0 MB |

한 화면 기준으로 웹뷰가 약 100MB, RN 이 약 17MB 를 더 썼고, Lynx 는 셸 위에 카드 하나가 약 10MB 였습니다.

## 내역에서 보이는 것

`dumpsys meminfo` 의 항목별 내역에서 구조가 그대로 드러납니다.

**웹뷰 (앱 프로세스, 베이스라인 대비):** `.apk mmap` +20.1MB 와 `.so mmap` +8.2MB 는 OS 의 WebView APK 와 엔진 코드가 앱 주소 공간에 매핑된 것입니다. Native Heap +9.0MB, Unknown +6.7MB 는 브라우저 쪽 할당자입니다. 여기에 렌더러 프로세스 51.1MB 가 통째로 더해집니다. 페이지 하나(로컬 정적 페이지)치고 큰데, 이게 브라우저 한 탭의 기본 무게입니다.

**RN (베이스라인 대비):** Native Heap +2.9MB 에 Hermes JS 힙이 들어 있고, Unknown +2.5MB(번들 매핑 등), `.apk mmap` +5.7MB(앱 안의 리소스 매핑), Dalvik +1.8MB(네이티브 뷰의 자바 객체) 정도로 고르게 늘었습니다. 별도 프로세스가 없습니다.

**Lynx (셸 홈 대비, 카드 열기):** 증가분의 대부분이 Native Heap +6.8MB 입니다. 카드의 엘리먼트 트리와 두 런타임의 JS 힙이 여기 잡힙니다. 코드 매핑(.so, .apk)은 거의 안 늘었는데, 엔진이 셸에 이미 로드돼 있기 때문입니다. "런타임을 셸이 미리 들고 있으면 화면의 증분이 작다"가 메모리에서도 성립합니다.

## 해석할 때 주의

**웹뷰 100MB 가 전부 "낭비"는 아닙니다.** 엔진 코드 페이지는 다른 앱과 공유되고, 렌더러는 OS 가 메모리 압박 시 우선 회수하는 대상입니다. 반대로 RN 과 Lynx 의 메모리는 전부 앱 프로세스 소유라 앱이 죽을 때까지 앱 책임입니다. OOM 킬 관점에서는 앱 프로세스가 가벼운 쪽(웹뷰의 앱 프로세스도 103MB 로 RN 보다 무겁긴 합니다)이 유리합니다.

**화면이 늘어날 때의 곡선이 다릅니다.** 웹뷰는 웹뷰 인스턴스를 추가할 때마다 렌더러 쪽 비용이 다시 들고(같은 렌더러 프로세스에 사이트별로 쌓이거나 프로세스가 늘어남), RN 은 JS 컨텍스트 하나를 공유하면 화면 추가분이 React 트리와 뷰만큼만 늘어납니다. Lynx 의 카드 증분 10MB 가 그 모델의 예시입니다. 화면 하나짜리 측정을 n 배 해서 외삽하면 안 됩니다.

**세 화면은 내용이 같지 않습니다.** 웹뷰/RN 은 03번의 상품 상세 화면이고 Lynx 는 10번의 카운터 화면이라, Lynx 열이 유리한 비교입니다. Lynx 값은 "셸 모델에서 카드 하나의 증분" 이상으로 읽으면 안 됩니다.

## 재현 방법

```bash
# 웹 서버 (웹뷰 콘텐츠) + 포트 포워딩
node experiments/03-webview-vs-rn/web/server.js &
adb reverse tcp:3000 tcp:3000

# 베이스라인 / 웹뷰 / RN (bench release 설치 전제. 03번 참고)
adb shell am start -n com.example.bench/com.example.bench.MainActivity
adb shell dumpsys meminfo com.example.bench -s
adb shell am force-stop com.example.bench
adb shell am start -n com.example.bench/com.example.bench.MainActivity --es auto webview --ez warm false
adb shell dumpsys meminfo com.example.bench -s
adb shell ps -A | grep sandboxed_process     # 렌더러 PID 확인 후 dumpsys meminfo <PID> -s
adb shell am force-stop com.example.bench
adb shell am start -n com.example.bench/com.example.bench.MainActivity --es auto rn --ez warm false
adb shell dumpsys meminfo com.example.bench -s

# Lynx (10번 번들을 프로덕션 빌드 후 정적 서빙)
cd experiments/10-lynx/lynx-app && npm run build
python3 -m http.server 3001 --directory dist &
adb reverse tcp:3001 tcp:3001
# LynxExplorer 홈에서 http://localhost:3001/main.lynx.bundle 입력 후 Go
adb shell dumpsys meminfo com.lynx.explorer -s
```

## 한계

- 에뮬레이터 1회 측정(시나리오당 3회 읽기 중 안정값)입니다. 실행마다 5~10MB 흔들리는 것을 확인했으므로(예: LynxExplorer 홈이 다른 실행에서 58.7MB) 절대값보다 자릿수와 구조를 봐야 합니다.
- 화면 내용이 3자 동일하지 않습니다. 웹뷰/RN 은 같은 화면이라 직접 비교가 되지만, Lynx 는 더 단순한 화면입니다.
- LynxExplorer 는 모든 확장 요소를 실은 개발용 셸이라 프로덕션 통합 시의 셸 무게와 다릅니다.
- 스크롤, 이미지 로딩, 장시간 사용에 따른 증가(누수 포함)는 재지 않았습니다. 진입 직후 정지 상태만 쟀습니다.
- iOS 는 재지 않았습니다. iOS 웹뷰(WKWebView)도 별도 콘텐츠 프로세스 모델이라 구조는 비슷하지만 값은 다를 것입니다.
