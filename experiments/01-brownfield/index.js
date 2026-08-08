import {AppRegistry} from 'react-native';

import ProductDetailScreen from './js/screens/ProductDetailScreen';
import SettingsScreen from './js/screens/SettingsScreen';

/**
 * 그린필드 RN 앱은 보통 여기서 컴포넌트를 하나만 등록합니다.
 * 브라운필드는 "네이티브가 진입점을 고른다"가 핵심이라, 화면 단위로 여러 개를 등록하고
 * 네이티브 쪽에서 moduleName 으로 골라 띄웁니다.
 *
 * 이 이름은 네이티브 코드와의 계약입니다. 바꾸면 양쪽을 같이 고쳐야 합니다.
 *   - android: RnHostActivity 를 띄울 때 넘기는 EXTRA_MODULE_NAME
 *   - ios: RnHostViewController(moduleName:) 인자
 */
AppRegistry.registerComponent('RNProductDetail', () => ProductDetailScreen);
AppRegistry.registerComponent('RNSettings', () => SettingsScreen);
