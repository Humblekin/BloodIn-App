const { withGradleProperties } = require('@expo/config-plugins');

module.exports = config =>
  withGradleProperties(config, config => {
    const property = config.modResults.find(
      item => item.type === 'property' && item.key === 'edgeToEdgeEnabled'
    );

    if (property) {
      property.value = 'true';
    } else {
      config.modResults.push({
        type: 'property',
        key: 'edgeToEdgeEnabled',
        value: 'true',
      });
    }

    return config;
  });
