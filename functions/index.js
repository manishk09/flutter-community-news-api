/**
 * Firebase Cloud Functions - Personalized News API
 *
 * Provides callable function to fetch local, national, business, and community news
 * with optional AI summarization.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { buildAllQueries } = require("./utils/queryBuilder");
const { fetchNewsForQueries } = require("./utils/newsFetcher");
const { summarizeArticles } = require("./utils/summarizer");

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Get API keys from environment variables or Firebase config
 */
function getApiKeys() {
  // Try environment variables first, then Firebase config
  const newsApiKey = process.env.NEWS_API_KEY || functions.config().news?.key;
  const openaiApiKey = process.env.OPENAI_API_KEY || functions.config().openai?.key;

  return {
    newsApiKey,
    openaiApiKey,
  };
}

/**
 * Validate the incoming request data
 * @param {Object} data - Request data
 * @returns {Object} Validation result with isValid boolean and error message
 */
function validateRequest(data) {
  if (!data) {
    return {
      isValid: false,
      error: "Request data is required",
    };
  }

  if (!data.location) {
    return {
      isValid: false,
      error: "Location is required. Please provide city, state, and country.",
    };
  }

  const { location } = data;

  if (!location.city && !location.state && !location.country) {
    return {
      isValid: false,
      error: "At least one of city, state, or country is required in location.",
    };
  }

  return { isValid: true };
}

/**
 * Main callable function to get personalized news
 *
 * Expected input:
 * {
 *   "location": { "city": "Ramgarh", "state": "Jharkhand", "country": "India" },
 *   "businessInterests": ["Bakery", "Gift Studio"],
 *   "community": "Dalit empowerment"
 * }
 *
 * Returns:
 * {
 *   "status": "success",
 *   "results": [
 *     {
 *       "title": "",
 *       "url": "",
 *       "summary": "",
 *       "image": "",
 *       "publishedAt": ""
 *     }
 *   ]
 * }
 */
exports.getNews = functions.https.onCall(async (data) => {
  try {
    // Validate request
    const validation = validateRequest(data);
    if (!validation.isValid) {
      return {
        status: "error",
        error: validation.error,
        results: [],
      };
    }

    // Get API keys
    const { newsApiKey, openaiApiKey } = getApiKeys();

    if (!newsApiKey) {
      console.error("NEWS_API_KEY is not configured");
      return {
        status: "error",
        error: "News API is not configured. Please contact administrator.",
        results: [],
      };
    }

    // Build search queries based on user input
    const queries = buildAllQueries(data);

    if (queries.length === 0) {
      return {
        status: "success",
        results: [],
        message: "No search queries could be generated from the provided data.",
      };
    }

    // Fetch news articles
    let articles;
    try {
      articles = await fetchNewsForQueries(queries, newsApiKey);
    } catch (fetchError) {
      console.error("Error fetching news:", fetchError.message);
      return {
        status: "error",
        error: "Failed to fetch news articles. Please try again later.",
        results: [],
      };
    }

    // If no articles found, return empty results
    if (!articles || articles.length === 0) {
      return {
        status: "success",
        results: [],
        message: "No news articles found for your criteria.",
      };
    }

    // Summarize articles (with fallback to description if summarization fails)
    const enableSummarization = Boolean(openaiApiKey);
    const summarizedArticles = await summarizeArticles(
        articles,
        openaiApiKey,
        enableSummarization,
    );

    return {
      status: "success",
      results: summarizedArticles,
      queriesUsed: queries.length,
      totalArticles: summarizedArticles.length,
    };
  } catch (error) {
    console.error("Unexpected error in getNews:", error);
    return {
      status: "error",
      error: "An unexpected error occurred. Please try again later.",
      results: [],
    };
  }
});

/**
 * HTTP endpoint version for testing with curl/Postman
 */
exports.getNewsHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const data = req.body;

    // Validate request
    const validation = validateRequest(data);
    if (!validation.isValid) {
      res.status(400).json({
        status: "error",
        error: validation.error,
        results: [],
      });
      return;
    }

    // Get API keys
    const { newsApiKey, openaiApiKey } = getApiKeys();

    if (!newsApiKey) {
      res.status(500).json({
        status: "error",
        error: "News API is not configured.",
        results: [],
      });
      return;
    }

    // Build search queries
    const queries = buildAllQueries(data);

    if (queries.length === 0) {
      res.json({
        status: "success",
        results: [],
        message: "No search queries could be generated.",
      });
      return;
    }

    // Fetch news
    const articles = await fetchNewsForQueries(queries, newsApiKey);

    if (!articles || articles.length === 0) {
      res.json({
        status: "success",
        results: [],
        message: "No news articles found.",
      });
      return;
    }

    // Summarize
    const enableSummarization = Boolean(openaiApiKey);
    const summarizedArticles = await summarizeArticles(
        articles,
        openaiApiKey,
        enableSummarization,
    );

    res.json({
      status: "success",
      results: summarizedArticles,
      queriesUsed: queries.length,
      totalArticles: summarizedArticles.length,
    });
  } catch (error) {
    console.error("Error in getNewsHttp:", error);
    res.status(500).json({
      status: "error",
      error: "An unexpected error occurred.",
      results: [],
    });
  }
});
