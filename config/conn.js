// conn.js
const mysql = require("mysql2/promise");
// IMPORTANT: This line is crucial for local development.
// It loads variables from your .env file.
// Make sure 'dotenv' is installed (npm install dotenv) and .env is in .gitignore.
// When deployed on Railway, Railway itself handles injecting these variables,
// so this line has no effect there, but it's harmless to keep.
require('dotenv').config();

const credentials = {
  // These variables MUST be set in your environment (either .env locally or Railway variables)
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT), // Ensure port is parsed as an integer
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: "Z",
};

const pool = mysql.createPool(credentials);

// Original card functions (updated to use 'cards' table)
async function poolGetAsc() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY card_date ASC`);
    return rows;
  } catch (error) {
    console.error("Error in poolGetAsc:", error);
    return error;
  }
}

async function poolGetDesc() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY card_date DESC`);
    return rows;
  } catch (error) {
    console.error("Error in poolGetDesc:", error);
    return error;
  }
}

async function poolPost(cardAuthor, cardTitle, cardBody) {
  const insertQuery = `INSERT INTO cards (card_author, card_title, card_body, card_date, like_count)
    VALUES (?, ?, ?, UTC_TIMESTAMP(), 0)`;
  try {
    const [rows, fields] = await pool.query(insertQuery, [cardAuthor, cardTitle, cardBody]);
    return rows;
  } catch (error) {
    console.error("Error in poolPost:", error);
    return error;
  }
}

// New comment functions
async function poolGetComments(cardId) {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM comments WHERE card_id = ? ORDER BY comment_date DESC`, [
      cardId,
    ]);
    return rows;
  } catch (error) {
    console.error("Error in poolGetComments:", error);
    return error;
  }
}

async function poolPostComment(cardId, commentAuthor, commentBody, ipAddress) {
  const insertQuery = `INSERT INTO comments (card_id, comment_author, comment_body, comment_date, ip_address)
    VALUES (?, ?, ?, UTC_TIMESTAMP(), ?)`;
  try {
    const [rows, fields] = await pool.query(insertQuery, [cardId, commentAuthor, commentBody, ipAddress]);
    return rows;
  } catch (error) {
    console.error("Error in poolPostComment:", error);
    return error;
  }
}

// New like functions
async function poolHandleLike(cardId, ipAddress) {
  try {
    // First, attempt to record the unique like in the 'likes' table
    const [insertResult] = await pool.query(
      `INSERT INTO likes (card_id, ip_address, liked_at) VALUES (?, ?, UTC_TIMESTAMP())`,
      [cardId, ipAddress],
    );

    if (insertResult.affectedRows > 0) {
      // If the like record was successfully inserted, increment the like_count on the card
      await pool.query(`UPDATE cards SET like_count = like_count + 1 WHERE id = ?`, [cardId]);
      return { status: "success", message: "Like recorded and card count updated." };
    } else {
      return { status: "failed", message: "Like record not inserted." };
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.warn("Duplicate like attempt:", error.message);
      return { status: "already_liked", message: "This card has already been liked by this IP." };
    }
    console.error("Database error in poolHandleLike:", error);
    throw error;
  }
}

// Get single card by ID
async function poolGetCardById(cardId) {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards WHERE id = ?`, [cardId]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error in poolGetCardById:", error);
    return error;
  }
}

module.exports = {
  poolGetAsc,
  poolPost,
  poolGetDesc,
  poolGetComments,
  poolPostComment,
  poolHandleLike,
  poolGetCardById,
};
