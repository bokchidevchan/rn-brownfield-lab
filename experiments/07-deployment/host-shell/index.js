import { AppRegistry } from 'react-native';

import HostScreen from './src/HostScreen';
import './src/scriptManager';

/**
 * 05 의 네이티브 앱(com.example.mf)이 기대하는 이름과 같게 등록합니다.
 * 네이티브는 한 줄도 안 바꾸고 이 번들만 assets 에 넣으면 07 이 됩니다.
 * 배포 전략이 네이티브 릴리스와 무관한 계층이라는 것을 그대로 보여줍니다.
 */
AppRegistry.registerComponent('HostApp', () => HostScreen);
