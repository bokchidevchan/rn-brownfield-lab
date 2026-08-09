import { useCallback, useState } from '@lynx-js/react'

import './App.css'

/**
 * 08 번의 RN 카운터 화면과 같은 내용입니다.
 *
 * 같아야 비교가 됩니다. 08 에서 Metro 로 번들한 RN 앱이 905KB 였는데
 * 여기 Lynx 판이 몇 KB 인지가 이 실험의 첫 번째 숫자입니다.
 *
 * 코드에서 눈에 띄는 차이가 세 가지입니다.
 *
 * 1. 태그가 view, text 입니다. RN 의 View, Text 와 역할은 같지만
 *    소문자 내장 엘리먼트입니다. HTML 도 아니고 RN 컴포넌트도 아닙니다.
 * 2. 이벤트가 bindtap 입니다. onPress 나 onClick 이 아닙니다.
 * 3. 'background only' 지시어가 있습니다. 이게 Lynx 의 정체성입니다.
 *    아래 주석에 적었습니다.
 */
export function App() {
  const [count, setCount] = useState(0)
  const [taps, setTaps] = useState(0)

  /**
   * 'background only' 는 이 함수를 백그라운드 스레드에서 돌리라는 표시입니다.
   *
   * Lynx 는 스레드를 둘로 나눕니다. 메인 스레드는 UI 를 그리고,
   * 백그라운드 스레드가 앱 로직을 돕니다. RN 의 JS 스레드와 UI 스레드
   * 구분과 비슷해 보이지만 방향이 반대입니다. RN 은 JS 가 기본이고
   * 필요할 때 UI 스레드로 보내는데(worklet), Lynx 는 이 지시어로
   * "이건 UI 를 막지 않아도 된다"를 표시합니다.
   *
   * 지시어를 지우면 메인 스레드에서 돌아갑니다. 첫 프레임을 JS 없이
   * 그릴 수 있는 것도 이 구조 덕분입니다.
   */
  const onCount = useCallback(() => {
    'background only'
    setCount(prev => prev + 1)
  }, [])

  const onTapArea = useCallback(() => {
    'background only'
    setTaps(prev => prev + 1)
  }, [])

  return (
    <view className="Screen" bindtap={onTapArea}>
      <text className="Title">번들러 비교</text>
      <text className="Subtitle">Lynx + ReactLynx</text>

      {/*
        RN 이라면 <Text>카운터 {count}</Text> 로 문자열과 숫자를 섞어 쓸 수 있는데,
        Lynx 의 <text> 는 그렇게 쓰면 숫자가 화면에 나오지 않았습니다.
        템플릿 문자열로 하나의 문자열을 만들어 넘겨야 표시됩니다.
        RN 코드를 그대로 옮길 수 없는 지점 중 하나입니다.
      */}
      <view className="Button" bindtap={onCount}>
        <text className="ButtonText">{`카운터 ${count}`}</text>
      </view>

      <view className="Card">
        <Row label="렌더러" value="Lynx 엔진" />
        <Row label="JS 엔진" value="PrimJS" />
        <Row label="스타일" value="CSS 파일" />
        <Row label="화면 전체 탭" value={`${taps}회`} />
      </view>

      <text className="Note">
        이 화면은 LynxExplorer 안에서 돌아갑니다. 앱을 따로 빌드하지 않았고
        번들 주소만 넘겼습니다. 06 번의 granite 테스트 앱과 같은 구조입니다.
      </text>
    </view>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <view className="Row">
      <text className="RowLabel">{label}</text>
      <text className="RowValue">{value}</text>
    </view>
  )
}
