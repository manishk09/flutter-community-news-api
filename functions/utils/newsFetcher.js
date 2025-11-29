/**
 * News Fetcher Utility
 * Fetches news from GNews API or NewsAPI
 */

const axios = require("axios");

const GNEWS_BASE_URL = "https://gnews.io/api/v4/search";
const NEWSAPI_BASE_URL = "https://newsapi.org/v2/everything";

// Configurable constants (can be overridden via environment variables)
const DEFAULT_QUERY_LIMIT = parseInt(process.env.NEWS_QUERY_LIMIT, 10) || 5;
const DEFAULT_MAX_RESULTS = parseInt(process.env.NEWS_MAX_RESULTS_PER_QUERY, 10) || 3;

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
 * @param {number} queryLimit - Maximum number of queries to process
 * @returns {Promise<Object[]>} Deduplicated array of news articles
 */
async function fetchNewsForQueries(
    queries,
    apiKey,
    provider = "gnews",
    maxResultsPerQuery = DEFAULT_MAX_RESULTS,
    queryLimit = DEFAULT_QUERY_LIMIT,
) {
  if (!queries || queries.length === 0) {
    return [];
  }

  if (!apiKey) {
    throw new Error("NEWS_API_KEY is not configured");
  }

  // Limit queries to avoid rate limiting (configurable)
  const limitedQueries = queries.slice(0, queryLimit);

  // Fetch all queries in parallel using Promise.allSettled
  const fetchPromises = limitedQueries.map(async (query) => {
    try {
      if (provider === "newsapi") {
        return await fetchFromNewsAPI(query, apiKey, maxResultsPerQuery);
      } else {
        return await fetchFromGNews(query, apiKey, maxResultsPerQuery);
      }
    } catch (error) {
      console.error(`Error fetching news for query "${query}":`, error.message);
      return []; // Return empty array on failure
    }
  });

  const results = await Promise.allSettled(fetchPromises);

  // Combine and deduplicate results
  const allArticles = [];
  const seenUrls = new Set();

  for (const result of results) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      for (const article of result.value) {
        if (article.url && !seenUrls.has(article.url)) {
          seenUrls.add(article.url);
          allArticles.push(article);
        }
      }
    }
  }

  return allArticles;
}

module.exports = {
  fetchFromGNews,
  fetchFromNewsAPI,
  fetchNewsForQueries,
};
