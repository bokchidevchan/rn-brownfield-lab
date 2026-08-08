#!/bin/bash
#
# iOS 시뮬레이터에서 같은 측정을 돌립니다.
#
# Android 는 adb 로 Intent 를 던지고 logcat 을 긁었습니다.
# iOS 는 시뮬레이터 창을 GUI 로 자동화하기 어려워서 다른 경로를 씁니다.
#
#   조건 전달: launch arguments (-auto webview -warm 0). UserDefaults 가 읽습니다
#   결과 수집: xcrun simctl launch --console-pty 의 stdout
#
# 주의: 시뮬레이터 숫자는 실기기와 다릅니다. 호스트 맥의 CPU 를 쓰고
# WebKit 과 Hermes 가 x86_64/arm64 호스트 환경에서 돌기 때문입니다.
# 절대값이 아니라 조건 사이의 방향만 참고하세요.
#
# 준비:
#   node web/server.js
#   cd ios && ruby scripts/generate_xcodeproj.rb && pod install
#   xcodebuild -workspace Bench.xcworkspace -scheme Bench -configuration Release \
#     -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
#     -derivedDataPath <dd> build CODE_SIGNING_ALLOWED=NO
#   xcrun simctl install <udid> <dd>/Build/Products/Release-iphonesimulator/Bench.app
#
# 실행:
#   UDID=<udid> ./bench-ios.sh [반복횟수]
#
set -uo pipefail

UDID="${UDID:?UDID 를 지정하세요. xcrun simctl list devices 로 확인합니다}"
APP="com.example.bench"
N="${1:-10}"
TMP=$(mktemp -d)

run_case() {
  local label="$1" target="$2" warm="$3"
  local values=()

  for i in $(seq 1 "$N"); do
    xcrun simctl terminate "$UDID" "$APP" >/dev/null 2>&1
    sleep 1
    local out="$TMP/$label-$i.log"
    nohup xcrun simctl launch --console-pty "$UDID" "$APP" \
      -auto "$target" -warm "$warm" > "$out" 2>&1 &
    local pid=$!

    # 결과가 나오면 바로 끊습니다. 고정 sleep 은 느립니다.
    local waited=0 v=""
    while [ "$waited" -lt 30 ]; do
      v=$(grep -oE "${label}=[0-9]+" "$out" 2>/dev/null | tail -1)
      [ -n "$v" ] && break
      sleep 1
      waited=$((waited + 1))
    done

    xcrun simctl terminate "$UDID" "$APP" >/dev/null 2>&1
    kill "$pid" 2>/dev/null

    if [ -n "$v" ]; then
      values+=("${v#*=}")
      printf "  %2d회: %sms\n" "$i" "${v#*=}"
    else
      local other
      other=$(grep -oE "(webview|rn)_(cold|warm)=[0-9]+" "$out" 2>/dev/null | tail -1)
      printf "  %2d회: 실패 (마지막 로그: %s)\n" "$i" "${other:-없음}"
    fi
  done

  if [ ${#values[@]} -eq 0 ]; then echo "  → 전부 실패"; return; fi

  printf '%s\n' "${values[@]}" | sort -n | awk -v l="$label" '
    {a[NR]=$1; s+=$1}
    END {
      med = (NR%2) ? a[(NR+1)/2] : int((a[NR/2]+a[NR/2+1])/2)
      printf "  → %s  n=%d  중앙값 %dms  최소 %dms  최대 %dms  평균 %dms\n", l, NR, med, a[1], a[NR], s/NR
    }'
}

echo "=== 웹뷰, 프리워밍 없음 ==="
run_case webview_cold webview 0
echo
echo "=== 웹뷰, 프리워밍 있음 ==="
run_case webview_warm webview 1
echo
echo "=== RN, preload 없음 ==="
run_case rn_cold rn 0
echo
echo "=== RN, preload 있음 ==="
run_case rn_warm rn 1
