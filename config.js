require('dotenv').config();

module.exports = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  },
  port: process.env.PORT || 3000
};
