# Flutter Community News API

A Firebase Cloud Functions backend that provides personalized news for Flutter + Firebase community apps. Fetches local, national, business, and community news with optional AI summarization.

## Features

- 🌍 **Local News** - News based on user city/state
- 🏛️ **National News** - News based on user country
- 💼 **Business News** - News related to user's business interests
- 👥 **Community News** - News about community causes and initiatives
- 🤖 **AI Summarization** - Optional GPT-4o-mini powered summaries (60-80 words)

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

### `getNews` - Callable Function

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

**Output:**

```json
{
  "status": "success",
  "results": [
    {
      "title": "Article Title",
      "url": "https://example.com/article",
      "summary": "AI-generated 60-80 word summary of the article...",
      "image": "https://example.com/image.jpg",
      "publishedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "queriesUsed": 10,
  "totalArticles": 15
}
```

**Error Response:**

```json
{
  "status": "error",
  "error": "Error message",
  "results": []
}
```

### `getNewsHttp` - HTTP Endpoint

For testing with curl or Postman. Same input/output as the callable function.

## Sample Requests

### Using curl

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

### Using Postman

1. Create a new POST request
2. URL: `https://your-region-your-project.cloudfunctions.net/getNewsHttp`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
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

Future<List<NewsArticle>> getNews(Map<String, dynamic> preferences) async {
  final functions = FirebaseFunctions.instance;
  final callable = functions.httpsCallable('getNews');

  final result = await callable.call(preferences);
  final data = result.data as Map<String, dynamic>;

  if (data['status'] == 'success') {
    final results = data['results'] as List<dynamic>;
    return results.map((item) => NewsArticle.fromJson(item)).toList();
  } else {
    throw Exception(data['error']);
  }
}
```

See `flutter_example/main.dart` for a complete implementation example.

## Query Building

The API builds search queries based on user input:

| Input | Generated Queries |
|-------|-------------------|
| City: "Ramgarh" | "Ramgarh news", "Ramgarh local news" |
| State: "Jharkhand" | "Jharkhand local news", "Jharkhand latest news" |
| Country: "India" | "India national news", "India latest news" |
| Business: "Bakery" | "Bakery business news", "Bakery trends" |
| Community: "Dalit empowerment" | "Dalit empowerment schemes", "Dalit empowerment news" |

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

## Error Handling

The API handles various error scenarios:

- **Missing location**: Returns error with message
- **Empty news results**: Returns empty array with message
- **News API failure**: Returns error, continues with other queries
- **Summarizer failure**: Falls back to original article description

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