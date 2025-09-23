const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push(
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  // Fonts
  'ttf', 'otf', 'woff', 'woff2',
  // Audio
  'mp3', 'wav', 'aac', 'm4a',
  // Video
  'mp4', 'mov', 'avi', 'mkv'
);

// Add support for additional source extensions
config.resolver.sourceExts.push('jsx', 'tsx', 'ts', 'js');

module.exports = config;
