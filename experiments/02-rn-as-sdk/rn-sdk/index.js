import {AppRegistry} from 'react-native';

import ProductDetailScreen from './js/screens/ProductDetailScreen';
import SettingsScreen from './js/screens/SettingsScreen';

/**
 * 01 번과 등록 방식은 같습니다. 다른 건 이 이름을 아는 주체입니다.
 *
 * 01 번: 소비 앱(호스트 앱)이 moduleName 을 직접 알고 Intent 에 담았습니다.
 * 02 번: SDK 가 이름을 감춥니다. 소비 앱은 RnSdk.openProductDetail() 만 부르고,
 *        moduleName 이라는 개념 자체를 모릅니다.
 *
 * 이 이름을 바꿔도 소비 앱은 재빌드할 필요가 없습니다. SDK 안에서만 닫히기 때문입니다.
 */
AppRegistry.registerComponent('RNProductDetail', () => ProductDetailScreen);
AppRegistry.registerComponent('RNSettings', () => SettingsScreen);
