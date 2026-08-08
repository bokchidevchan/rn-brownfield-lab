import {AppRegistry} from 'react-native';

import ProductDetailScreen from './js/screens/ProductDetailScreen';
import ReviewScreen from './js/screens/ReviewScreen';

/**
 * 화면을 두 개 등록합니다. 하나만 있으면 확인할 수 없는 것이 있어서입니다.
 *
 * 신아키텍처의 주장 중 하나가 "엔진 하나 위에 값싼 서피스 여러 개"입니다.
 * 서피스를 두 개 띄워 보고 두 번째가 정말 싼지, 그리고 둘이 같은 JS 전역을
 * 공유하는지 확인하려면 등록된 컴포넌트가 둘 이상이어야 합니다.
 */
AppRegistry.registerComponent('ProductDetail', () => ProductDetailScreen);
AppRegistry.registerComponent('Review', () => ReviewScreen);
