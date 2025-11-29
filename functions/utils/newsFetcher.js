/**
 * News Fetcher Utility
 * Fetches news from GNews API or NewsAPI
 */

const axios = require("axios");

const GNEWS_BASE_URL = "https://gnews.io/api/v4/search";
const NEWSAPI_BASE_URL = "https://newsapi.org/v2/everything";

/**
 * Fetch news articles for a single query from GNews API
 * @param {string} query - Search query
 * @param {string} apiKey - GNews API key
 * @param {number} maxResults - Maximum number of results per query
 * @returns {Promise<Object[]>} Array of news articles
 */
async function fetchFromGNews(query, apiKey, maxResults = 5) {
  try {
    const response = await axios.get(GNEWS_BASE_URL, {
      params: {
        q: query,
        token: apiKey,
        lang: "en",
        max: maxResults,
      },
      timeout: 10000,
    });

    if (response.data && response.data.articles) {
      return response.data.articles.map((article) => ({
        title: article.title || "",
        url: article.url || "",
        description: article.description || "",
        image: article.image || "",
        publishedAt: article.publishedAt || "",
        source: article.source?.name || "Unknown",
      }));
    }

    return [];
  } catch (error) {
    console.error(`Error fetching from GNews for query "${query}":`, error.message);
    throw new Error(`Failed to fetch news: ${error.message}`);
  }
}

/**
 * Fetch news articles from NewsAPI (alternative provider)
 * @param {string} query - Search query
 * @param {string} apiKey - NewsAPI key
 * @param {number} pageSize - Number of results
 * @returns {Promise<Object[]>} Array of news articles
 */
async function fetchFromNewsAPI(query, apiKey, pageSize = 5) {
  try {
    const response = await axios.get(NEWSAPI_BASE_URL, {
      params: {
        q: query,
        apiKey: apiKey,
        language: "en",
        pageSize: pageSize,
        sortBy: "publishedAt",
      },
      timeout: 10000,
    });

    if (response.data && response.data.articles) {
      return response.data.articles.map((article) => ({
        title: article.title || "",
        url: article.url || "",
        description: article.description || "",
        image: article.urlToImage || "",
        publishedAt: article.publishedAt || "",
        source: article.source?.name || "Unknown",
      }));
    }

    return [];
  } catch (error) {
    console.error(`Error fetching from NewsAPI for query "${query}":`, error.message);
    throw new Error(`Failed to fetch news: ${error.message}`);
  }
}

/**
 * Fetch news for multiple queries and deduplicate results
 * @param {string[]} queries - Array of search queries
 * @param {string} apiKey - News API key
 * @param {string} provider - API provider ('gnews' or 'newsapi')
 * @param {number} maxResultsPerQuery - Max results per query
 * @returns {Promise<Object[]>} Deduplicated array of news articles
 */
async function fetchNewsForQueries(queries, apiKey, provider = "gnews", maxResultsPerQuery = 3) {
  if (!queries || queries.length === 0) {
    return [];
  }

  if (!apiKey) {
    throw new Error("NEWS_API_KEY is not configured");
  }

  const allArticles = [];
  const seenUrls = new Set();

  // Limit to first 5 queries to avoid rate limiting
  const limitedQueries = queries.slice(0, 5);

  for (const query of limitedQueries) {
    try {
      let articles;

      if (provider === "newsapi") {
        articles = await fetchFromNewsAPI(query, apiKey, maxResultsPerQuery);
      } else {
        articles = await fetchFromGNews(query, apiKey, maxResultsPerQuery);
      }

      // Deduplicate by URL
      for (const article of articles) {
        if (article.url && !seenUrls.has(article.url)) {
          seenUrls.add(article.url);
          allArticles.push(article);
        }
      }
    } catch (error) {
      console.error(`Error fetching news for query "${query}":`, error.message);
      // Continue with other queries even if one fails
    }
  }

  return allArticles;
}

module.exports = {
  fetchFromGNews,
  fetchFromNewsAPI,
  fetchNewsForQueries,
};
