const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

async function generate(prompt, systemInstruction = '') {
  try {
    const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API 오류:', error.message);
    throw error;
  }
}

async function chat(history, userMessage, systemInstruction = '') {
  try {
    const chat = model.startChat({
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const prompt = systemInstruction
      ? `[시스템 지침]\n${systemInstruction}\n\n[사용자 메시지]\n${userMessage}`
      : userMessage;

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini Chat 오류:', error.message);
    throw error;
  }
}

module.exports = { generate, chat };
