console.log('📦 Bundle.js loaded!');
// --- curated_books.js ---
const curatedLists = {
    'science fiction': [
        'intitle:Dune',
        'intitle:Ender\'s Game',
        'intitle:The Hitchhiker\'s Guide to the Galaxy',
        'intitle:1984',
        'intitle:Fahrenheit 451',
        'intitle:The Martian'
    ],
    'fantasy': [
        'intitle:The Hobbit',
        'intitle:Harry Potter and the Sorcerer\'s Stone',
        'intitle:A Game of Thrones',
        'intitle:The Name of the Wind',
        'intitle:The Lion, the Witch and the Wardrobe',
        'intitle:The Golden Compass'
    ],
    'mystery': [
        'intitle:The Girl with the Dragon Tattoo',
        'intitle:Gone Girl',
        'isbn:9780307474278', // The Da Vinci Code
        'intitle:The Silent Patient',
        'intitle:Big Little Lies',
        'intitle:And Then There Were None',
        'intitle:Spy School'
    ],
    'romance': [
        'intitle:Pride and Prejudice',
        'intitle:Outlander',
        'intitle:The Notebook',
        'intitle:Me Before You',
        'intitle:Jane Eyre',
        'intitle:Gone with the Wind'
    ],
    'horror': [
        'intitle:It',
        'intitle:The Shining',
        'intitle:Dracula',
        'intitle:Frankenstein',
        'intitle:The Exorcist',
        'intitle:Pet Sematary'
    ],
    'realistic fiction': [
        'intitle:The Hate U Give',
        'intitle:Wonder',
        'intitle:The Fault in Our Stars',
        'intitle:Eleanor & Park',
        'intitle:Speak',
        'intitle:The Perks of Being a Wallflower'
    ]
};

// --- api.js ---
const API_URL = 'https://www.googleapis.com/books/v1/volumes';

async function searchBooks(query) {
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

async function getBookDetails(id) {
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

async function searchSimilar(category, author) {
    // Construct a query that looks for books in the same category or by the same author
    // We prioritize category for "similarity"
    let q = '';
    if (category) q += `subject:${category}`;
    if (author) q += `+inauthor:${author}`;

    try {
        const response = await fetch(`${API_URL}?q=${encodeURIComponent(q)}&maxResults=10&printType=books`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Tag these books as curated so they bypass strict filters
        return data.items || [];
    } catch (error) {
        console.error('Error searching similar books:', error);
        return [];
    }
}

// --- app_v2.js (Modified) ---

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchSection = document.getElementById('search-section');
const resultsSection = document.getElementById('results-section');
const resultsTitle = document.getElementById('results-title');
const bookGrid = document.getElementById('book-grid');
const loadingIndicator = document.getElementById('loading-indicator');
const backToSearchBtn = document.getElementById('back-to-search');
const bookModal = document.getElementById('book-modal');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal');

// Sidebar Elements
let menuBtn, sidebar, sidebarOverlay, closeSidebarBtn;
let navSearch, navRecs, navJournal, navChallenge, navSurprise;

// Views
let searchView, recsView, journalView, challengeView;

// Recs Elements
// Recs Elements
let recsGrid, authorRecsGrid, authorRecsContainer, recsLoading, recsEmpty, retakeQuizBtn, takeQuizBtn;

// Journal Elements
let wishlistInput, addWishlistBtn, wishlistList, wishlistCount, addSectionBtn, journalSectionsContainer;
let challengeGoalInput, saveGoalBtn, progressBarFill, progressText, booksReadCount, booksGoalCount, encouragementMsg, resetChallengeBtn;

// Questionnaire Elements
let questionnaireView, startBtn, skipBtn;

// Step Elements
let readingOptionsContainer, readingNextBtn, readingSkipBtn;
let authorInput, authorNextBtn, authorSkipBtn, authorBackBtn;
let genreOptionsContainer, genreNextBtn, genreSkipBtn, genreBackBtn;
let moodOptionsContainer, moodNextBtn, moodSkipBtn, moodBackBtn;
let finishBtn;

// State
let selectedReadingLevel = null;
let favoriteAuthors = '';
let selectedGenres = new Set();
let selectedMoods = new Set();

let userPreferences = {
    readingLevel: null,
    authors: '',
    genres: [],
    moods: []
};
let journalData = {
    wishlist: [],
    sections: []
};
let currentBooks = [];

// Data
const readingLevels = [
    { id: 'k-2', label: 'Grade K-2', icon: '🐣', query: 'early reader' },
    { id: '3-5', label: 'Grade 3-5', icon: '🏫', query: 'middle grade' },
    { id: '6-8', label: 'Grade 6-8', icon: '🎒', query: 'young adult' },
    { id: 'hs', label: 'High School / YA', icon: '🎓', query: 'young adult novel' }
];

const genres = [
    { id: 'mystery', label: 'Mystery', icon: '🕵️‍♀️' },
    { id: 'fantasy', label: 'Fantasy', icon: '🐉' },
    { id: 'scifi', label: 'Sci-Fi', icon: '🚀' },
    { id: 'realistic', label: 'Realistic', icon: '🏙️' },
    { id: 'historical', label: 'Historical', icon: '🏰' },
    { id: 'biography', label: 'Biography', icon: '📜' },
    { id: 'graphic', label: 'Graphic Novel', icon: '💬' },
    { id: 'adventure', label: 'Adventure', icon: '🗺️' },
    { id: 'humor', label: 'Humor', icon: '😂' },
    { id: 'horror', label: 'Horror', icon: '👻' },
    { id: 'romance', label: 'Romance', icon: '❤️' }
];

const moods = [
    { id: 'happy', label: 'Happy', icon: '😊' },
    { id: 'excited', label: 'Excited', icon: '🤩' },
    { id: 'scared', label: 'Scared', icon: '😱' },
    { id: 'inspired', label: 'Inspired', icon: '💡' },
    { id: 'curious', label: 'Curious', icon: '🤔' },
    { id: 'relaxed', label: 'Relaxed', icon: '😌' }
];


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Bundle Initializing...');

    // Initialize DOM Elements
    menuBtn = document.getElementById('menu-btn');
    sidebar = document.getElementById('sidebar');
    sidebarOverlay = document.getElementById('sidebar-overlay');
    closeSidebarBtn = document.getElementById('close-sidebar-btn');
    navSearch = document.getElementById('nav-search');
    navRecs = document.getElementById('nav-recs');
    navJournal = document.getElementById('nav-journal');
    navChallenge = document.getElementById('nav-challenge');
    navSurprise = document.getElementById('nav-surprise');
    searchView = document.getElementById('search-view');
    recsView = document.getElementById('recommendations-view');
    journalView = document.getElementById('journal-view');
    challengeView = document.getElementById('challenge-view');

    recsGrid = document.getElementById('recs-grid');
    authorRecsGrid = document.getElementById('author-recs-grid');
    authorRecsContainer = document.getElementById('author-recs-container');
    recsLoading = document.getElementById('recs-loading');
    recsEmpty = document.getElementById('recs-empty');
    retakeQuizBtn = document.getElementById('retake-quiz-btn');
    takeQuizBtn = document.getElementById('take-quiz-btn');

    wishlistInput = document.getElementById('wishlist-input');
    addWishlistBtn = document.getElementById('add-wishlist-btn');
    wishlistList = document.getElementById('wishlist-list');
    wishlistCount = document.getElementById('wishlist-count');
    addSectionBtn = document.getElementById('add-section-btn');
    journalSectionsContainer = document.getElementById('journal-sections');

    challengeGoalInput = document.getElementById('challenge-goal');
    saveGoalBtn = document.getElementById('save-goal-btn');
    progressBarFill = document.getElementById('progress-bar-fill');
    progressText = document.getElementById('progress-text');
    booksReadCount = document.getElementById('books-read-count');
    booksGoalCount = document.getElementById('books-goal-count');
    encouragementMsg = document.getElementById('encouragement-msg');
    resetChallengeBtn = document.getElementById('reset-challenge-btn');

    questionnaireView = document.getElementById('questionnaire-view');
    startBtn = document.getElementById('start-btn');
    skipBtn = document.getElementById('skip-btn');

    readingOptionsContainer = document.getElementById('reading-options');
    readingNextBtn = document.getElementById('reading-next-btn');
    readingSkipBtn = document.getElementById('reading-skip-btn');

    authorInput = document.getElementById('author-input');
    authorNextBtn = document.getElementById('author-next-btn');
    authorSkipBtn = document.getElementById('author-skip-btn');
    authorBackBtn = document.getElementById('author-back-btn');

    genreOptionsContainer = document.getElementById('genre-options');
    genreNextBtn = document.getElementById('genre-next-btn');
    genreSkipBtn = document.getElementById('genre-skip-btn');
    genreBackBtn = document.getElementById('genre-back-btn');

    moodOptionsContainer = document.getElementById('mood-options');
    moodNextBtn = document.getElementById('mood-next-btn');
    moodSkipBtn = document.getElementById('mood-skip-btn');
    moodBackBtn = document.getElementById('mood-back-btn');


    finishBtn = document.getElementById('finish-btn');

    renderOptions();
    setupEventListeners();
    loadJournal();
    setupJournalListeners();
    setupChallengeListeners();
    setupSurpriseListeners();
    loadChallengeGoal();
    loadPreferences();
});

function loadPreferences() {
    const saved = localStorage.getItem('bookFinderPreferences');
    if (saved) {
        userPreferences = JSON.parse(saved);
        // Restore state if needed, or just keep it for recommendations
        selectedReadingLevel = userPreferences.readingLevel;
        favoriteAuthors = userPreferences.authors;
        selectedGenres = new Set(userPreferences.genres);
        selectedMoods = new Set(userPreferences.moods);
    }
}

function savePreferences() {
    userPreferences = {
        readingLevel: selectedReadingLevel,
        authors: favoriteAuthors,
        genres: Array.from(selectedGenres),
        moods: Array.from(selectedMoods)
    };
    localStorage.setItem('bookFinderPreferences', JSON.stringify(userPreferences));
}

function renderOptions() {
    // Render Reading Levels
    readingOptionsContainer.innerHTML = readingLevels.map(l => `
        <div class="option-btn" data-type="reading" data-value="${l.id}">
            <span class="option-icon">${l.icon}</span>
            <span class="option-label">${l.label}</span>
        </div>
    `).join('');

    // Render Genres
    genreOptionsContainer.innerHTML = genres.map(g => `
        <div class="option-btn" data-type="genre" data-value="${g.id}">
            <span class="option-icon">${g.icon}</span>
            <span class="option-label">${g.label}</span>
        </div>
    `).join('');

    // Render Moods
    moodOptionsContainer.innerHTML = moods.map(m => `
        <div class="option-btn" data-type="mood" data-value="${m.id}">
            <span class="option-icon">${m.icon}</span>
            <span class="option-label">${m.label}</span>
        </div>
    `).join('');

    // Add click listeners to options
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleOption(btn));
    });
}

function toggleOption(btn) {
    const type = btn.dataset.type;
    const value = btn.dataset.value;
    console.log(`🔘 Option Clicked: ${type} = ${value}`);

    if (type === 'reading') {
        // Single select
        document.querySelectorAll('[data-type="reading"]').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
        selectedReadingLevel = value;
        readingNextBtn.disabled = false;
    } else {
        // Multi select (Genre, Mood)
        const set = type === 'genre' ? selectedGenres : selectedMoods;
        const nextBtn = type === 'genre' ? genreNextBtn : moodNextBtn;

        if (set.has(value)) {
            set.delete(value);
            btn.classList.remove('selected');
        } else {
            set.add(value);
            btn.classList.add('selected');
        }
        nextBtn.disabled = set.size === 0;
    }
}

function loadJournal() {
    const saved = localStorage.getItem('bookFinderJournal');
    if (saved) {
        journalData = JSON.parse(saved);
        renderWishlist();
        renderSections();
    }
}

function saveJournal() {
    localStorage.setItem('bookFinderJournal', JSON.stringify(journalData));
}

function toggleSidebar() {
    sidebar.classList.toggle('hidden');
    sidebarOverlay.classList.toggle('hidden');
}

// --- Wishlist Logic ---
function addToWishlist() {
    const title = wishlistInput.value.trim();
    if (!title) return;

    journalData.wishlist.push({ id: Date.now(), title });
    wishlistInput.value = '';
    saveJournal();
    renderWishlist();
}

function removeFromWishlist(id) {
    journalData.wishlist = journalData.wishlist.filter(item => item.id !== id);
    saveJournal();
    renderWishlist();
}

function renderWishlist() {
    wishlistList.innerHTML = journalData.wishlist.map(item => `
        <li class="wishlist-item">
            <span>${item.title}</span>
            <button class="delete-btn" onclick="window.removeWishlistItem(${item.id})">&times;</button>
        </li>
    `).join('');
    wishlistCount.textContent = journalData.wishlist.length;
}

// Expose to window for onclick
window.removeWishlistItem = removeFromWishlist;

// --- Sections Logic ---
function addNewSection() {
    // Use a default name instead of prompt to avoid blocking UI
    const title = "New Section";

    journalData.sections.push({ id: Date.now(), title, content: '' });
    saveJournal();
    renderSections();

    // Focus the new section's title for editing (future improvement: make title editable)
}

function updateSectionContent(id, newContent) {
    const section = journalData.sections.find(s => s.id === id);
    if (section) {
        section.content = newContent;
        saveJournal();
    }
}

function deleteSection(id) {
    if (confirm("Are you sure you want to delete this section?")) {
        journalData.sections = journalData.sections.filter(s => s.id !== id);
        saveJournal();
        renderSections();
    }
}

function updateSectionTitle(id, newTitle) {
    const section = journalData.sections.find(s => s.id === id);
    if (section) {
        section.title = newTitle;
        saveJournal();
    }
}

function renderSections() {
    journalSectionsContainer.innerHTML = journalData.sections.map(section => `
        <div class="journal-section-card">
            <div class="section-title">
                <input 
                    type="text" 
                    class="section-title-input" 
                    value="${section.title}" 
                    oninput="window.updateJournalSectionTitle(${section.id}, this.value)"
                >
                <button class="delete-btn" onclick="window.deleteJournalSection(${section.id})">&times;</button>
            </div>
            <textarea 
                class="section-content" 
                placeholder="Write your notes here..."
                oninput="window.updateJournalSection(${section.id}, this.value)"
            >${section.content}</textarea>
        </div>
    `).join('');
}

// Expose to window
window.deleteJournalSection = deleteSection;
window.updateJournalSection = updateSectionContent;
window.updateJournalSectionTitle = updateSectionTitle;

function setupEventListeners() {
    // Welcome -> Reading
    startBtn.addEventListener('click', () => showStep('step-reading'));
    // skipBtn removed

    // Reading -> Authors
    readingNextBtn.addEventListener('click', () => showStep('step-authors'));
    readingSkipBtn.addEventListener('click', () => showStep('step-authors'));

    // Authors -> Genres
    authorNextBtn.addEventListener('click', () => {
        favoriteAuthors = authorInput.value.trim();
        showStep('step-genres');
    });
    authorSkipBtn.addEventListener('click', () => showStep('step-genres'));
    authorBackBtn.addEventListener('click', () => showStep('step-reading'));

    // Genres -> Mood
    genreNextBtn.addEventListener('click', () => showStep('step-mood'));
    genreSkipBtn.addEventListener('click', () => showStep('step-mood'));
    genreBackBtn.addEventListener('click', () => showStep('step-authors'));

    // Mood -> Finish
    moodNextBtn.addEventListener('click', finishQuestionnaire);
    moodSkipBtn.addEventListener('click', finishQuestionnaire);
    moodBackBtn.addEventListener('click', () => showStep('step-genres'));
}

function showStep(stepId) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

async function finishQuestionnaire() {
    console.log('🏁 finishQuestionnaire called!');
    try {
        // Construct Query
        let queryParts = [];
        let apiQueryParts = [];

        // 1. Authors (Split and prioritize first)
        if (favoriteAuthors) {
            // Split by comma, clean up whitespace
            const authors = favoriteAuthors.split(',').map(a => a.trim()).filter(a => a.length > 0);

            if (authors.length > 0) {
                // Use the first author as a strict filter
                // Google Books API doesn't handle multiple 'inauthor' well in one query string without OR
                // So we prioritize the first one for the API query
                apiQueryParts.push(`inauthor:"${authors[0]}"`);

                // Add others as general keywords if they exist, but maybe just the first is enough to start
                // queryParts.push(authors.join(' ')); 
            }
        }

        // 2. Reading Level (Context)
        if (selectedReadingLevel) {
            const level = readingLevels.find(l => l.id === selectedReadingLevel);
            if (level) {
                // Add reading level query to the main parts
                queryParts.push(level.query);
            }
        } else {
            queryParts.push('novel');
        }

        // 3. Genres (Prioritize first selection)
        const genreList = Array.from(selectedGenres).map(id => {
            const g = genres.find(item => item.id === id);
            return g.id === 'scifi' ? 'science fiction' : g.label;
        });

        if (genreList.length > 0) {
            // Add the first genre as a subject filter for better precision
            apiQueryParts.push(`subject:"${genreList[0]}"`);

            // Add other genres as keywords, but limit to avoid over-constraining
            if (genreList.length > 1) {
                queryParts.push(genreList.slice(1, 2).join(' ')); // Add at most 1 more genre
            }
        }

        // 4. Moods (Context - limit to 1)
        const moodList = Array.from(selectedMoods).map(id => {
            return moods.find(item => item.id === id).label;
        });
        if (moodList.length > 0) {
            queryParts.push(moodList[0]); // Only take the first mood
        }

        // Combine API filters (inauthor, subject) with general keywords
        // Example: inauthor:"Chris Colfer" subject:"Fantasy" middle grade book Excited
        let finalQuery = [...apiQueryParts, ...queryParts].join(' ');

        // Fallback: If query is too empty, just use "books"
        if (!finalQuery.trim()) {
            finalQuery = 'books';
        }

        // Log Journal Preference


        // Save Preferences for Auto Recommendations
        savePreferences();

        // Hide Questionnaire
        questionnaireView.classList.add('hidden');

        // Switch to Recs View
        switchView('recs');
    } catch (err) {
        console.error('Error in finishQuestionnaire:', err);
        alert('Something went wrong finishing the quiz: ' + err.message);
    }
}

function setupJournalListeners() {
    // Sidebar Toggle
    if (menuBtn) {
        menuBtn.dataset.handled = 'true';
        menuBtn.addEventListener('click', toggleSidebar);
    }
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // Navigation
    // navSearch removed
    navRecs.addEventListener('click', () => switchView('recs'));
    navJournal.addEventListener('click', () => switchView('journal'));

    // Recs Actions
    retakeQuizBtn.addEventListener('click', startQuestionnaire);
    takeQuizBtn.addEventListener('click', startQuestionnaire);

    // Wishlist
    addWishlistBtn.addEventListener('click', addToWishlist);
    wishlistInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addToWishlist();
    });

    // Sections
    addSectionBtn.addEventListener('click', addNewSection);
}

function startQuestionnaire() {
    questionnaireView.classList.remove('hidden');
    showStep('step-welcome');
    // Reset state if needed, or keep previous answers pre-selected
}

function switchView(viewName) {
    // Only close sidebar if it's currently open (not hidden)
    if (sidebar && !sidebar.classList.contains('hidden')) {
        toggleSidebar();
    }

    // Hide all
    // searchView removed
    recsView.classList.add('hidden');
    journalView.classList.add('hidden');
    challengeView.classList.add('hidden');

    // Deactivate navs
    // navSearch removed
    navRecs.classList.remove('active');
    navJournal.classList.remove('active');
    navChallenge.classList.remove('active');

    if (viewName === 'recs') {
        recsView.classList.remove('hidden');
        navRecs.classList.add('active');
        loadRecommendations();
    } else if (viewName === 'journal') {
        journalView.classList.remove('hidden');
        navJournal.classList.add('active');
    } else if (viewName === 'challenge') {
        challengeView.classList.remove('hidden');
        navChallenge.classList.add('active');
        updateChallengeProgress();
    }
}

async function loadRecommendations() {
    console.log('🔄 Loading Recommendations...');

    // Check prefs
    const hasPrefs = userPreferences.readingLevel ||
        (userPreferences.genres && userPreferences.genres.length > 0) ||
        (userPreferences.authors && userPreferences.authors.length > 0);

    if (!hasPrefs) {
        recsEmpty.classList.remove('hidden');
        authorRecsContainer.classList.add('hidden');
        recsGrid.innerHTML = '';
        return;
    }

    recsEmpty.classList.add('hidden');
    recsLoading.classList.remove('hidden');
    authorRecsContainer.classList.add('hidden'); // Hide initially
    recsGrid.innerHTML = '';
    authorRecsGrid.innerHTML = '';

    try {
        // 1. Fetch Author Recommendations
        let authorBooks = [];
        if (userPreferences.authors) {
            const authors = userPreferences.authors.split(',').map(a => a.trim()).filter(a => a);
            // Limit to top 2 authors
            const targetAuthors = authors.slice(0, 2);

            const authorPromises = targetAuthors.map(author => searchSimilar(null, author));
            const results = await Promise.all(authorPromises);
            authorBooks = results.flat();

            // Deduplicate
            authorBooks = Array.from(new Map(authorBooks.map(b => [b.id, b])).values());
        }

        // 2. Fetch Taste Recommendations (Genres + Moods + Level)
        let tasteBooks = [];

        // Construct query for tastes
        let queryParts = [];
        let apiQueryParts = [];

        // Reading Level
        if (userPreferences.readingLevel) {
            const level = readingLevels.find(l => l.id === userPreferences.readingLevel);
            if (level) queryParts.push(level.query);
        }

        // Genres
        if (userPreferences.genres.length > 0) {
            const firstGenreId = userPreferences.genres[0];
            const g = genres.find(item => item.id === firstGenreId);
            const genreLabel = g.id === 'scifi' ? 'science fiction' : g.label;
            apiQueryParts.push(`subject:"${genreLabel}"`);

            if (userPreferences.genres.length > 1) {
                const secondGenreId = userPreferences.genres[1];
                const g2 = genres.find(item => item.id === secondGenreId);
                queryParts.push(g2.label);
            }
        }

        // Moods
        if (userPreferences.moods && userPreferences.moods.length > 0) {
            const moodList = Array.from(userPreferences.moods).map(id => {
                const m = moods.find(item => item.id === id);
                return m ? m.label : '';
            }).filter(l => l);
            if (moodList.length > 0) queryParts.push(moodList[0]);
        }

        let finalQuery = [...apiQueryParts, ...queryParts].join(' ');
        if (!finalQuery.trim()) finalQuery = 'books';

        console.log('🔍 Searching Taste Books:', finalQuery);
        tasteBooks = await searchBooks(finalQuery);

        // 3. Render
        recsLoading.classList.add('hidden');

        // Render Authors
        if (authorBooks.length > 0) {
            authorRecsContainer.classList.remove('hidden');
            renderBooks(authorBooks.slice(0, 4), authorRecsGrid);
        }

        // Render Tastes
        if (tasteBooks.length > 0) {
            renderBooks(tasteBooks, recsGrid);
        } else {
            if (authorBooks.length === 0) {
                recsEmpty.classList.remove('hidden');
            }
        }

    } catch (err) {
        console.error('Error loading recs:', err);
        recsLoading.classList.add('hidden');
        recsEmpty.classList.remove('hidden');
    }
}


// Need to make sure renderBooks is available or we implement a simple version here
function renderRecs(books, container) {
    container.innerHTML = books.map(book => {
        const volumeInfo = book.volumeInfo;
        const image = volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover';
        const title = volumeInfo.title;
        const authors = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author';

        return `
            <div class="book-card" onclick="window.showBookDetails('${book.id}')">
                <img src="${image}" alt="${title}" loading="lazy">
                <div class="book-info">
                    <h3>${title}</h3>
                    <p>${authors}</p>
                </div>
            </div>
        `;
    }).join('');
}
// Expose for onclick
window.showBookDetails = async (bookId) => {
    const book = await getBookDetails(bookId);
    if (!book) return;
    // ... reuse modal logic? 
    // Actually, let's just trigger the existing modal logic if possible.
    // Since showBookDetails isn't exported, we might need to duplicate or refactor.
    // For now, let's just assume we can access the modal elements.

    const modal = document.getElementById('book-modal');
    const modalBody = document.getElementById('modal-body');

    const volumeInfo = book.volumeInfo;
    const image = volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover';

    modalBody.innerHTML = `
        <div class="modal-grid">
            <img src="${image}" alt="${volumeInfo.title}" class="modal-cover">
            <div class="modal-info">
                <h2>${volumeInfo.title}</h2>
                <p class="modal-author">by ${volumeInfo.authors?.join(', ') || 'Unknown'}</p>
                <div class="modal-meta">
                    <span>${volumeInfo.pageCount || '?'} pages</span>
                    <span>${volumeInfo.publishedDate || 'Unknown date'}</span>
                </div>
                <p class="modal-desc">${volumeInfo.description || 'No description available.'}</p>
                <a href="${volumeInfo.previewLink}" target="_blank" class="primary-btn">Preview Book</a>
                <button class="secondary-btn" onclick="window.addToWishlistFromModal('${volumeInfo.title.replace(/'/g, "\\'")}')">Add to Wishlist</button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.addToWishlistFromModal = (title) => {
    journalData.wishlist.push({ id: Date.now(), title });
    saveJournal();
    alert(`Added "${title}" to your wishlist!`);
};

// ... (rest of existing functions)

// Expose for testing/debugging
window.renderOptions = renderOptions;
window.readingLevels = readingLevels;
window.genres = genres;
window.startQuestionnaire = startQuestionnaire;
window.finishQuestionnaire = finishQuestionnaire;
window.showStep = showStep;
window.userPreferences = userPreferences;

// Event Listeners
closeModalBtn.addEventListener('click', closeModal);
bookModal.addEventListener('click', (e) => {
    if (e.target === bookModal) closeModal();
});

// Handlers

function renderBooks(books, container = bookGrid) {
    if (!books || books.length === 0) {
        container.innerHTML = '<p class="no-results">No popular books found. Try a different search.</p>';
        return;
    }

    const accolades = [
        { term: 'New York Times Bestseller', label: '🏆 NYT Bestseller' },
        { term: 'The Week Junior', label: '🌟 Week Junior Pick' },
        { term: 'Award', label: '🏅 Award Winner' }
    ];

    container.innerHTML = books.map(book => {
        const info = book.volumeInfo;
        // Get the best available image and remove the curl effect
        let thumbnail = info.imageLinks?.thumbnail?.replace('http:', 'https:').replace('&edge=curl', '');

        const authors = info.authors ? info.authors.join(', ') : 'Unknown Author';

        // Check for badges
        const text = (info.description || '' + ' ' + (book.searchInfo?.textSnippet || '')).toLowerCase();
        let badgeHtml = '';
        for (const accolade of accolades) {
            if (text.includes(accolade.term.toLowerCase())) {
                badgeHtml = `<div class="book-badge">${accolade.label}</div>`;
                break; // Show only top accolade
            }
        }

        // Reddit-style snippet
        const snippet = book.searchInfo?.textSnippet || info.description?.substring(0, 150) + '...' || 'No description available.';
        const cleanSnippet = snippet.replace(/<[^>]*>/g, ''); // Remove HTML tags
        const redditLink = `https://www.reddit.com/search/?q=${encodeURIComponent(info.title + ' book review')}`;

        return `
            <div class="book-card" data-id="${book.id}">
                <div class="cover-wrapper">
                    <img src="${thumbnail}" alt="${info.title}" class="book-cover" loading="lazy">
                    ${badgeHtml}
                </div>
                <div class="book-info">
                    <h3 class="book-title">${info.title}</h3>
                    <p class="book-author">${authors}</p>
                    
                    <div class="reddit-snippet">
                        <div class="reddit-header">
                            <span class="reddit-user">u/bookworm_99</span> • <span class="reddit-time">just now</span>
                        </div>
                        <p class="reddit-text">"${cleanSnippet}"</p>
                        <div class="reddit-actions">
                            <a href="${redditLink}" target="_blank" class="reddit-link">
                                <span class="reddit-icon">💬</span> Discuss on Reddit
                            </a>
                            <span class="reddit-upvotes">⬆️ ${(info.ratingsCount || 1) * 10}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add click listeners to cards
    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', () => openBookDetails(card.dataset.id));
    });
}

async function openBookDetails(bookOrId) {
    let book;
    if (typeof bookOrId === 'object') {
        book = bookOrId;
    } else {
        book = currentBooks.find(b => b.id === bookOrId) || await getBookDetails(bookOrId);
    }

    if (!book) return;

    const info = book.volumeInfo;
    // Get high res image if possible, or clean up thumbnail
    let thumbnail = (info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail)?.replace('http:', 'https:').replace('&edge=curl', '');

    if (!thumbnail) thumbnail = 'https://via.placeholder.com/128x192?text=No+Cover';

    const authors = info.authors ? info.authors.join(', ') : 'Unknown Author';
    const description = info.description || 'No description available.';
    const categories = info.categories ? info.categories.join(', ') : '';
    const rating = info.averageRating ? `★ ${info.averageRating}` : '';

    modalBody.innerHTML = `
        <div class="detail-layout" style="display: flex; gap: 2rem; flex-wrap: wrap;">
            <div class="detail-image" style="flex: 0 0 200px;">
                <img src="${thumbnail}" alt="${info.title}" style="width: 100%; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
            </div>
            <div class="detail-content" style="flex: 1; min-width: 300px;">
                <h2 style="font-family: var(--font-serif); font-size: 2rem; margin-bottom: 0.5rem;">${info.title}</h2>
                <p style="color: var(--primary-color); font-size: 1.1rem; margin-bottom: 1rem;">${authors}</p>
                
                <div class="meta-tags" style="display: flex; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-muted);">
                    ${info.publishedDate ? `<span>${info.publishedDate.substring(0, 4)}</span>` : ''}
                    ${categories ? `<span>${categories}</span>` : ''}
                    ${rating ? `<span style="color: #fbbf24;">${rating}</span>` : ''}
                </div>

                <div class="description" style="line-height: 1.8; margin-bottom: 2rem; max-height: 300px; overflow-y: auto;">
                    ${description}
                </div>

                <button id="find-similar-btn" class="action-btn" style="background: var(--primary-color); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 50px; cursor: pointer; font-size: 1rem; font-weight: 600; transition: background 0.2s;">
                    Find Similar Books
                </button>
            </div>
        </div>
        <div id="similar-results" style="margin-top: 2rem; display: none;">
            <h3 style="font-family: var(--font-serif); margin-bottom: 1rem;">You might also like...</h3>
            <div id="similar-grid" class="book-grid"></div>
        </div>
    `;

    // Setup "Find Similar" listener
    const similarBtn = document.getElementById('find-similar-btn');
    similarBtn.addEventListener('click', () => loadSimilarBooks(info.categories?.[0], info.authors?.[0]));

    bookModal.classList.remove('hidden');
}

async function loadSimilarBooks(category, author) {
    const similarBtn = document.getElementById('find-similar-btn');
    const similarResults = document.getElementById('similar-results');
    const similarGrid = document.getElementById('similar-grid');

    similarBtn.textContent = 'Searching...';
    similarBtn.disabled = true;

    const books = await searchSimilar(category, author);

    similarResults.style.display = 'block';
    similarBtn.style.display = 'none';

    if (!books || books.length === 0) {
        similarGrid.innerHTML = '<p>No similar books found.</p>';
        return;
    }

    similarGrid.innerHTML = books.map(book => {
        const info = book.volumeInfo;
        const thumbnail = info.imageLinks?.thumbnail?.replace('http:', 'https:') || 'https://via.placeholder.com/128x192?text=No+Cover';

        return `
            <div class="book-card" onclick="window.open('${info.previewLink}', '_blank')">
                <img src="${thumbnail}" alt="${info.title}" class="book-cover">
                <div class="book-info">
                    <h4 class="book-title" style="font-size: 1rem;">${info.title}</h4>
                </div>
            </div>
        `;
    }).join('');
}

function closeModal() {
    bookModal.classList.add('hidden');
    modalBody.innerHTML = '';
}


// --- Reading Challenge Logic ---
function setupChallengeListeners() {
    if (navChallenge) {
        navChallenge.addEventListener('click', () => switchView('challenge'));
    }
    if (saveGoalBtn) {
        saveGoalBtn.addEventListener('click', saveChallengeGoal);
    }
    if (resetChallengeBtn) {
        resetChallengeBtn.addEventListener('click', resetChallenge);
    }

    // Expose logBook to window for onclick handlers
    window.logBook = logBook;
}

function loadChallengeGoal() {
    const savedGoal = localStorage.getItem('bookFinderChallengeGoal');
    if (savedGoal) {
        challengeGoalInput.value = savedGoal;
    }
    updateChallengeProgress();
}

function saveChallengeGoal() {
    const goal = parseInt(challengeGoalInput.value);
    if (goal && goal > 0) {
        localStorage.setItem('bookFinderChallengeGoal', goal);
        updateChallengeProgress();
        alert('Goal updated! 🎯');
    } else {
        alert('Please enter a valid number!');
    }
}

function resetChallenge() {
    if (confirm('Are you sure you want to start over? This will reset your progress to 0.')) {
        localStorage.setItem('bookFinderBooksRead', 0);
        updateChallengeProgress();
    }
}

function logBook(emoji) {
    let currentRead = parseInt(localStorage.getItem('bookFinderBooksRead')) || 0;
    currentRead++;
    localStorage.setItem('bookFinderBooksRead', currentRead);

    // Animation effect could go here
    alert(`Added a book! ${emoji}`);
    updateChallengeProgress();
}

function updateChallengeProgress() {
    try {
        console.log('Updating Challenge Progress...');
        const goal = parseInt(localStorage.getItem('bookFinderChallengeGoal')) || 10;

        // Ensure input matches saved goal
        if (challengeGoalInput && challengeGoalInput.value != goal) {
            challengeGoalInput.value = goal;
        }

        const read = parseInt(localStorage.getItem('bookFinderBooksRead')) || 0;

        if (booksReadCount) booksReadCount.textContent = read;
        // booksGoalCount removed from UI, skipping

        let percentage = Math.round((read / goal) * 100);
        if (percentage > 100) percentage = 100;

        if (progressText) progressText.textContent = `${percentage}%`;
        if (progressBarFill) progressBarFill.style.width = `${percentage}%`;

        // Update Jar
        const jarBody = document.getElementById('challenge-jar');
        if (jarBody) {
            jarBody.innerHTML = ''; // Clear existing
            // Logic for Jar Fullness:
            // If goal <= 50, we show 1 token per book. Size is based on goal.
            // If goal > 50, we scale down to 50 tokens max. Size is based on 50.
            // This ensures that when read == goal, the jar looks full (50 tokens of size-for-50).

            let visualGoal = goal;
            let visualCount = read;

            if (goal > 50) {
                visualGoal = 50;
                // Scale read count to 0-50 range
                visualCount = Math.ceil((read / goal) * 50);
            }

            // Cap visual count at visual goal (so it doesn't overflow if read > goal)
            visualCount = Math.min(visualCount, visualGoal);

            // Area-based size formula using visualGoal
            // size = Math.max(1.2, Math.min(4.5, 14 / Math.sqrt(visualGoal)));
            const size = Math.max(1.2, Math.min(4.5, 14 / Math.sqrt(visualGoal)));

            for (let i = 0; i < visualCount; i++) {
                const token = document.createElement('div');
                token.classList.add('emoji-token');
                token.textContent = '📚';
                token.style.fontSize = `${size}rem`;

                // Randomize rotation slightly for natural look
                const rotation = Math.random() * 40 - 20;
                token.style.transform = `rotate(${rotation}deg)`;
                jarBody.appendChild(token);
            }
        }

        // Encouragement
        if (encouragementMsg) {
            if (percentage === 0) {
                encouragementMsg.textContent = "Let's get started! 🚀";
            } else if (percentage < 50) {
                encouragementMsg.textContent = "Great start! Keep going! 📖";
            } else if (percentage < 100) {
                encouragementMsg.textContent = "Almost there! You got this! 🔥";
            } else {
                encouragementMsg.textContent = "You did it! Amazing! 🏆✨";
            }
        }
    } catch (err) {
        console.error('Error updating challenge progress:', err);
    }
}

// --- Surprise Me Logic ---
function setupSurpriseListeners() {
    console.log('Setting up Surprise Me listeners...');
    // Ensure element exists before adding listener
    if (navSurprise) {
        console.log('Surprise Me button found:', navSurprise);
        // Remove existing listeners to prevent duplicates if re-initialized
        navSurprise.removeEventListener('click', handleSurpriseMe);
        navSurprise.addEventListener('click', (e) => {
            console.log('Surprise Me clicked!');
            handleSurpriseMe(e);
        });
    } else {
        console.error('Surprise Me button NOT found!');
    }
}

async function handleSurpriseMe() {
    // 1. Pick a random genre
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];

    // 2. Show loading (re-use recs loading for now or just a toast)
    const originalText = navSurprise.innerHTML;
    navSurprise.innerHTML = '<span class="icon">🎲</span> Picking...';
    navSurprise.disabled = true;

    try {
        // 3. Fetch random books from that genre
        // Use a random startIndex to get different books
        const randomStartIndex = Math.floor(Math.random() * 20);
        const query = `subject:"${randomGenre.label}"`;

        // Create a timeout promise
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 8000)
        );

        const fetchPromise = fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&startIndex=${randomStartIndex}&maxResults=10&langRestrict=en`
        );

        // Race fetch against timeout
        const response = await Promise.race([fetchPromise, timeout]);

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            // 4. Pick one random book from results
            const randomBook = data.items[Math.floor(Math.random() * data.items.length)];

            // 5. Open details
            console.log('Surprise Me: Opening book', randomBook.volumeInfo.title);
            openBookDetails(randomBook);

            // Close sidebar if mobile
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        } else {
            console.warn('Surprise Me: No books found.');
            alert('Oops! The magic dice rolled off the table. Try again!');
        }
    } catch (err) {
        console.error('Surprise Me Error:', err);
        alert(`Magic failed! 🪄 Error: ${err.message}`);
    } finally {
        navSurprise.innerHTML = originalText;
        navSurprise.disabled = false;
    }
}
