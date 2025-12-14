/**
 * Community Relevance Booster Utility
 * Boosts the relevance score of articles related to Dalit, SC/ST, Bahujan,
 * Ambedkar, and social justice topics
 */

// Keywords that indicate community-relevant content
const COMMUNITY_KEYWORDS = [
  "dalit",
  "dalits",
  "sc",
  "st",
  "sc/st",
  "scheduled caste",
  "scheduled castes",
  "scheduled tribe",
  "scheduled tribes",
  "bahujan",
  "ambedkar",
  "dr ambedkar",
  "b r ambedkar",
  "br ambedkar",
  "reservation",
  "atrocity",
  "atrocities",
  "social justice",
  "caste discrimination",
  "untouchability",
  "backward class",
  "backward classes",
  "obc",
  "reservations",
];

/**
 * Calculate relevance score for an article based on community keywords
 * @param {Object} article - Article object with title, description, etc.
 * @returns {number} Relevance score (higher = more relevant)
 */
function calculateRelevanceScore(article) {
  if (!article) {
    return 0;
  }

  let score = 0;
  const textToCheck = [
    article.title || "",
    article.description || "",
    article.content || "",
  ].join(" ").toLowerCase();

  // Count occurrences of community keywords
  for (const keyword of COMMUNITY_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = textToCheck.match(regex);
    if (matches) {
      // Each match increases the score
      score += matches.length * 10; // 10 points per keyword match
    }
  }

  return score;
}

/**
 * Determine if an article is community-relevant
 * @param {Object} article - Article object
 * @returns {boolean} True if article contains community keywords
 */
function isCommunityRelevant(article) {
  return calculateRelevanceScore(article) > 0;
}

/**
 * Classify article categories based on content
 * @param {Object} article - Article object
 * @returns {string[]} Array of category tags
 */
function classifyArticle(article) {
  const categories = [];

  if (!article) {
    return categories;
  }

  const textToCheck = [
    article.title || "",
    article.description || "",
    article.content || "",
  ].join(" ").toLowerCase();

  // Check for community/identity categories
  if (isCommunityRelevant(article)) {
    if (textToCheck.includes("dalit") || textToCheck.includes("sc") ||
        textToCheck.includes("st") || textToCheck.includes("scheduled")) {
      categories.push("dalit");
    }
    if (textToCheck.includes("bahujan")) {
      categories.push("bahujan");
    }
    if (textToCheck.includes("ambedkar")) {
      categories.push("ambedkar");
    }
    if (textToCheck.includes("social justice")) {
      categories.push("social-justice");
    }
  }

  // Check for business categories
  const businessKeywords = ["business", "industry", "economy", "trade", "market", "msme"];
  if (businessKeywords.some((keyword) => textToCheck.includes(keyword))) {
    categories.push("business");
  }

  // Check for policy categories
  const policyKeywords = ["policy", "scheme", "government", "ministry", "law", "act"];
  if (policyKeywords.some((keyword) => textToCheck.includes(keyword))) {
    categories.push("policy");
  }

  return categories;
}

/**
 * Boost and sort articles based on community relevance
 * @param {Object[]} articles - Array of article objects
 * @param {Object} queryMetadata - Metadata about which query fetched each article
 * @returns {Object[]} Articles sorted by relevance score (highest first)
 */
function boostAndSortArticles(articles, queryMetadata = {}) {
  if (!articles || articles.length === 0) {
    return [];
  }

  // Calculate relevance score for each article
  const scoredArticles = articles.map((article) => ({
    ...article,
    relevanceScore: calculateRelevanceScore(article),
    categories: classifyArticle(article),
  }));

  // Sort by relevance score (highest first), then by published date
  return scoredArticles.sort((a, b) => {
    // Primary sort: by relevance score
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    // Secondary sort: by published date (newest first)
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  });
}

/**
 * Determine coverage type based on article source and query
 * @param {Object} article - Article object
 * @param {string} query - The search query that found this article
 * @param {Object} location - User location object
 * @returns {string} Coverage type: "local", "national", or "international"
 */
function determineCoverage(article, query = "", location = {}) {
  if (!article) {
    return "international";
  }

  const textToCheck = [
    article.title || "",
    article.description || "",
    query,
  ].join(" ").toLowerCase();

  const { city, state, country } = location;

  // Check for local indicators
  if (city && textToCheck.includes(city.toLowerCase())) {
    return "local";
  }
  if (state && textToCheck.includes(state.toLowerCase())) {
    return "local";
  }

  // Check for international indicators first (they take precedence)
  const internationalKeywords = ["world", "international", "global", "un ", "united nations"];
  if (internationalKeywords.some((keyword) => textToCheck.includes(keyword))) {
    return "international";
  }

  // Check for national indicators
  if (country && textToCheck.includes(country.toLowerCase())) {
    return "national";
  }
  if (textToCheck.includes("national") || textToCheck.includes("india")) {
    return "national";
  }

  // Default to national if can't determine
  return "national";
}

module.exports = {
  calculateRelevanceScore,
  isCommunityRelevant,
  classifyArticle,
  boostAndSortArticles,
  determineCoverage,
  COMMUNITY_KEYWORDS,
};
