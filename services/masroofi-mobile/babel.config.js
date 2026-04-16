module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          // Reanimated plugin is off: not used by app code and its worklet
          // transforms trigger strict JSI type checks on native init.
          "react-native-reanimated/plugin": false,
          reanimated: false,
        },
      ],
    ],
  };
};
