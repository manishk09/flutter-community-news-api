/**
 * Query Builder Utility
 * Builds search queries for news fetching based on user location and interests
 */

/**
 * Build local news queries based on city, state, and country
 * @param {Object} location - Location object with city, state, country
 * @returns {string[]} Array of local news queries
 */
function buildLocalQueries(location) {
  const queries = [];

  if (!location) {
    return queries;
  }

  const { city, state, country } = location;

  // City-level news
  if (city) {
    queries.push(`${city} news`);
    queries.push(`${city} local news`);
  }

  // State-level news
  if (state) {
    queries.push(`${state} local news`);
    queries.push(`${state} latest news`);
  }

  // Country-level news (national)
  if (country) {
    queries.push(`${country} national news`);
    queries.push(`${country} latest news`);
  }

  return queries;
}

/**
 * Build business interest queries
 * @param {string[]} businessInterests - Array of business interests
 * @returns {string[]} Array of business news queries
 */
function buildBusinessQueries(businessInterests) {
  const queries = [];

  if (!businessInterests || !Array.isArray(businessInterests)) {
    return queries;
  }

  for (const interest of businessInterests) {
    if (interest && typeof interest === "string") {
      const trimmedInterest = interest.trim();
      if (trimmedInterest) {
        queries.push(`${trimmedInterest} business news`);
        queries.push(`${trimmedInterest} trends`);
      }
    }
  }

  return queries;
}

/**
 * Build community-related queries
 * @param {string} community - Community interest/cause
 * @returns {string[]} Array of community news queries
 */
function buildCommunityQueries(community) {
  const queries = [];

  if (!community || typeof community !== "string") {
    return queries;
  }

  const trimmedCommunity = community.trim();
  if (trimmedCommunity) {
    queries.push(`${trimmedCommunity} schemes`);
    queries.push(`${trimmedCommunity} news`);
    queries.push(`${trimmedCommunity} initiatives`);
  }

  return queries;
}

/**
 * Build all queries from user input
 * @param {Object} data - User input data
 * @param {Object} data.location - Location object
 * @param {string[]} data.businessInterests - Business interests array
 * @param {string} data.community - Community interest
 * @returns {string[]} Array of all search queries
 */
function buildAllQueries(data) {
  const allQueries = [];

  if (!data) {
    return allQueries;
  }

  // Add local/national news queries
  const localQueries = buildLocalQueries(data.location);
  allQueries.push(...localQueries);

  // Add business interest queries
  const businessQueries = buildBusinessQueries(data.businessInterests);
  allQueries.push(...businessQueries);

  // Add community queries
  const communityQueries = buildCommunityQueries(data.community);
  allQueries.push(...communityQueries);

  // Remove duplicates and empty strings
  const uniqueQueries = [...new Set(allQueries.filter((q) => q && q.trim()))];

  return uniqueQueries;
}

module.exports = {
  buildLocalQueries,
  buildBusinessQueries,
  buildCommunityQueries,
  buildAllQueries,
};
