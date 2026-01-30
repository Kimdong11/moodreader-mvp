export function buildPrompt(text: string, category?: string): string {
  const context = category ? `Context: ${category}.\n` : '';
  
  return `
You are a DJ and music curator. Analyze the following text and determine the best background music style for reading it.
${context}
Input Text: "${text.substring(0, 500)}..." (truncated)

Output strictly valid JSON only. No markdown, no explanation.
Schema:
{
  "tempo": "slow" | "medium" | "fast",
  "genres": ["primary_genre", "secondary_genre"]
}

Example:
Input: "The gentle waves lapped against the shore..."
Output: {"tempo": "slow", "genres": ["ambient", "nature"]}

Input: "Python 3.12 introduces new features..."
Output: {"tempo": "medium", "genres": ["lofi", "electronic"]}

Analyze the input text now.
`;
}
