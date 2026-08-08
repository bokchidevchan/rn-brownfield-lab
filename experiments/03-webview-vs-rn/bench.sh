#!/bin/bash
#
# 웹뷰와 RN 의 "탭 → 첫 페인트"를 조건별로 반복 측정합니다.
#
# 사람이 스크린샷을 읽어 숫자를 옮기면 반복이 안 되고 편차도 못 냅니다.
# 앱이 logcat 에 남긴 값을 긁어서 중앙값과 범위를 냅니다.
#
# 준비:
#   node web/server.js          다른 터미널에서 띄워 둡니다
#   cd android && ./gradlew installDebug -PabiFilters=arm64-v8a
#
# 실행:
#   ./bench.sh [반복횟수]
#
set -uo pipefail

ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
PKG="${BENCH_PKG:-com.example.bench.debug}"
ACT="$PKG/com.example.bench.MainActivity"
N="${1:-10}"

# 결과가 나올 때까지 폴링합니다. 고정 sleep 은 느리고, 짧으면 놓칩니다.
wait_for() {
  local label="$1" timeout="$2" waited=0
  while [ "$waited" -lt "$timeout" ]; do
    local hit
    hit=$("$ADB" logcat -d -s BENCH 2>/dev/null | grep -oE "${label}=[0-9]+" | tail -1)
    if [ -n "$hit" ]; then echo "${hit#*=}"; return 0; fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

run_case() {
  local label="$1" target="$2" warm="$3"
  local values=()

  for i in $(seq 1 "$N"); do
    "$ADB" shell am force-stop "$PKG" >/dev/null 2>&1
    sleep 2
    "$ADB" logcat -c >/dev/null 2>&1
    "$ADB" shell am start -n "$ACT" --es auto "$target" --ez warm "$warm" >/dev/null 2>&1

    local v
    if v=$(wait_for "$label" 40); then
      values+=("$v")
      printf "  %2d회: %sms\n" "$i" "$v"
    else
      # 라벨이 안 맞았다면 반대 조건으로 기록됐을 수 있습니다. 원인을 남깁니다.
      local other
      other=$("$ADB" logcat -d -s BENCH 2>/dev/null | grep -oE "(webview|rn)_(cold|warm)=[0-9]+" | tail -1)
      printf "  %2d회: 실패 (마지막 로그: %s)\n" "$i" "${other:-없음}"
    fi
  done

  if [ ${#values[@]} -eq 0 ]; then
    echo "  → 전부 실패"
    return
  fi

  printf '%s\n' "${values[@]}" | sort -n | awk -v l="$label" '
    {a[NR]=$1; s+=$1}
    END {
      med = (NR%2) ? a[(NR+1)/2] : int((a[NR/2]+a[NR/2+1])/2)
      printf "  → %s  n=%d  중앙값 %dms  최소 %dms  최대 %dms  평균 %dms\n", l, NR, med, a[1], a[NR], s/NR
    }'
}

echo "=== 웹뷰, 프리워밍 없음 ==="
run_case webview_cold webview false
echo
echo "=== 웹뷰, 프리워밍 있음 ==="
run_case webview_warm webview true
echo
echo "=== RN, preload 없음 ==="
run_case rn_cold rn false
echo
echo "=== RN, preload 있음 ==="
run_case rn_warm rn true
