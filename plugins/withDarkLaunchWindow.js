// Paints every Android launch surface in the app background colour so no white
// window shows before React Native draws its first frame. Covers the plain
// window background, the Android 12+ splash background and the splash colour
// resource that prebuild templates may define.
const { withAndroidColors, withAndroidStyles, AndroidConfig } = require('expo/config-plugins');

const COLOR_NAME = 'launchBackground';

module.exports = function withDarkLaunchWindow(config, { color = '#0b0a12' } = {}) {
  config = withAndroidColors(config, (mod) => {
    for (const name of [COLOR_NAME, 'splashscreen_background', 'activityBackground']) {
      mod.modResults = AndroidConfig.Colors.assignColorValue(mod.modResults, { name, value: color });
    }
    return mod;
  });
  return withAndroidStyles(config, (mod) => {
    const styles = mod.modResults.resources.style ?? [];
    for (const style of styles) {
      for (const name of ['android:windowBackground', 'android:windowSplashScreenBackground']) {
        mod.modResults = AndroidConfig.Styles.assignStylesValue(mod.modResults, {
          add: true,
          parent: { name: style.$.name, parent: style.$.parent },
          name,
          value: `@color/${COLOR_NAME}`,
        });
      }
    }
    return mod;
  });
};
