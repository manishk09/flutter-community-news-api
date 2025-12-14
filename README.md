# Flutter Community News API

A Firebase Cloud Functions backend that provides personalized news for Flutter + Firebase community apps. Fetches local, national, business, and community news with optional AI summarization.

## Features

- 🌍 **Local News** - City and state-level news personalization
- 🏛️ **National News** - Country-specific headlines and updates
- 🌐 **International News** - World headlines and global human rights news
- 💼 **Business Personalization** - News tailored to business type, industry, and keywords
- 👥 **Community Focus** - Prioritized coverage of Dalit, SC/ST, Bahujan, and social justice topics
- 🎯 **Relevance Boosting** - Intelligent ranking that elevates marginalized community news
- 🏷️ **Smart Categorization** - Automatic classification by coverage type and content categories
- 🤖 **AI Summarization** - Optional GPT-4o-mini powered summaries (60-80 words)
- 🔄 **Backward Compatible** - Supports both enhanced and legacy API formats

## Project Structure

```
/
├── functions/
│   ├── index.js              # Main Firebase Cloud Functions
│   ├── package.json          # Node.js dependencies
│   ├── utils/
│   │   ├── queryBuilder.js   # Query building utilities
│   │   ├── newsFetcher.js    # News API integration
│   │   └── summarizer.js     # OpenAI summarization
│   └── test/
│       └── getNews.test.js   # Jest unit tests
│
├── flutter_example/
│   └── main.dart             # Flutter integration example
│
├── .github/workflows/
│   └── test.yml              # CI/CD pipeline
│
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project
- GNews API key (get one at [gnews.io](https://gnews.io/))
- OpenAI API key (optional, for AI summarization)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/flutter-community-news-api.git
   cd flutter-community-news-api
   ```

2. **Install dependencies**

   ```bash
   cd functions
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the `functions` directory:

   ```bash
   cp .env.example functions/.env
   ```

   Edit the file with your API keys:

   ```
   NEWS_API_KEY=your_gnews_api_key
   OPENAI_API_KEY=your_openai_key
   ```

4. **Configure Firebase**

   ```bash
   firebase login
   firebase init functions
   ```

   Set Firebase config variables:

   ```bash
   firebase functions:config:set news.key="YOUR_GNEWS_API_KEY"
   firebase functions:config:set openai.key="YOUR_OPENAI_KEY"
   ```

### Running Tests

```bash
cd functions
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

### Local Development

Start the Firebase emulator:

```bash
cd functions
npm run serve
```

Or use Firebase emulators:

```bash
firebase emulators:start --only functions
```

### Deployment

Deploy to Firebase:

```bash
firebase deploy --only functions
```

## API Reference

### Input Schema

The API accepts a flexible input schema that supports both enhanced personalization and backward compatibility.

#### New Format (Enhanced Schema)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user` | Object | Yes | Container for user preferences |
| `user.location` | Object | Yes | User's location information |
| `user.location.city` | String | No | City name (e.g., "Ramgarh") |
| `user.location.state` | String | No | State/province name (e.g., "Jharkhand") |
| `user.location.country` | String | No* | Country name (e.g., "India") |
| `user.businessDetails` | Object | No | Business information for personalized news |
| `user.businessDetails.type` | String | No | Business type (e.g., "Bakery") |
| `user.businessDetails.industry` | String | No | Industry sector (e.g., "Food & Beverage") |
| `user.businessDetails.keywords` | Array<String> | No | Related keywords (e.g., ["bakery", "MSME"]) |
| `user.tags` | Array<String> | No | Community/identity tags (e.g., ["dalit", "sc"]) |
| `user.language` | String | No | Preferred language code (default: "en") |

\* At least one of city, state, or country is required

#### Legacy Format (Still Supported)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `location` | Object | Yes | Location information |
| `location.city` | String | No | City name |
| `location.state` | String | No | State name |
| `location.country` | String | No* | Country name |
| `businessInterests` | Array<String> | No | Array of business interest keywords |
| `community` | String | No | Community interest/cause |

### `getNews` - Callable Function

The API supports both an **enhanced new format** and the **legacy format** for backward compatibility.

#### New Format (Enhanced with Personalization)

**Input:**

```json
{
  "user": {
    "location": {
      "city": "Ramgarh",
      "state": "Jharkhand",
      "country": "India"
    },
    "businessDetails": {
      "type": "Bakery",
      "industry": "Food & Beverage",
      "keywords": ["bakery", "small business", "MSME"]
    },
    "tags": ["dalit", "sc", "st", "bahujan"],
    "language": "en"
  }
}
```

**Output:**

```json
{
  "status": "success",
  "news": [
    {
      "title": "Article Title",
      "url": "https://example.com/article",
      "summary": "AI-generated 60-80 word summary of the article...",
      "image": "https://example.com/image.jpg",
      "publishedAt": "2024-01-15T10:00:00Z",
      "source": "News Source",
      "coverage": "local",
      "categories": ["dalit", "business", "policy"]
    }
  ],
  "results": [],
  "queriesUsed": 15,
  "totalArticles": 20
}
```

#### Legacy Format (Still Supported)

**Input:**

```json
{
  "location": {
    "city": "Ramgarh",
    "state": "Jharkhand",
    "country": "India"
  },
  "businessInterests": ["Bakery", "Gift Studio"],
  "community": "Dalit empowerment"
}
```

**Output:** Same structure as new format (includes both `news` and `results` arrays for backward compatibility)

**Error Response:**

```json
{
  "status": "error",
  "error": "Error message",
  "news": [],
  "results": []
}
```

### `getNewsHttp` - HTTP Endpoint

For testing with curl or Postman. Same input/output as the callable function.

## Sample Requests

### Using curl (New Format - Recommended)

```bash
curl -X POST \
  https://your-region-your-project.cloudfunctions.net/getNewsHttp \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "location": {
        "city": "Ramgarh",
        "state": "Jharkhand",
        "country": "India"
      },
      "businessDetails": {
        "type": "Bakery",
        "industry": "Food & Beverage",
        "keywords": ["bakery", "small business", "MSME"]
      },
      "tags": ["dalit", "sc", "st", "bahujan"],
      "language": "en"
    }
  }'
```

### Using curl (Legacy Format - Still Supported)

```bash
curl -X POST \
  https://your-region-your-project.cloudfunctions.net/getNewsHttp \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "city": "Ramgarh",
      "state": "Jharkhand",
      "country": "India"
    },
    "businessInterests": ["Bakery", "Gift Studio"],
    "community": "Dalit empowerment"
  }'
```

### Sample Response

```json
{
  "status": "success",
  "news": [
    {
      "title": "New SC/ST Welfare Scheme Announced in Jharkhand",
      "url": "https://example.com/article1",
      "summary": "The Jharkhand government has announced a new welfare scheme aimed at providing financial assistance to SC/ST entrepreneurs in the bakery and food industry. The scheme offers low-interest loans and training programs...",
      "image": "https://example.com/image1.jpg",
      "publishedAt": "2024-01-15T10:00:00Z",
      "source": "The Times of India",
      "coverage": "local",
      "categories": ["dalit", "policy", "business"]
    },
    {
      "title": "Ambedkar Jayanti Celebrations Draw Thousands in Ramgarh",
      "url": "https://example.com/article2",
      "summary": "Thousands gathered in Ramgarh to celebrate Dr. B.R. Ambedkar's birth anniversary with cultural programs and discussions on social justice. Local Bahujan leaders emphasized the importance of...",
      "image": "https://example.com/image2.jpg",
      "publishedAt": "2024-01-14T15:30:00Z",
      "source": "Hindustan Times",
      "coverage": "local",
      "categories": ["dalit", "ambedkar", "social-justice"]
    },
    {
      "title": "World Bank Report Highlights Social Justice Progress in India",
      "url": "https://example.com/article3",
      "summary": "A new World Bank report examines progress in social justice initiatives across India, with specific focus on reservation policies and economic empowerment programs for marginalized communities...",
      "image": "https://example.com/image3.jpg",
      "publishedAt": "2024-01-14T09:00:00Z",
      "source": "Reuters",
      "coverage": "international",
      "categories": ["social-justice", "policy"]
    }
  ],
  "results": [...],
  "queriesUsed": 15,
  "totalArticles": 25
}
```

### Using Postman

1. Create a new POST request
2. URL: `https://your-region-your-project.cloudfunctions.net/getNewsHttp`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON) - Use either the new format or legacy format shown above

## Flutter Integration

### Add Dependencies

In your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^2.24.2
  cloud_functions: ^4.5.8
  url_launcher: ^6.2.1
```

### Initialize Firebase

```dart
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}
```

### Call the Function

```dart
import 'package:cloud_functions/cloud_functions.dart';

// New format (recommended)
Future<List<NewsArticle>> getNews(Map<String, dynamic> preferences) async {
  final functions = FirebaseFunctions.instance;
  final callable = functions.httpsCallable('getNews');

  final result = await callable.call(preferences);
  final data = result.data as Map<String, dynamic>;

  if (data['status'] == 'success') {
    // Use 'news' field for new format (falls back to 'results' for compatibility)
    final news = (data['news'] ?? data['results']) as List<dynamic>;
    return news.map((item) => NewsArticle.fromJson(item)).toList();
  } else {
    throw Exception(data['error']);
  }
}

// Example usage with new format
final newsArticles = await getNews({
  'user': {
    'location': {
      'city': 'Ramgarh',
      'state': 'Jharkhand',
      'country': 'India',
    },
    'businessDetails': {
      'type': 'Bakery',
      'industry': 'Food & Beverage',
      'keywords': ['bakery', 'small business', 'MSME'],
    },
    'tags': ['dalit', 'sc', 'st', 'bahujan'],
    'language': 'en',
  },
});

// NewsArticle model (update to include new fields)
class NewsArticle {
  final String title;
  final String url;
  final String summary;
  final String image;
  final String publishedAt;
  final String source;
  final String coverage;  // "local", "national", or "international"
  final List<String> categories;  // ["dalit", "business", "policy", etc.]

  NewsArticle({
    required this.title,
    required this.url,
    required this.summary,
    required this.image,
    required this.publishedAt,
    required this.source,
    required this.coverage,
    required this.categories,
  });

  factory NewsArticle.fromJson(Map<String, dynamic> json) {
    return NewsArticle(
      title: json['title'] ?? '',
      url: json['url'] ?? '',
      summary: json['summary'] ?? '',
      image: json['image'] ?? '',
      publishedAt: json['publishedAt'] ?? '',
      source: json['source'] ?? '',
      coverage: json['coverage'] ?? 'national',
      categories: List<String>.from(json['categories'] ?? []),
    );
  }
}
```

See `flutter_example/main.dart` for a complete implementation example.

## Personalization Features

### Intelligent Query Building

The API builds comprehensive search queries based on user input to deliver personalized news:

| Input Type | Example | Generated Queries |
|------------|---------|-------------------|
| **Local News** | City: "Ramgarh" | "Ramgarh news", "Ramgarh local news" |
| | State: "Jharkhand" | "Jharkhand local news", "Jharkhand latest news" |
| **National News** | Country: "India" | "India national headlines", "India latest news" |
| **International News** | (Always included) | "world headlines", "international human rights news" |
| **Business (New)** | Type: "Bakery", Industry: "Food & Beverage" | "Bakery industry news India", "Food & Beverage trends" |
| | Keywords: ["MSME"] | "MSME trends" |
| **Business (Legacy)** | "Bakery" | "Bakery business news", "Bakery trends" |
| **Community (Legacy)** | "Dalit empowerment" | "Dalit empowerment schemes", "Dalit empowerment news" |
| **Community Tags** | tags: ["dalit"] | "dalit news India" |

### Mandatory Community Queries

**IMPORTANT:** The API always includes these queries to ensure community-relevant news is present:

- "Dalit news India"
- "SC ST schemes"
- "Bahujan movement"
- "Ambedkar news"
- "Social justice India"

These queries are included regardless of user input to prioritize marginalized community representation.

## Community Relevance Boosting

### How It Works

The API includes an intelligent relevance boosting system that prioritizes news articles about marginalized communities:

**1. Keyword Detection**

Articles are scanned for community-relevant keywords including:
- dalit, dalits
- sc, st, sc/st
- scheduled caste, scheduled tribe
- bahujan
- ambedkar, dr ambedkar
- reservation, reservations
- atrocity, atrocities
- social justice
- caste discrimination
- untouchability
- backward class, backward classes
- obc (Other Backward Classes)

**2. Relevance Scoring**

Each article receives a relevance score based on:
- Number of keyword matches (10 points per match)
- Keyword presence in title vs description
- Total keyword frequency

**3. Automatic Ranking**

Articles are automatically ranked:
1. **Primary sort:** By relevance score (community-relevant articles first)
2. **Secondary sort:** By published date (newest first)

This ensures that news about Dalit, SC/ST, Bahujan, and social justice issues appears prominently in results, even when mixed with general business or local news.

### Article Classification

Each article is automatically classified with:

**Coverage Type:**
- `local` - City or state-level news
- `national` - Country-level news
- `international` - World news

**Categories (array):**
- `dalit` - Articles about Dalit community, SC/ST issues
- `bahujan` - Articles about Bahujan movement
- `ambedkar` - Articles mentioning Dr. Ambedkar
- `social-justice` - Articles about social justice topics
- `business` - Business and economic news
- `policy` - Government policies and schemes

### Why This Matters

Traditional news aggregators often bury news about marginalized communities. This API actively promotes such content to ensure:
- Fair representation of community issues
- Visibility for social justice topics
- Awareness of schemes and policies for SC/ST/OBC communities
- Coverage of Dalit empowerment initiatives

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEWS_API_KEY` | GNews API key | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key for summarization | No | - |
| `OPENAI_MODEL` | OpenAI model for summarization | No | `gpt-4o-mini` |
| `NEWS_QUERY_LIMIT` | Max number of search queries | No | `5` |
| `NEWS_MAX_RESULTS_PER_QUERY` | Max results per query | No | `3` |

### Firebase Config

```bash
# Set required variables
firebase functions:config:set news.key="YOUR_GNEWS_API_KEY"
firebase functions:config:set openai.key="YOUR_OPENAI_KEY"

# View current config
firebase functions:config:get
```

## CI/CD

The project includes a GitHub Actions workflow that:

1. Runs on push to `main`/`master` and pull requests
2. Tests against Node.js 18.x and 20.x
3. Runs ESLint for code quality
4. Runs Jest tests with coverage
5. Uploads coverage reports as artifacts

## Backward Compatibility

### Migration Guide

The API is fully backward compatible. Existing applications will continue to work without any changes.

**What stays the same:**
- Legacy input format (`location`, `businessInterests`, `community`) still works
- Response includes both `news` and `results` arrays
- All existing functionality is preserved

**What's new (optional to adopt):**
- Enhanced `user` object with `businessDetails` and `tags`
- New response fields: `coverage` and `categories`
- Automatic community relevance boosting
- Mandatory community queries for better representation

**Migration Steps (Optional):**

1. **Update your request format** from:
   ```json
   {
     "location": {...},
     "businessInterests": ["Bakery"],
     "community": "Dalit empowerment"
   }
   ```
   
   To:
   ```json
   {
     "user": {
       "location": {...},
       "businessDetails": {
         "type": "Bakery",
         "keywords": ["bakery"]
       },
       "tags": ["dalit"]
     }
   }
   ```

2. **Update your response handling** to use `news` instead of `results` (both are provided)

3. **Leverage new fields**: Use `coverage` and `categories` for filtering/display

## Error Handling

The API handles various error scenarios:

- **Missing location**: Returns error with message
- **Empty news results**: Returns empty array with message
- **News API failure**: Returns error, continues with other queries
- **Summarizer failure**: Falls back to original article description
- **Invalid user object**: Falls back to legacy format parsing

## License

MIT License - feel free to use this project for your own applications.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Support

For issues and feature requests, please open an issue on GitHub.