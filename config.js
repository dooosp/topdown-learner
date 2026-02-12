const { loadEnv } = require('config-loader');

loadEnv({
  required: ['GEMINI_API_KEY', 'ACCESS_PIN'],
  defaults: { PORT: '3400' },
  name: 'topdown-learner',
});

module.exports = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  },
  port: process.env.PORT || 3400
};
