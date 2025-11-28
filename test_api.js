import { searchBooks } from './api.js';

// Mock DOM elements if needed (though api.js shouldn't use them)
// api.js uses fetch, which is available in Node 18+

async function test() {
    console.log('Testing searchBooks("mystery")...');
    try {
        const results = await searchBooks('mystery');
        console.log(`Found ${results.length} books.`);
        results.forEach(b => console.log(`- ${b.volumeInfo.title} (Curated: ${b.isCurated})`));
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
