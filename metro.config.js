const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude test files from production bundle
config.resolver.blockList = [
  /\.test\.[jt]sx?$/,
  /\/__tests__\//,
  /\/test\//,
];

module.exports = config;
