// The web build is served from a sub-path on GitHub Pages (/Pyjamada). The
// workflow sets EXPO_PUBLIC_BASE_URL; local `expo start --web` leaves it empty.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_PUBLIC_BASE_URL ?? '' },
});
