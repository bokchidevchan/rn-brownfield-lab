#!/bin/bash
#
# 구아키텍처와 신아키텍처를 같은 앱, 같은 기기, 같은 자로 비교합니다.
#
# 아키텍처는 빌드 플래그라 런타임에 못 바꿉니다. 그래서 같은 소스를 두 번 빌드해서
# 번갈아 설치하며 잽니다. 빌드와 설치는 이 스크립트 밖에서 하고,
# 여기서는 지금 설치된 앱을 측정만 합니다.
#
# 실행:
#   BENCH_PKG=com.example.arch ./bench.sh 10
#
set -uo pipefail

ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
PKG="${BENCH_PKG:-com.example.arch.debug}"
ACT="$PKG/com.example.arch.MainActivity"
N="${1:-10}"

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
      printf "  %2d회: 실패\n" "$i"
    fi
  done

  [ ${#values[@]} -eq 0 ] && { echo "  → 전부 실패"; return; }

  printf '%s\n' "${values[@]}" | sort -n | awk -v l="$label" '
    {a[NR]=$1; s+=$1}
    END {
      med = (NR%2) ? a[(NR+1)/2] : int((a[NR/2]+a[NR/2+1])/2)
      printf "  → %s  n=%d  중앙값 %dms  최소 %dms  최대 %dms\n", l, NR, med, a[1], a[NR]
    }'
}

echo "설치된 앱: $PKG"
"$ADB" shell am force-stop "$PKG" >/dev/null 2>&1
"$ADB" logcat -c >/dev/null 2>&1
"$ADB" shell am start -n "$ACT" >/dev/null 2>&1
sleep 3
"$ADB" logcat -d -s BENCH | grep -oE "arch=(old|new)" | tail -1 | sed 's/^/아키텍처: /'
"$ADB" shell am force-stop "$PKG" >/dev/null 2>&1
echo

echo "=== 서피스 1개, 엔진 예열 없음 ==="
run_case single_cold_detail single false
echo
echo "=== 서피스 1개, 엔진 예열 있음 ==="
run_case single_warm_detail single true
echo
echo "=== 서피스 2개: 첫 번째 ==="
run_case dual_cold_detail dual false
echo
echo "=== 서피스 2개: 첫 번째가 그려진 뒤 두 번째를 붙이는 비용 ==="
run_case second_review dual false
