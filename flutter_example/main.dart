import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';

/// Flutter Community News App
/// Integrates with Firebase Cloud Functions to fetch personalized news
///
/// Dependencies required in pubspec.yaml:
/// ```yaml
/// dependencies:
///   flutter:
///     sdk: flutter
///   firebase_core: ^2.24.2
///   cloud_functions: ^4.5.8
///   url_launcher: ^6.2.1
/// ```

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize Firebase before running the app
  // await Firebase.initializeApp();
  runApp(const CommunityNewsApp());
}

class CommunityNewsApp extends StatelessWidget {
  const CommunityNewsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Community News',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const NewsHomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

/// Main news page widget
class NewsHomePage extends StatefulWidget {
  const NewsHomePage({super.key});

  @override
  State<NewsHomePage> createState() => _NewsHomePageState();
}

class _NewsHomePageState extends State<NewsHomePage> {
  List<NewsArticle> _articles = [];
  bool _isLoading = false;
  String? _errorMessage;

  // User preferences (can be loaded from user profile)
  final Map<String, dynamic> _userPreferences = {
    'location': {
      'city': 'Ramgarh',
      'state': 'Jharkhand',
      'country': 'India',
    },
    'businessInterests': ['Bakery', 'Gift Studio'],
    'community': 'Dalit empowerment',
  };

  @override
  void initState() {
    super.initState();
    _fetchNews();
  }

  /// Fetch news from Firebase Cloud Function
  Future<void> _fetchNews() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await NewsService.getNews(_userPreferences);
      setState(() {
        _articles = results;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Community News'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchNews,
            tooltip: 'Refresh News',
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _showPreferencesDialog(context),
            tooltip: 'Settings',
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Fetching personalized news...'),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Error: $_errorMessage',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _fetchNews,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_articles.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.newspaper, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No news articles found.\nTry adjusting your preferences.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchNews,
      child: ListView.builder(
        padding: const EdgeInsets.all(8),
        itemCount: _articles.length,
        itemBuilder: (context, index) {
          return NewsCard(article: _articles[index]);
        },
      ),
    );
  }

  void _showPreferencesDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('News Preferences'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('City: ${_userPreferences['location']['city']}'),
            Text('State: ${_userPreferences['location']['state']}'),
            Text('Country: ${_userPreferences['location']['country']}'),
            const SizedBox(height: 8),
            Text(
              'Business Interests: ${(_userPreferences['businessInterests'] as List).join(', ')}',
            ),
            const SizedBox(height: 8),
            Text('Community: ${_userPreferences['community']}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

/// News article card widget
class NewsCard extends StatelessWidget {
  final NewsArticle article;

  const NewsCard({super.key, required this.article});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _openArticle(article.url),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Article image
            if (article.image.isNotEmpty)
              Image.network(
                article.image,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    height: 200,
                    color: Colors.grey[300],
                    child: const Center(
                      child: Icon(Icons.image_not_supported, size: 64),
                    ),
                  );
                },
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    article.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  // Summary
                  Text(
                    article.summary,
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  // Published date
                  if (article.publishedAt.isNotEmpty)
                    Text(
                      _formatDate(article.publishedAt),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey,
                          ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  Future<void> _openArticle(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

/// News article data model
class NewsArticle {
  final String title;
  final String url;
  final String summary;
  final String image;
  final String publishedAt;

  NewsArticle({
    required this.title,
    required this.url,
    required this.summary,
    required this.image,
    required this.publishedAt,
  });

  factory NewsArticle.fromJson(Map<String, dynamic> json) {
    return NewsArticle(
      title: json['title'] ?? '',
      url: json['url'] ?? '',
      summary: json['summary'] ?? '',
      image: json['image'] ?? '',
      publishedAt: json['publishedAt'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'url': url,
      'summary': summary,
      'image': image,
      'publishedAt': publishedAt,
    };
  }
}

/// Service class for news API calls
class NewsService {
  /// Call the Firebase Cloud Function to get personalized news
  ///
  /// [preferences] should include:
  /// - location: { city, state, country }
  /// - businessInterests: List<String>
  /// - community: String
  static Future<List<NewsArticle>> getNews(
    Map<String, dynamic> preferences,
  ) async {
    try {
      // Get reference to the callable function
      final functions = FirebaseFunctions.instance;

      // For local development with emulator, uncomment:
      // functions.useFunctionsEmulator('localhost', 5001);

      final callable = functions.httpsCallable(
        'getNews',
        options: HttpsCallableOptions(
          timeout: const Duration(seconds: 30),
        ),
      );

      // Call the function with user preferences
      final result = await callable.call(preferences);

      // Parse the response
      final data = result.data as Map<String, dynamic>;

      if (data['status'] == 'success') {
        final results = data['results'] as List<dynamic>;
        return results
            .map((item) => NewsArticle.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        throw Exception(data['error'] ?? 'Unknown error occurred');
      }
    } on FirebaseFunctionsException catch (e) {
      throw Exception('Firebase error: ${e.message}');
    } catch (e) {
      throw Exception('Failed to fetch news: $e');
    }
  }
}

/// Example usage without Firebase (for testing purposes)
class MockNewsService {
  static Future<List<NewsArticle>> getMockNews() async {
    // Simulate network delay
    await Future.delayed(const Duration(seconds: 1));

    // Return mock data
    return [
      NewsArticle(
        title: 'Ramgarh Development Projects Announced',
        url: 'https://example.com/news/1',
        summary:
            'The local government has announced new development projects for Ramgarh district, including road improvements and new educational facilities. These initiatives aim to boost economic growth in the region.',
        image: 'https://picsum.photos/800/400',
        publishedAt: '2024-01-15T10:00:00Z',
      ),
      NewsArticle(
        title: 'Jharkhand State Budget 2024 Highlights',
        url: 'https://example.com/news/2',
        summary:
            'The Jharkhand state budget for 2024 includes significant allocations for rural development, healthcare, and education. The government aims to improve infrastructure across all districts.',
        image: 'https://picsum.photos/800/401',
        publishedAt: '2024-01-14T15:30:00Z',
      ),
      NewsArticle(
        title: 'Bakery Business Trends in India',
        url: 'https://example.com/news/3',
        summary:
            'The bakery industry in India is experiencing rapid growth with increasing demand for artisanal products. New technologies and changing consumer preferences are driving innovation in the sector.',
        image: 'https://picsum.photos/800/402',
        publishedAt: '2024-01-13T09:00:00Z',
      ),
    ];
  }
}
