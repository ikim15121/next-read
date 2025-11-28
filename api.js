import { curatedLists } from './curated_books.js';

const API_URL = 'https://www.googleapis.com/books/v1/volumes';

export async function searchBooks(query) {
    try {
        // Smart Genre Detection
        const genreAliases = {
            'sci fi': 'science fiction',
            'sf': 'science fiction',
            'scifi': 'science fiction',
            'sci fic': 'science fiction',
            'rom-com': 'romance',
            'ya': 'young adult',
            'kids': 'juvenile fiction',
            'children': 'juvenile fiction',
            'biographies': 'biography',
            'history books': 'history',
            'cookbooks': 'cooking',
            'recipes': 'cooking'
        };

        const fictionGenres = [
            'fantasy', 'science fiction', 'mystery', 'romance', 'horror',
            'thriller', 'crime', 'adventure', 'juvenile fiction', 'young adult',
            'realistic fiction'
        ];

        const nonFictionGenres = [
            'history', 'biography', 'poetry', 'cooking', 'art', 'travel', 'classics'
        ];

        let lowerQuery = query.toLowerCase().trim();

        // Remove " books" suffix if present for cleaner matching
        lowerQuery = lowerQuery.replace(/ books$/, '');

        // Check aliases first
        if (genreAliases[lowerQuery]) {
            lowerQuery = genreAliases[lowerQuery];
        }

        let apiQuery = `q=${encodeURIComponent(query)}`;

        // 1. Check for Curated "Hall of Fame" List
        if (curatedLists[lowerQuery]) {
            console.log(`Using curated list for: ${lowerQuery}`);

            // Fetch all curated books in parallel to avoid "OR" query limitations
            const queries = curatedLists[lowerQuery].slice(0, 10); // Limit to 10 to be safe with rate limits

            try {
                const promises = queries.map(q =>
                    fetch(`${API_URL}?q=${encodeURIComponent(q)}&maxResults=1&printType=books&langRestrict=en`)
                        .then(res => res.ok ? res.json() : { items: [] })
                        .then(data => data.items || [])
                );

                const results = await Promise.all(promises);

                // Flatten and deduplicate by ID
                const allBooks = results.flat();
                const uniqueBooks = Array.from(new Map(allBooks.map(book => [book.id, book])).values());

                // Tag as curated
                return uniqueBooks.map(book => ({ ...book, isCurated: true }));

            } catch (err) {
                console.error('Error fetching curated list:', err);
                // Fallback to normal search if parallel fetch fails
            }
        }

        // 2. Smart Query Construction (Fallback)
        // Check if the query contains any fiction genres (even if mixed with other words)
        const hasFictionGenre = fictionGenres.some(genre => lowerQuery.includes(genre));

        if (hasFictionGenre) {
            // If it looks like a fiction request, force "novel" to get better results
            // and remove common connector words to clean up the query
            let cleanQuery = lowerQuery
                .replace(/\b(with|and|&)\b/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            apiQuery = `q=${encodeURIComponent(cleanQuery + ' novel')}`;
        } else if (nonFictionGenres.includes(lowerQuery)) {
            apiQuery = `q=subject:${encodeURIComponent(lowerQuery)}`;
        }

        const response = await fetch(`${API_URL}?${apiQuery}&maxResults=40&printType=books&langRestrict=en`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error searching books:', error);
        return [];
    }
}

export async function getBookDetails(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching book details:', error);
        return null;
    }
}

export async function searchSimilar(category, author) {
    // Construct a query that looks for books in the same category or by the same author
    // We prioritize category for "similarity"
    let q = '';
    if (category) q += `subject:${category}`;
    if (author) q += `+inauthor:${author}`;

    try {
        // Fetch more results to have a better pool for sorting
        const response = await fetch(`${API_URL}?q=${encodeURIComponent(q)}&maxResults=20&printType=books`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        let items = data.items || [];

        // Sort by publishedDate (ascending) to prioritize first books in series
        // This is a heuristic: older books are usually the first in a series
        items.sort((a, b) => {
            const dateA = a.volumeInfo.publishedDate || '9999';
            const dateB = b.volumeInfo.publishedDate || '9999';
            return dateA.localeCompare(dateB);
        });

        // Tag these books as curated so they bypass strict filters
        return items;
    } catch (error) {
        console.error('Error searching similar books:', error);
        return [];
    }
}
