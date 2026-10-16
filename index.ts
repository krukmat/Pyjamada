import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// Native registers the app straight away. The web build first loads CanvasKit
// (Skia's WebAssembly renderer, public/canvaskit.wasm) and only then imports
// App, because Skia components cannot be evaluated before CanvasKit exists.
if (Platform.OS === 'web') {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL ?? '';
  void import('@shopify/react-native-skia/lib/module/web')
    .then(({ LoadSkiaWeb }) => LoadSkiaWeb({ locateFile: file => `${baseUrl}/${file}` }))
    .then(() => import('./App'))
    .then(({ default: App }) => registerRootComponent(App));
} else {
  registerRootComponent(require('./App').default);
}
