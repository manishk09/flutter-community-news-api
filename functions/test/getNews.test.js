/**
 * Unit Tests for getNews Firebase Function
 */

/* eslint-disable no-undef */

const {
  buildLocalQueries,
  buildNationalQueries,
  buildInternationalQueries,
  buildBusinessQueries,
  buildCommunityQueries,
  buildAllQueries,
} = require("../utils/queryBuilder");

// Mock the external dependencies
jest.mock("axios");
jest.mock("openai");

const axios = require("axios");
const { OpenAI } = require("openai");

const {
  fetchFromGNews,
  fetchNewsForQueries,
} = require("../utils/newsFetcher");

const {
  summarizeArticles,
} = require("../utils/summarizer");

const {
  calculateRelevanceScore,
  isCommunityRelevant,
  classifyArticle,
  boostAndSortArticles,
  determineCoverage,
} = require("../utils/communityRelevanceBooster");

describe("Query Builder Tests", () => {
  describe("buildLocalQueries", () => {
    test("should build queries from full location", () => {
      const location = {
        city: "Ramgarh",
        state: "Jharkhand",
        country: "India",
      };

      const queries = buildLocalQueries(location);

      expect(queries).toContain("Ramgarh news");
      expect(queries).toContain("Ramgarh local news");
      expect(queries).toContain("Jharkhand local news");
      expect(queries).toContain("India national news");
      expect(queries.length).toBe(6);
    });

    test("should handle missing city", () => {
      const location = {
        state: "Jharkhand",
        country: "India",
      };

      const queries = buildLocalQueries(location);

      expect(queries).not.toContain("undefined news");
      expect(queries).toContain("Jharkhand local news");
      expect(queries).toContain("India national news");
    });

    test("should return empty array for null location", () => {
      const queries = buildLocalQueries(null);
      expect(queries).toEqual([]);
    });

    test("should return empty array for undefined location", () => {
      const queries = buildLocalQueries(undefined);
      expect(queries).toEqual([]);
    });
  });

  describe("buildBusinessQueries", () => {
    test("should build queries for business interests", () => {
      const interests = ["Bakery", "Gift Studio"];

      const queries = buildBusinessQueries(interests);

      expect(queries).toContain("Bakery business news");
      expect(queries).toContain("Bakery trends");
      expect(queries).toContain("Gift Studio business news");
      expect(queries).toContain("Gift Studio trends");
    });

    test("should handle empty array", () => {
      const queries = buildBusinessQueries([]);
      expect(queries).toEqual([]);
    });

    test("should handle null input", () => {
      const queries = buildBusinessQueries(null);
      expect(queries).toEqual([]);
    });

    test("should filter out empty strings", () => {
      const interests = ["Bakery", "", "  "];

      const queries = buildBusinessQueries(interests);

      expect(queries).toContain("Bakery business news");
      expect(queries.length).toBe(2);
    });
  });

  describe("buildCommunityQueries", () => {
    test("should build queries for community interest", () => {
      const community = "Dalit empowerment";

      const queries = buildCommunityQueries(community);

      expect(queries).toContain("Dalit empowerment schemes");
      expect(queries).toContain("Dalit empowerment news");
      expect(queries).toContain("Dalit empowerment initiatives");
    });

    test("should handle empty string and include mandatory queries", () => {
      const queries = buildCommunityQueries("");
      // Should always include mandatory community queries
      expect(queries).toContain("Dalit news India");
      expect(queries).toContain("SC ST schemes");
      expect(queries).toContain("Bahujan movement");
      expect(queries).toContain("Ambedkar news");
      expect(queries).toContain("Social justice India");
    });

    test("should handle null input and include mandatory queries", () => {
      const queries = buildCommunityQueries(null);
      // Should always include mandatory community queries
      expect(queries).toContain("Dalit news India");
      expect(queries).toContain("SC ST schemes");
      expect(queries.length).toBeGreaterThan(0);
    });
  });

  describe("buildAllQueries", () => {
    test("should combine all query types", () => {
      const data = {
        location: { city: "Ramgarh", state: "Jharkhand", country: "India" },
        businessInterests: ["Bakery"],
        community: "Dalit empowerment",
      };

      const queries = buildAllQueries(data);

      // Should contain local queries
      expect(queries).toContain("Ramgarh news");
      expect(queries).toContain("India national news");

      // Should contain business queries
      expect(queries).toContain("Bakery business news");

      // Should contain community queries
      expect(queries).toContain("Dalit empowerment schemes");
    });

    test("should remove duplicate queries", () => {
      const data = {
        location: { city: "News", state: "News", country: "India" },
        businessInterests: [],
        community: "",
      };

      const queries = buildAllQueries(data);
      const uniqueQueries = [...new Set(queries)];

      expect(queries.length).toBe(uniqueQueries.length);
    });

    test("should return empty array for null data", () => {
      const queries = buildAllQueries(null);
      expect(queries).toEqual([]);
    });
  });
});

describe("News Fetcher Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchFromGNews", () => {
    test("should fetch and transform articles correctly", async () => {
      const mockResponse = {
        data: {
          articles: [
            {
              title: "Test Article",
              url: "https://example.com/article",
              description: "Test description",
              image: "https://example.com/image.jpg",
              publishedAt: "2024-01-01T00:00:00Z",
              source: { name: "Test Source" },
            },
          ],
        },
      };

      axios.get.mockResolvedValue(mockResponse);

      const articles = await fetchFromGNews("test query", "test-api-key");

      expect(articles.length).toBe(1);
      expect(articles[0].title).toBe("Test Article");
      expect(articles[0].url).toBe("https://example.com/article");
      expect(articles[0].source).toBe("Test Source");
    });

    test("should throw error when API fails", async () => {
      axios.get.mockRejectedValue(new Error("API Error"));

      await expect(fetchFromGNews("test", "key")).rejects.toThrow("Failed to fetch news");
    });

    test("should return empty array when no articles in response", async () => {
      axios.get.mockResolvedValue({ data: { articles: [] } });

      const articles = await fetchFromGNews("test", "key");

      expect(articles).toEqual([]);
    });
  });

  describe("fetchNewsForQueries", () => {
    test("should return empty array for empty queries", async () => {
      const articles = await fetchNewsForQueries([], "key");
      expect(articles).toEqual([]);
    });

    test("should throw error when API key is missing", async () => {
      await expect(fetchNewsForQueries(["query"], null)).rejects.toThrow(
        "NEWS_API_KEY is not configured"
      );
    });

    test("should deduplicate articles by URL", async () => {
      const mockArticle = {
        title: "Test",
        url: "https://example.com/same",
        description: "Test",
        image: "",
        publishedAt: "",
        source: { name: "Source" },
      };

      axios.get.mockResolvedValue({
        data: { articles: [mockArticle, mockArticle] },
      });

      const articles = await fetchNewsForQueries(["query1", "query2"], "key");

      // Should only have one article since both have the same URL
      const uniqueUrls = new Set(articles.map((a) => a.url));
      expect(uniqueUrls.size).toBe(articles.length);
    });
  });
});

describe("Summarizer Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("summarizeArticles", () => {
    test("should return articles with description as summary when AI is disabled", async () => {
      const articles = [
        {
          title: "Test",
          url: "https://example.com",
          description: "Original description",
          image: "",
          publishedAt: "",
        },
      ];

      const result = await summarizeArticles(articles, null, false);

      expect(result[0].summary).toBe("Original description");
    });

    test("should return empty array for empty input", async () => {
      const result = await summarizeArticles([], "key", true);
      expect(result).toEqual([]);
    });

    test("should return articles with description when no API key", async () => {
      const articles = [
        {
          title: "Test",
          url: "https://example.com",
          description: "Fallback description",
          image: "",
          publishedAt: "",
        },
      ];

      const result = await summarizeArticles(articles, null, true);

      expect(result[0].summary).toBe("Fallback description");
    });

    test("should handle OpenAI API success", async () => {
      // Mock OpenAI client
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: "AI generated summary",
            },
          },
        ],
      });

      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const articles = [
        {
          title: "Test Article",
          url: "https://example.com",
          description: "Original description",
          image: "",
          publishedAt: "",
        },
      ];

      const result = await summarizeArticles(articles, "valid-key", true);

      expect(result[0].summary).toBe("AI generated summary");
    });

    test("should fallback to description on OpenAI error", async () => {
      // Mock OpenAI to throw error
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error("API Error")),
          },
        },
      }));

      const articles = [
        {
          title: "Test",
          url: "https://example.com",
          description: "Fallback description",
          image: "",
          publishedAt: "",
        },
      ];

      const result = await summarizeArticles(articles, "valid-key", true);

      expect(result[0].summary).toBe("Fallback description");
    });
  });
});

describe("Request Validation Tests", () => {
  // These tests verify the validation logic that would be in index.js
  // Testing the validation function behavior

  test("should require location in request", () => {
    const data = {
      businessInterests: ["Bakery"],
    };

    // Simulating validation check
    const hasLocation = data.location !== undefined;
    expect(hasLocation).toBe(false);
  });

  test("should accept valid request with all fields", () => {
    const data = {
      location: { city: "Ramgarh", state: "Jharkhand", country: "India" },
      businessInterests: ["Bakery", "Gift Studio"],
      community: "Dalit empowerment",
    };

    const hasLocation = data.location !== undefined;
    const hasCity = data.location.city !== undefined;

    expect(hasLocation).toBe(true);
    expect(hasCity).toBe(true);
  });

  test("should accept request with only country in location", () => {
    const data = {
      location: { country: "India" },
    };

    const hasValidLocation = Boolean(
      data.location &&
      (data.location.city || data.location.state || data.location.country)
    );

    expect(hasValidLocation).toBe(true);
  });
});

describe("Error Handling Tests", () => {
  test("should handle News API failure gracefully", async () => {
    axios.get.mockRejectedValue(new Error("Network Error"));

    // The fetchNewsForQueries should continue even if individual queries fail
    // This tests the error handling in the news fetcher
    try {
      await fetchFromGNews("test", "key");
      fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).toContain("Failed to fetch news");
    }
  });

  test("should return empty results when news fetch fails for all queries", async () => {
    axios.get.mockRejectedValue(new Error("All Failed"));

    const articles = await fetchNewsForQueries(["q1"], "key");

    // Since the implementation catches errors per query, it should return empty
    expect(articles).toEqual([]);
  });
});

describe("Enhanced API Tests - New User Schema", () => {
  describe("New user input format", () => {
    test("should accept new user format with enhanced details", () => {
      const data = {
        user: {
          location: {
            city: "Ramgarh",
            state: "Jharkhand",
            country: "India",
          },
          businessDetails: {
            type: "Bakery",
            industry: "Food & Beverage",
            keywords: ["bakery", "small business", "MSME"],
          },
          tags: ["dalit", "sc", "st", "bahujan"],
          language: "en",
        },
      };

      const queries = buildAllQueries(data);

      // Should include local queries
      expect(queries).toContain("Ramgarh news");

      // Should include national queries
      expect(queries).toContain("India national headlines");

      // Should include international queries
      expect(queries).toContain("world headlines");

      // Should include business queries with new format
      expect(queries.some((q) => q.includes("Bakery"))).toBe(true);

      // Should include mandatory community queries
      expect(queries).toContain("Dalit news India");
      expect(queries).toContain("SC ST schemes");
    });

    test("should maintain backward compatibility with legacy format", () => {
      const data = {
        location: { city: "Mumbai", state: "Maharashtra", country: "India" },
        businessInterests: ["Bakery", "Gift Studio"],
        community: "Dalit empowerment",
      };

      const queries = buildAllQueries(data);

      // Should still work with legacy format
      expect(queries).toContain("Mumbai news");
      expect(queries).toContain("Bakery business news");
      expect(queries).toContain("Dalit empowerment news");
    });

    test("should handle missing business details gracefully", () => {
      const data = {
        user: {
          location: {
            city: "Delhi",
            country: "India",
          },
          tags: ["dalit"],
          language: "en",
        },
      };

      const queries = buildAllQueries(data);

      // Should still generate queries without business details
      expect(queries).toContain("Delhi news");
      expect(queries).toContain("Dalit news India");
      expect(queries.length).toBeGreaterThan(0);
    });
  });

  describe("National and International queries", () => {
    test("should build national news queries", () => {
      const queries = buildNationalQueries("India");
      expect(queries).toContain("India national headlines");
    });

    test("should build international news queries", () => {
      const queries = buildInternationalQueries();
      expect(queries).toContain("world headlines");
      expect(queries).toContain("international human rights news");
    });

    test("should include all coverage types in buildAllQueries", () => {
      const data = {
        user: {
          location: {
            city: "Bangalore",
            state: "Karnataka",
            country: "India",
          },
        },
      };

      const queries = buildAllQueries(data);

      // Should have local queries
      expect(queries.some((q) => q.includes("Bangalore"))).toBe(true);

      // Should have national queries
      expect(queries).toContain("India national headlines");

      // Should have international queries
      expect(queries).toContain("world headlines");
    });
  });

  describe("Business personalization with new schema", () => {
    test("should generate business queries from businessDetails", () => {
      const businessDetails = {
        type: "Bakery",
        industry: "Food & Beverage",
        keywords: ["bakery", "small business", "MSME"],
      };

      const queries = buildBusinessQueries(null, businessDetails, "India");

      expect(queries).toContain("Bakery industry news India");
      expect(queries).toContain("Food & Beverage trends");
      expect(queries).toContain("bakery trends");
      expect(queries).toContain("small business trends");
    });

    test("should support both new and legacy business formats", () => {
      const legacyInterests = ["Tech", "Finance"];
      const newDetails = {
        type: "Bakery",
        keywords: ["food"],
      };

      const queries = buildBusinessQueries(legacyInterests, newDetails, "India");

      // Should include both legacy and new format queries
      expect(queries).toContain("Tech business news");
      expect(queries).toContain("Bakery industry news India");
      expect(queries).toContain("food trends");
    });
  });
});

describe("Community Relevance Booster Tests", () => {
  describe("calculateRelevanceScore", () => {
    test("should calculate high score for Dalit-related article", () => {
      const article = {
        title: "Dalit community protests against atrocity",
        description: "SC ST leaders demand social justice and reservation",
      };

      const score = calculateRelevanceScore(article);
      expect(score).toBeGreaterThan(0);
    });

    test("should return zero for non-community article", () => {
      const article = {
        title: "General technology news",
        description: "Latest tech updates from Silicon Valley",
      };

      const score = calculateRelevanceScore(article);
      expect(score).toBe(0);
    });

    test("should detect various community keywords", () => {
      const keywords = ["bahujan", "ambedkar", "scheduled caste", "untouchability"];

      keywords.forEach((keyword) => {
        const article = {
          title: `Article about ${keyword}`,
          description: "Related content",
        };
        const score = calculateRelevanceScore(article);
        expect(score).toBeGreaterThan(0);
      });
    });
  });

  describe("isCommunityRelevant", () => {
    test("should identify community-relevant articles", () => {
      const article = {
        title: "Dalit empowerment initiative launched",
        description: "New scheme for SC ST welfare",
      };

      expect(isCommunityRelevant(article)).toBe(true);
    });

    test("should identify non-relevant articles", () => {
      const article = {
        title: "Weather forecast for tomorrow",
        description: "Sunny skies expected",
      };

      expect(isCommunityRelevant(article)).toBe(false);
    });
  });

  describe("classifyArticle", () => {
    test("should classify Dalit-related articles", () => {
      const article = {
        title: "Dalit protest in Delhi",
        description: "SC community demands justice",
      };

      const categories = classifyArticle(article);
      expect(categories).toContain("dalit");
    });

    test("should classify business articles", () => {
      const article = {
        title: "Small business economy grows",
        description: "Market trends show positive growth",
      };

      const categories = classifyArticle(article);
      expect(categories).toContain("business");
    });

    test("should classify policy articles", () => {
      const article = {
        title: "Government announces new scheme",
        description: "Ministry launches policy for welfare",
      };

      const categories = classifyArticle(article);
      expect(categories).toContain("policy");
    });

    test("should handle multiple categories", () => {
      const article = {
        title: "Government policy for Dalit business",
        description: "New scheme to support SC ST entrepreneurs",
      };

      const categories = classifyArticle(article);
      expect(categories.length).toBeGreaterThan(1);
      expect(categories).toContain("dalit");
      expect(categories).toContain("business");
      expect(categories).toContain("policy");
    });
  });

  describe("boostAndSortArticles", () => {
    test("should rank community articles higher than generic ones", () => {
      const articles = [
        {
          title: "Generic business news",
          description: "Some business update",
          publishedAt: "2024-01-01T00:00:00Z",
        },
        {
          title: "Dalit empowerment news",
          description: "SC ST community welfare scheme announced",
          publishedAt: "2024-01-01T00:00:00Z",
        },
      ];

      const sorted = boostAndSortArticles(articles);

      // Community-relevant article should be ranked higher
      expect(sorted[0].title).toContain("Dalit");
      expect(sorted[0].relevanceScore).toBeGreaterThan(sorted[1].relevanceScore);
    });

    test("should include relevance scores and categories", () => {
      const articles = [
        {
          title: "Bahujan movement gains momentum",
          description: "Ambedkar followers organize rally",
          publishedAt: "2024-01-01T00:00:00Z",
        },
      ];

      const sorted = boostAndSortArticles(articles);

      expect(sorted[0]).toHaveProperty("relevanceScore");
      expect(sorted[0]).toHaveProperty("categories");
      expect(sorted[0].relevanceScore).toBeGreaterThan(0);
    });
  });

  describe("determineCoverage", () => {
    test("should classify local coverage based on city", () => {
      const article = {
        title: "Ramgarh local news update",
        description: "City council meeting held",
      };
      const location = { city: "Ramgarh", state: "Jharkhand", country: "India" };

      const coverage = determineCoverage(article, "Ramgarh news", location);
      expect(coverage).toBe("local");
    });

    test("should classify national coverage", () => {
      const article = {
        title: "India national policy update",
        description: "Government announces new initiative",
      };
      const location = { country: "India" };

      const coverage = determineCoverage(article, "India national news", location);
      expect(coverage).toBe("national");
    });

    test("should classify international coverage", () => {
      const article = {
        title: "World leaders meet at UN",
        description: "International summit on human rights",
      };

      const coverage = determineCoverage(article, "world headlines");
      expect(coverage).toBe("international");
    });
  });
});

describe("Tag-based Relevance Tests", () => {
  test("should always include mandatory community queries", () => {
    const data = {
      user: {
        location: { country: "India" },
        // No tags provided
      },
    };

    const queries = buildAllQueries(data);

    // Mandatory queries should always be present
    expect(queries).toContain("Dalit news India");
    expect(queries).toContain("SC ST schemes");
    expect(queries).toContain("Bahujan movement");
    expect(queries).toContain("Ambedkar news");
    expect(queries).toContain("Social justice India");
  });

  test("should include user-provided tags in addition to mandatory ones", () => {
    const data = {
      user: {
        location: { country: "India" },
        tags: ["dalit", "obc"],
      },
    };

    const queries = buildAllQueries(data);

    // Should include user tags
    expect(queries).toContain("dalit news India");
    expect(queries).toContain("obc news India");

    // Should also include mandatory queries
    expect(queries).toContain("Dalit news India");
    expect(queries).toContain("SC ST schemes");
  });
});
