/**
 * AI Summarizer Utility
 * Uses OpenAI GPT-4o-mini or GitHub Models for article summarization
 */

const { OpenAI } = require("openai");

/**
 * Initialize OpenAI client
 * @param {string} apiKey - OpenAI API key
 * @returns {OpenAI} OpenAI client instance
 */
function createOpenAIClient(apiKey) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

/**
 * Summarize a single article using OpenAI
 * @param {Object} article - Article object with title and description
 * @param {OpenAI} client - OpenAI client instance
 * @returns {Promise<string>} Summary text (60-80 words)
 */
async function summarizeArticle(article, client) {
  if (!article || (!article.title && !article.description)) {
    return article?.description || "";
  }

  try {
    const content = `Title: ${article.title || ""}
Description: ${article.description || ""}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a news summarizer. Create concise, informative summaries of news articles in exactly 60-80 words. Focus on the key facts and maintain a neutral tone.",
        },
        {
          role: "user",
          content: `Please summarize this news article in 60-80 words:\n\n${content}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    if (response.choices && response.choices[0]?.message?.content) {
      return response.choices[0].message.content.trim();
    }

    // Fallback to description if summarization fails
    return article.description || "";
  } catch (error) {
    console.error("Error summarizing article:", error.message);
    // Return original description as fallback
    return article.description || "";
  }
}

/**
 * Summarize multiple articles
 * @param {Object[]} articles - Array of article objects
 * @param {string} apiKey - OpenAI API key
 * @param {boolean} enableSummarization - Whether to enable AI summarization
 * @returns {Promise<Object[]>} Articles with summaries added
 */
async function summarizeArticles(articles, apiKey, enableSummarization = true) {
  if (!articles || articles.length === 0) {
    return [];
  }

  // If summarization is disabled or no API key, return articles with description as summary
  if (!enableSummarization || !apiKey) {
    return articles.map((article) => ({
      ...article,
      summary: article.description || "",
    }));
  }

  let client;
  try {
    client = createOpenAIClient(apiKey);
  } catch {
    // If client creation fails, return articles with description as summary
    return articles.map((article) => ({
      ...article,
      summary: article.description || "",
    }));
  }

  const summarizedArticles = [];

  for (const article of articles) {
    try {
      const summary = await summarizeArticle(article, client);
      summarizedArticles.push({
        title: article.title,
        url: article.url,
        summary: summary,
        image: article.image,
        publishedAt: article.publishedAt,
      });
    } catch {
      // On error, use description as fallback
      summarizedArticles.push({
        title: article.title,
        url: article.url,
        summary: article.description || "",
        image: article.image,
        publishedAt: article.publishedAt,
      });
    }
  }

  return summarizedArticles;
}

module.exports = {
  createOpenAIClient,
  summarizeArticle,
  summarizeArticles,
};
