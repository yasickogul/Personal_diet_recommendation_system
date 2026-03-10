import { generateText } from "./gemini";

export async function getMotivationQuote() {
  const prompt = `
Generate a short fitness motivation quote.

Rules:
- Exactly 2 lines
- Each line max 8–10 words
- Focus on health, discipline, consistency, or diet
- Simple English
- No emojis
- No hashtags
- No quotation marks
- Plain text only
`;

  return await generateText(prompt);
}
