import { searchBooks, getBookDetails, searchSimilar } from './api.js?v=50';

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
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const navSearch = document.getElementById('nav-search');
const navRecs = document.getElementById('nav-recs');
const navJournal = document.getElementById('nav-journal');
const navChallenge = document.getElementById('nav-challenge');
const navSurprise = document.getElementById('nav-surprise');

// Views
const searchView = document.getElementById('search-view');
const recsView = document.getElementById('recommendations-view');
const journalView = document.getElementById('journal-view');
const challengeView = document.getElementById('challenge-view');

// Recs Elements
const recsGrid = document.getElementById('recs-grid');
const recsLoading = document.getElementById('recs-loading');
const recsEmpty = document.getElementById('recs-empty');
const retakeQuizBtn = document.getElementById('retake-quiz-btn');
const takeQuizBtn = document.getElementById('take-quiz-btn');

// Journal Elements
const wishlistInput = document.getElementById('wishlist-input');
const addWishlistBtn = document.getElementById('add-wishlist-btn');
const wishlistList = document.getElementById('wishlist-list');
const wishlistCount = document.getElementById('wishlist-count');
const addSectionBtn = document.getElementById('add-section-btn');
const journalSectionsContainer = document.getElementById('journal-sections');

// Challenge Elements
const challengeGoalInput = document.getElementById('challenge-goal');
const saveGoalBtn = document.getElementById('save-goal-btn');
const booksReadCount = document.getElementById('books-read-count');
const resetChallengeBtn = document.getElementById('reset-challenge-btn');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressText = document.getElementById('progress-text');
const encouragementMsg = document.getElementById('encouragement-msg');
const badgesGrid = document.getElementById('badges-grid');

// Questionnaire Elements
const questionnaireView = document.getElementById('questionnaire-view');
const startBtn = document.getElementById('start-btn');
const skipBtn = document.getElementById('skip-btn');
// ... (rest of elements)

// ... (State and Data definitions)

function setupJournalListeners() {
    // Sidebar Toggle
    menuBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    // Navigation
    navSearch.addEventListener('click', () => switchView('search'));
    navRecs.addEventListener('click', () => switchView('recs'));
    navSearch.addEventListener('click', () => switchView('search'));
    navRecs.addEventListener('click', () => switchView('recs'));
    navJournal.addEventListener('click', () => switchView('journal'));
    navChallenge.addEventListener('click', () => switchView('challenge'));
    navSurprise.addEventListener('click', handleSurpriseMe);

    // Challenge Actions
    saveGoalBtn.addEventListener('click', updateGoal);
    resetChallengeBtn.addEventListener('click', resetChallenge);

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
    console.log('Starting Questionnaire');
    const qView = document.getElementById('questionnaire-view');
    if (!qView) console.error('Questionnaire view not found!');
    qView.classList.remove('hidden');
    console.log('Removed hidden class');
    showStep('step-welcome');
}

function switchView(viewName) {
    toggleSidebar(); // Close menu

    // Hide all
    searchView.classList.add('hidden');
    recsView.classList.add('hidden');
    journalView.classList.add('hidden');
    challengeView.classList.add('hidden');

    // Deactivate navs
    navSearch.classList.remove('active');
    navRecs.classList.remove('active');
    navJournal.classList.remove('active');
    navChallenge.classList.remove('active');
    navSurprise.classList.remove('active');

    if (viewName === 'search') {
        searchView.classList.remove('hidden');
        navSearch.classList.add('active');
    } else if (viewName === 'recs') {
        recsView.classList.remove('hidden');
        navRecs.classList.add('active');
        loadRecommendations();
    } else if (viewName === 'challenge') {
        challengeView.classList.remove('hidden');
        navChallenge.classList.add('active');
        updateChallengeUI();
    } else {
        journalView.classList.remove('hidden');
        navJournal.classList.add('active');
    }
}

async function loadRecommendations() {
    // Check if we have preferences
    if (!userPreferences.genres || userPreferences.genres.length === 0) {
        recsEmpty.classList.remove('hidden');
        recsGrid.innerHTML = '';
        return;
    }

    recsEmpty.classList.add('hidden');
    recsLoading.classList.remove('hidden');
    recsGrid.innerHTML = '';

    // Construct Query from Preferences (Reuse logic from finishQuestionnaire but simpler)
    let queryParts = [];
    let apiQueryParts = [];

    // Authors
    if (userPreferences.authors) {
        const authors = userPreferences.authors.split(',').map(a => a.trim()).filter(a => a.length > 0);
        if (authors.length > 0) {
            apiQueryParts.push(`inauthor:"${authors[0]}"`);
        }
    }

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
            // Add second genre as keyword
            const secondGenreId = userPreferences.genres[1];
            const g2 = genres.find(item => item.id === secondGenreId);
            queryParts.push(g2.label);
        }
    }

    let finalQuery = [...apiQueryParts, ...queryParts].join(' ');
    if (!finalQuery.trim()) finalQuery = 'books';

    try {
        const books = await searchBooks(finalQuery);
        renderRecommendationBooks(books, recsGrid); // Reuse renderBooks logic? Need to expose it or duplicate
    } catch (error) {
        console.error("Error loading recs:", error);
        recsGrid.innerHTML = '<p>Sorry, we couldn\'t load recommendations right now.</p>';
    } finally {
        recsLoading.classList.add('hidden');
    }
}

// Need to make sure renderBooks is available or we implement a simple version here
function renderRecommendationBooks(books, container) {
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

// Step Elements
const readingOptionsContainer = document.getElementById('reading-options');
const readingNextBtn = document.getElementById('reading-next-btn');
const readingSkipBtn = document.getElementById('reading-skip-btn');

const authorInput = document.getElementById('author-input');
const authorNextBtn = document.getElementById('author-next-btn');
const authorSkipBtn = document.getElementById('author-skip-btn');
const authorBackBtn = document.getElementById('author-back-btn');

const genreOptionsContainer = document.getElementById('genre-options');
const genreNextBtn = document.getElementById('genre-next-btn');
const genreSkipBtn = document.getElementById('genre-skip-btn');
const genreBackBtn = document.getElementById('genre-back-btn');

const moodOptionsContainer = document.getElementById('mood-options');
const moodNextBtn = document.getElementById('mood-next-btn');
const moodSkipBtn = document.getElementById('mood-skip-btn');
const moodBackBtn = document.getElementById('mood-back-btn');

const journalOptionsContainer = document.getElementById('journal-options');
const journalBackBtn = document.getElementById('journal-back-btn');
const finishBtn = document.getElementById('finish-btn');

// State
let selectedReadingLevel = null;
let favoriteAuthors = '';
let selectedGenres = new Set();
let selectedMoods = new Set();
let journalPreference = null;
let userPreferences = {
    readingLevel: null,
    authors: '',
    genres: [],
    moods: []
};
let challengeData = {
    goal: 10,
    read: 0,
    badges: [] // 'first-book', 'bookworm', etc.
};

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

const journalOptions = [
    { id: 'yes', label: 'Yes, please!', icon: '📓' },
    { id: 'no', label: 'No thanks', icon: '❌' }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderOptions();
    setupEventListeners();
    loadJournal();
    loadChallenge();
    setupJournalListeners();
    loadPreferences(); // Load saved prefs on startup
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

    // Render Journal Options
    journalOptionsContainer.innerHTML = journalOptions.map(j => `
        <div class="option-btn" data-type="journal" data-value="${j.id}">
            <span class="option-icon">${j.icon}</span>
            <span class="option-label">${j.label}</span>
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

    if (type === 'reading') {
        // Single select
        document.querySelectorAll('[data-type="reading"]').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
        selectedReadingLevel = value;
        readingNextBtn.disabled = false;
    } else if (type === 'journal') {
        // Single select
        document.querySelectorAll('[data-type="journal"]').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
        journalPreference = value;
        // Auto advance for journal? Or just enable finish?
        // Let's just highlight it.
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
    console.log('Toggling sidebar');
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

// --- Challenge Logic ---
function loadChallenge() {
    const saved = localStorage.getItem('bookFinderChallenge');
    if (saved) {
        challengeData = JSON.parse(saved);
        if (!challengeData.badges) challengeData.badges = []; // Migrate old data
    }
    updateChallengeUI();
}

function saveChallenge() {
    localStorage.setItem('bookFinderChallenge', JSON.stringify(challengeData));
    updateChallengeUI();
}

function updateGoal() {
    const newGoal = parseInt(challengeGoalInput.value);
    if (newGoal > 0) {
        challengeData.goal = newGoal;
        saveChallenge();
        alert('Goal updated! Go get em!');
    }
}

function resetChallenge() {
    if (confirm("Start over? This will reset your counter to 0.")) {
        challengeData.read = 0;
        challengeData.badges = [];
        saveChallenge();
    }
}

function updateChallengeUI() {
    // Stats
    challengeGoalInput.value = challengeData.goal;
    booksReadCount.textContent = challengeData.read;

    // Progress Bar
    const percent = Math.min(100, Math.round((challengeData.read / challengeData.goal) * 100));
    progressBarFill.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;

    // Messages
    if (percent === 0) encouragementMsg.textContent = "Let's get started! 🚀";
    else if (percent < 50) encouragementMsg.textContent = "Great start! Keep going! 📖";
    else if (percent < 100) encouragementMsg.textContent = "You're almost there! 🔥";
    else encouragementMsg.textContent = "YOU DID IT! AMAZING! 🎉";

    // Badges Check
    checkBadges();
    renderBadges();
}

function logBook(emoji) {
    challengeData.read++;
    saveChallenge();

    // Fun animation effect could go here
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = "+1";
    setTimeout(() => btn.textContent = originalText, 500);
}
window.logBook = logBook;

function checkBadges() {
    const newBadges = [];

    if (challengeData.read >= 1 && !challengeData.badges.includes('first')) {
        newBadges.push('first');
        challengeData.badges.push('first');
    }
    if (challengeData.read >= 5 && !challengeData.badges.includes('five')) {
        newBadges.push('five');
        challengeData.badges.push('five');
    }
    if (challengeData.read >= challengeData.goal && !challengeData.badges.includes('goal')) {
        newBadges.push('goal');
        challengeData.badges.push('goal');
    }

    if (newBadges.length > 0) {
        saveChallenge(); // Save the new badges
        // Maybe show a toast notification?
    }
}

function renderBadges() {
    if (challengeData.badges.length === 0) {
        badgesGrid.innerHTML = '<div class="badge-placeholder">Read more to unlock trophies! 🏆</div>';
        return;
    }

    const badgeMap = {
        'first': { label: 'First Steps', icon: '🐣', desc: 'Read 1 Book' },
        'five': { label: 'Bookworm', icon: '🐛', desc: 'Read 5 Books' },
        'goal': { label: 'Goal Crusher', icon: '🥇', desc: 'Hit your goal!' }
    };

    badgesGrid.innerHTML = challengeData.badges.map(id => {
        const b = badgeMap[id];
        if (!b) return '';
        return `
            <div class="stat-box" style="min-width: 100px; padding: 1rem;">
                <div style="font-size: 2rem;">${b.icon}</div>
                <div style="font-weight: 700; font-size: 0.9rem;">${b.label}</div>
                <div style="font-size: 0.8rem; color: #888;">${b.desc}</div>
            </div>
        `;
    }).join('');
}

function handleSurpriseMe() {
    // Just simple for now: Pick a random genre and search
    const randomGenres = ['fantasy', 'mystery', 'adventure', 'scifi', 'humor'];
    const r = randomGenres[Math.floor(Math.random() * randomGenres.length)];

    searchInput.value = `best ${r} books`;
    handleSearch({ preventDefault: () => { } });
    switchView('search');
}

function setupEventListeners() {
    // Welcome -> Reading
    startBtn.addEventListener('click', () => showStep('step-reading'));
    skipBtn.addEventListener('click', () => questionnaireView.classList.add('hidden'));

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

    // Mood -> Journal
    moodNextBtn.addEventListener('click', () => showStep('step-journal'));
    moodSkipBtn.addEventListener('click', () => showStep('step-journal'));
    moodBackBtn.addEventListener('click', () => showStep('step-genres'));

    // Journal -> Finish
    journalBackBtn.addEventListener('click', () => showStep('step-mood'));
    finishBtn.addEventListener('click', finishQuestionnaire);
}

function showStep(stepId) {
    console.log(`Showing step: ${stepId}`);
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    const step = document.getElementById(stepId);
    if (step) {
        step.classList.add('active');
        console.log(`Step ${stepId} activated`);
    } else {
        console.error(`Step ${stepId} not found!`);
    }
}

async function finishQuestionnaire() {
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

        // Log Journal Preference
        console.log('Journal Preference:', journalPreference);

        // Save Preferences for Auto Recommendations
        savePreferences();

        // Hide Questionnaire
        questionnaireView.classList.add('hidden');

        // Update Search Input
        searchInput.value = finalQuery;

        // Trigger Search
        await handleSearch({ preventDefault: () => { } });
    }
}
// Expose for testing/debugging
// Assuming these functions/variables are defined elsewhere in the script
// and need to be accessible globally for debugging or specific interactions.
// Note: `renderOptions`, `readingLevels`, `genres`, `startQuestionnaire`, `userPreferences`
// are not defined in the provided snippet, but are assumed to exist in the full context.
// The `});` before `closeModalBtn.addEventListener` seems to be a syntax error
// if not closing an immediately preceding block. I will remove it assuming it's a typo
// and the intention is to expose these globally at this point in the script.
window.renderOptions = renderOptions;
window.readingLevels = readingLevels;
window.genres = genres;
window.startQuestionnaire = startQuestionnaire;
window.finishQuestionnaire = finishQuestionnaire;
window.showStep = showStep;
window.userPreferences = userPreferences;

// Event Listeners
searchForm.addEventListener('submit', handleSearch);
backToSearchBtn.addEventListener('click', showSearch);
closeModalBtn.addEventListener('click', closeModal);
bookModal.addEventListener('click', (e) => {
    if (e.target === bookModal) closeModal();
});

// Handlers
async function handleSearch(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    showResultsView();
    showLoading(true);
    resultsTitle.textContent = `Results for "${query}"`;

    const books = await searchBooks(query);

    // Sort by popularity (ratingsCount)
    // We prioritize books with high ratings count as a proxy for popularity
    books.sort((a, b) => {
        const countA = a.volumeInfo.ratingsCount || 0;
        const countB = b.volumeInfo.ratingsCount || 0;
        return countB - countA;
    });
    // books.sort((a, b) => {
    //     const countA = a.volumeInfo.ratingsCount || 0;
    //     const countB = b.volumeInfo.ratingsCount || 0;
    //     return countB - countA;
    // });

    // Filter out books without images
    const booksWithImages = books.filter(book => book.volumeInfo.imageLinks?.thumbnail);

    // Filter out "meta-books" (guides, summaries, bibliographies, academic texts)
    const metaKeywords = [
        'summary', 'analysis', 'study guide', 'notes', 'sparknotes', 'cliffsnotes',
        'writing', 'how to', 'guide', 'handbook', 'companion', 'encyclopedia'
    ];

    const excludedCategories = [
        'literary criticism', 'biography', 'history', 'social science',
        'education', 'language arts', 'reference', 'computers', 'technology'
    ];


    const filteredBooks = booksWithImages.filter(book => {
        // Always show curated books immediately, bypassing other filters
        if (book.isCurated === true) return true;

        const title = book.volumeInfo.title.toLowerCase();
        const subtitle = book.volumeInfo.subtitle?.toLowerCase() || '';
        const categories = (book.volumeInfo.categories || []).map(c => c.toLowerCase());

        // Check for meta keywords in title
        const isMeta = metaKeywords.some(keyword => title.includes(keyword) || subtitle.includes(keyword));

        // Check for excluded categories
        // We only exclude if the category is explicitly in our blocklist AND it's not also "Fiction"
        // (Some books might have multiple categories like "Fiction" and "Historical")
        const hasExcludedCategory = categories.some(cat =>
            excludedCategories.some(excluded => cat.includes(excluded))
        ) && !categories.some(cat => cat.includes('fiction') || cat.includes('fantasy') || cat.includes('sci'));

        // Strict Language Filter
        const isEnglish = book.volumeInfo.language === 'en';

        // Content-based language detection (handling lying metadata)
        const nonEnglishRegex = /[\u0600-\u06FF\u0590-\u05FF\u4E00-\u9FFF\u0400-\u04FF]/;
        const hasNonEnglishChars = nonEnglishRegex.test(title) || nonEnglishRegex.test(subtitle);

        if (!isEnglish || hasNonEnglishChars) {
            return false;
        }

        if (isMeta || hasExcludedCategory) return false;

        // Filter out obscure books: Must have at least some ratings or be a known accolade winner
        // Google Books API often returns 0 or undefined for ratingsCount for less popular books
        const ratingsCount = book.volumeInfo.ratingsCount || 0;
        const isPopularEnough = ratingsCount >= 1; // Relaxed threshold

        // Exception for new/accoladed books that might not have high ratings count yet in this specific API response
        const text = (book.volumeInfo.description + ' ' + (book.searchInfo?.textSnippet || '')).toLowerCase();
        const hasAccolade = ['new york times bestseller', 'the week junior', 'award'].some(term => text.includes(term));

        return isPopularEnough || hasAccolade;
    });

    // Fallback: If strict filtering returns nothing, show any books with images (excluding meta-books)
    if (filteredBooks.length === 0 && booksWithImages.length > 0) {
        const fallbackBooks = booksWithImages.filter(book => {
            const title = book.volumeInfo.title.toLowerCase();
            const subtitle = book.volumeInfo.subtitle?.toLowerCase() || '';
            const categories = (book.volumeInfo.categories || []).map(c => c.toLowerCase());

            const isMeta = metaKeywords.some(keyword => title.includes(keyword) || subtitle.includes(keyword));
            const hasExcludedCategory = categories.some(cat =>
                excludedCategories.some(excluded => cat.includes(excluded))
            ) && !categories.some(cat => cat.includes('fiction') || cat.includes('fantasy') || cat.includes('sci'));

            const isEnglish = book.volumeInfo.language === 'en';

            // Content-based language detection (handling lying metadata)
            const nonEnglishRegex = /[\u0600-\u06FF\u0590-\u05FF\u4E00-\u9FFF\u0400-\u04FF]/;
            const hasNonEnglishChars = nonEnglishRegex.test(title) || nonEnglishRegex.test(subtitle);


            if (!isEnglish || hasNonEnglishChars) {
                return false;
            }

            return !isMeta && !hasExcludedCategory && isEnglish && !hasNonEnglishChars;
        });

        if (fallbackBooks.length > 0) {
            currentBooks = fallbackBooks;
            renderBooks(fallbackBooks);
            showLoading(false);
            return;
        }
    }

    // Accolade Boosting
    // We look for keywords in description or categories to boost "Trusted" books
    const accolades = [
        { term: 'New York Times Bestseller', label: '🏆 NYT Bestseller', score: 1000000 },
        { term: 'The Week Junior', label: '🌟 Week Junior Pick', score: 1000000 },
        { term: 'Award', label: '🏅 Award Winner', score: 500000 }
    ];

    filteredBooks.sort((a, b) => {
        const getScore = (book) => {
            let score = book.volumeInfo.ratingsCount || 0;
            const text = (book.volumeInfo.description + ' ' + (book.searchInfo?.textSnippet || '')).toLowerCase();

            accolades.forEach(accolade => {
                if (text.includes(accolade.term.toLowerCase())) {
                    score += accolade.score;
                }
            });
            return score;
        };

        return getScore(b) - getScore(a);
    });

    currentBooks = filteredBooks;
    renderBooks(filteredBooks);
    showLoading(false);
}

function showSearch() {
    searchSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    searchInput.value = '';
    searchInput.focus();
}

function showResultsView() {
    searchSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    bookGrid.innerHTML = ''; // Clear previous results
}

function showLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        bookGrid.classList.add('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
        bookGrid.classList.remove('hidden');
    }
}


function renderBooks(books) {
    if (!books || books.length === 0) {
        bookGrid.innerHTML = '<p class="no-results">No popular books found. Try a different search.</p>';
        return;
    }

    const accolades = [
        { term: 'New York Times Bestseller', label: '🏆 NYT Bestseller' },
        { term: 'The Week Junior', label: '🌟 Week Junior Pick' },
        { term: 'Award', label: '🏅 Award Winner' }
    ];

    bookGrid.innerHTML = books.map(book => {
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

async function openBookDetails(id) {
    const book = currentBooks.find(b => b.id === id) || await getBookDetails(id);
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
