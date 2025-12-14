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
 * Build national news queries
 * @param {string} country - Country name
 * @returns {string[]} Array of national news queries
 */
function buildNationalQueries(country) {
  const queries = [];

  if (!country || typeof country !== "string") {
    return queries;
  }

  const trimmedCountry = country.trim();
  if (trimmedCountry) {
    queries.push(`${trimmedCountry} national headlines`);
  }

  return queries;
}

/**
 * Build international news queries
 * @returns {string[]} Array of international news queries
 */
function buildInternationalQueries() {
  return [
    "world headlines",
    "international human rights news",
  ];
}

/**
 * Build business interest queries
 * @param {string[]} businessInterests - Array of business interests (legacy)
 * @param {Object} businessDetails - Business details object with type, industry, keywords
 * @param {string} country - Country for location-specific business news
 * @returns {string[]} Array of business news queries
 */
function buildBusinessQueries(businessInterests, businessDetails, country) {
  const queries = [];

  // Handle new businessDetails format
  if (businessDetails && typeof businessDetails === "object") {
    const { type, industry, keywords } = businessDetails;

    if (type && typeof type === "string" && type.trim()) {
      queries.push(`${type.trim()} industry news ${country || "India"}`);
    }

    if (industry && typeof industry === "string" && industry.trim()) {
      queries.push(`${industry.trim()} trends`);
    }

    if (keywords && Array.isArray(keywords)) {
      for (const keyword of keywords) {
        if (keyword && typeof keyword === "string" && keyword.trim()) {
          queries.push(`${keyword.trim()} trends`);
        }
      }
    }
  }

  // Handle legacy businessInterests format for backward compatibility
  if (businessInterests && Array.isArray(businessInterests)) {
    for (const interest of businessInterests) {
      if (interest && typeof interest === "string") {
        const trimmedInterest = interest.trim();
        if (trimmedInterest) {
          queries.push(`${trimmedInterest} business news`);
          queries.push(`${trimmedInterest} trends`);
        }
      }
    }
  }

  return queries;
}

/**
 * Build community-related queries
 * @param {string} community - Community interest/cause (legacy)
 * @param {string[]} tags - Community/identity tags (Dalit, SC, ST, Bahujan, etc.)
 * @returns {string[]} Array of community news queries
 */
function buildCommunityQueries(community, tags) {
  const queries = [];

  // Handle legacy community format for backward compatibility
  if (community && typeof community === "string") {
    const trimmedCommunity = community.trim();
    if (trimmedCommunity) {
      queries.push(`${trimmedCommunity} schemes`);
      queries.push(`${trimmedCommunity} news`);
      queries.push(`${trimmedCommunity} initiatives`);
    }
  }

  // Handle new tags format - these are ALWAYS included for community relevance
  if (tags && Array.isArray(tags) && tags.length > 0) {
    for (const tag of tags) {
      if (tag && typeof tag === "string" && tag.trim()) {
        queries.push(`${tag.trim()} news India`);
      }
    }
  }

  // ALWAYS include mandatory community/identity-based queries (HIGH PRIORITY)
  // These queries are injected even if user doesn't explicitly provide tags
  const mandatoryQueries = [
    "Dalit news India",
    "SC ST schemes",
    "Bahujan movement",
    "Ambedkar news",
    "Social justice India",
  ];

  queries.push(...mandatoryQueries);

  return queries;
}

/**
 * Build all queries from user input
 * @param {Object} data - User input data
 * @param {Object} data.location - Location object (legacy)
 * @param {Object} data.user - User object with enhanced details (new format)
 * @param {string[]} data.businessInterests - Business interests array (legacy)
 * @param {string} data.community - Community interest (legacy)
 * @returns {string[]} Array of all search queries
 */
function buildAllQueries(data) {
  const allQueries = [];

  if (!data) {
    return allQueries;
  }

  // Support both new 'user' format and legacy format for backward compatibility
  const user = data.user || data;
  const location = user.location || data.location;
  const businessDetails = user.businessDetails;
  const businessInterests = data.businessInterests;
  const tags = user.tags;
  const community = data.community;
  const country = location?.country;

  // Add local news queries
  const localQueries = buildLocalQueries(location);
  allQueries.push(...localQueries);

  // Add national news queries
  if (country) {
    const nationalQueries = buildNationalQueries(country);
    allQueries.push(...nationalQueries);
  }

  // Add international news queries
  const internationalQueries = buildInternationalQueries();
  allQueries.push(...internationalQueries);

  // Add business interest queries (supports both new and legacy formats)
  const businessQueries = buildBusinessQueries(businessInterests, businessDetails, country);
  allQueries.push(...businessQueries);

  // Add community queries (supports both new tags and legacy community)
  const communityQueries = buildCommunityQueries(community, tags);
  allQueries.push(...communityQueries);

  // Remove duplicates and empty strings
  const uniqueQueries = [...new Set(allQueries.filter((q) => q && q.trim()))];

  return uniqueQueries;
}

module.exports = {
  buildLocalQueries,
  buildNationalQueries,
  buildInternationalQueries,
  buildBusinessQueries,
  buildCommunityQueries,
  buildAllQueries,
};
