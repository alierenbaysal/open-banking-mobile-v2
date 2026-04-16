// CommonJS require() preserves execution order. ES imports get hoisted
// by the bundler, so enableScreens(false) would end up AFTER expo-router
// initialises and the JSI type assertion on the new-arch TurboModule
// fires. Keeping the scheme plain `require` guarantees the native
// module is disabled before any navigation code touches it.
const { enableScreens } = require("react-native-screens");
enableScreens(false);
require("expo-router/entry");
