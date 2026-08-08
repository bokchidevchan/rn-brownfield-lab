import { AppRegistry } from 'react-native';

import HostScreen from './src/HostScreen';
import './src/scriptManager';

/**
 * 호스트 번들의 진입점입니다.
 *
 * 이 번들에 들어가는 것: RN 런타임, React, 공유 의존성, 셸 화면
 * 이 번들에 없는 것: 장바구니 화면. 그건 원격에서 받습니다.
 */
AppRegistry.registerComponent('HostApp', () => HostScreen);
