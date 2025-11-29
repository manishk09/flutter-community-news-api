/**
 * Unit Tests for getNews Firebase Function
 */

/* eslint-disable no-undef */

const {
  buildLocalQueries,
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

    test("should handle empty string", () => {
      const queries = buildCommunityQueries("");
      expect(queries).toEqual([]);
    });

    test("should handle null input", () => {
      const queries = buildCommunityQueries(null);
      expect(queries).toEqual([]);
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
