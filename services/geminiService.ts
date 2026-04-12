import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
// Initialize conditionally to prevent crashes if key is missing during dev, 
// though robust apps should handle this via env vars.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!ai) {
    return "Error: API Key not configured.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: message,
    });
    
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I am having trouble connecting to the network right now.";
  }
};