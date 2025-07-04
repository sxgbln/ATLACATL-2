// testing.js
const mysql = require('mysql2/promise');

const credentials = {
    host: 'localhost',
    user: 'express_user',
    password: 'xpress42069',
    database: 'tempdb', // Ensure this is your database name
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: 'Z' // Ensure correct timezone handling for mysql2
};

const pool = mysql.createPool(credentials);

/**
 * Simulates posting a new card to the 'cards' table.
 * @returns {number|null} The ID of the newly inserted card, or null if an error occurred.
 */
async function testInsertCard() {
    const cardAuthor = 'Test Author';
    const cardTitle = 'Test Card Title';
    const cardBody = 'This is a test card body inserted from testing.js.';
    const insertQuery = `INSERT INTO cards (card_author, card_title, card_body, card_date)
                         VALUES (?, ?, ?, UTC_TIMESTAMP())`;
    try {
        console.log('Attempting to insert a new card...');
        const [result] = await pool.query(insertQuery, [cardAuthor, cardTitle, cardBody]);
        console.log(`Successfully inserted card with ID: ${result.insertId}`);
        return result.insertId;
    } catch (error) {
        console.error('Error inserting card:', error.message);
        return null;
    }
}

/**
 * Simulates adding a comment to a specific card.
 * @param {number} cardId The ID of the card to comment on.
 * @returns {boolean} True if the comment was inserted, false otherwise.
 */
async function testInsertComment(cardId) {
    if (!cardId) {
        console.error('Cannot insert comment: No cardId provided.');
        return false;
    }
    const commentAuthor = 'Commenter Bot';
    const commentBody = `This is a test comment for card ID ${cardId}.`;
    // Using a dummy IP for testing. In a real app, this would be request.ip or x-forwarded-for.
    const ipAddress = '192.168.1.100';
    const insertQuery = `INSERT INTO comments (card_id, comment_author, comment_body, comment_date, ip_address)
                         VALUES (?, ?, ?, UTC_TIMESTAMP(), ?)`;
    try {
        console.log(`Attempting to insert a comment for card ID ${cardId}...`);
        const [result] = await pool.query(insertQuery, [cardId, commentAuthor, commentBody, ipAddress]);
        console.log(`Successfully inserted comment with ID: ${result.insertId}`);
        return true;
    } catch (error) {
        console.error(`Error inserting comment for card ID ${cardId}:`, error.message);
        return false;
    }
}

/**
 * Simulates a like action for a specific card, including IP tracking and like count update.
 * This logic is similar to poolHandleLike from our previous discussion.
 * @param {number} cardId The ID of the card to like.
 * @param {string} ipAddress The IP address of the user liking the card.
 * @returns {object} An object indicating the status ('success', 'already_liked', or 'failed').
 */
async function testHandleLike(cardId, ipAddress) {
    if (!cardId) {
        console.error('Cannot handle like: No cardId provided.');
        return { status: 'failed', message: 'No cardId provided.' };
    }
    try {
        console.log(`Attempting to like card ID ${cardId} from IP ${ipAddress}...`);
        // First, attempt to record the unique like in the 'likes' table
        const [insertResult] = await pool.query(
            `INSERT INTO likes (card_id, ip_address, liked_at) VALUES (?, ?, UTC_TIMESTAMP())`,
            [cardId, ipAddress]
        );

        if (insertResult.affectedRows > 0) {
            // If the like record was successfully inserted, increment the like_count on the card
            await pool.query(
                `UPDATE cards SET like_count = like_count + 1 WHERE id = ?`,
                [cardId]
            );
            console.log(`Successfully liked card ID ${cardId}. Like count updated.`);
            return { status: 'success', message: 'Like recorded and card count updated.' };
        } else {
            console.warn(`Like record for card ID ${cardId} not inserted (affectedRows was 0).`);
            return { status: 'failed', message: 'Like record not inserted.' };
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.warn(`Duplicate like attempt for card ID ${cardId} from IP ${ipAddress}.`);
            return { status: 'already_liked', message: 'This card has already been liked by this IP.' };
        }
        console.error(`Error handling like for card ID ${cardId}:`, error.message);
        throw error; // Re-throw other errors
    }
}

/**
 * Main function to run all the test insertions.
 */
async function runTests() {
    let cardId = null;
    try {
        console.log('\n--- Starting Database Insertion Tests ---');

        // Test 1: Insert a new card
        cardId = await testInsertCard();
        if (!cardId) {
            console.error('Failed to insert card. Aborting further tests.');
            return;
        }

        // Test 2: Insert a comment for the new card
        await testInsertComment(cardId);

        // Test 3: Like the new card from a dummy IP
        const dummyIp1 = '192.168.1.1';
        let likeStatus1 = await testHandleLike(cardId, dummyIp1);
        console.log(`Like 1 status: ${likeStatus1.status} - ${likeStatus1.message}`);

        // Test 4: Try to like the same card again from the same IP (should be 'already_liked')
        let likeStatus2 = await testHandleLike(cardId, dummyIp1);
        console.log(`Like 2 status (same IP): ${likeStatus2.status} - ${likeStatus2.message}`);

        // Test 5: Like the new card from a different dummy IP (should be 'success')
        const dummyIp2 = '192.168.1.2';
        let likeStatus3 = await testHandleLike(cardId, dummyIp2);
        console.log(`Like 3 status (different IP): ${likeStatus3.status} - ${likeStatus3.message}`);

        console.log('\n--- Database Insertion Tests Complete ---');

        // Optional: Verify the card's like_count by fetching it
        const [rows] = await pool.query(`SELECT id, like_count FROM cards WHERE id = ?`, [cardId]);
        if (rows.length > 0) {
            console.log(`Current like_count for card ID ${rows[0].id}: ${rows[0].like_count}`);
        }

    } catch (error) {
        console.error('An unhandled error occurred during tests:', error.message);
    } finally {
        // Always end the pool connection when done
        await pool.end();
        console.log('Database connection pool closed.');
    }
}

// Run the tests
runTests();
