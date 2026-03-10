import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Gemini API key not found. Check .env file.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Use Gemini Pro (text model)
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

/**
 * Generate text from Gemini
 */
export async function generateText(prompt) {
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini error:", error);
    throw error;
  }
}
