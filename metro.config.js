const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const rootDir = path.resolve(__dirname);

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      if (name === '@') {
        return path.join(rootDir, 'src');
      }
      return path.join(rootDir, 'node_modules', String(name));
    },
  }
);

module.exports = config;
