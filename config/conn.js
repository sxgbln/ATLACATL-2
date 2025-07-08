const mysql = require("mysql2/promise")
require("dotenv").config()

const credentials = {
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT),
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
}

const pool = mysql.createPool(credentials)

// Updated sorting functions
async function poolGetByDateAsc() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY card_date ASC`)
    return rows
  } catch (error) {
    console.error("Error in poolGetByDateAsc:", error)
    return error
  }
}

async function poolGetByDateDesc() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY card_date DESC`)
    return rows
  } catch (error) {
    console.error("Error in poolGetByDateDesc:", error)
    return error
  }
}

async function poolGetByLikes() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY like_count DESC, card_date DESC`)
    return rows
  } catch (error) {
    console.error("Error in poolGetByLikes:", error)
    return error
  }
}

async function poolGetByComments() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY comment_count DESC, card_date DESC`)
    return rows
  } catch (error) {
    console.error("Error in poolGetByComments:", error)
    return error
  }
}

// Updated poolPost to include IP address
async function poolPost(cardAuthor, cardTitle, cardBody, ipAddress) {
  const insertQuery = `INSERT INTO cards (card_author, card_title, card_body, card_date, like_count, comment_count, ip_address)
    VALUES (?, ?, ?, UTC_TIMESTAMP(), 0, 0, ?)`
  try {
    const [rows, fields] = await pool.query(insertQuery, [cardAuthor, cardTitle, cardBody, ipAddress])
    return rows
  } catch (error) {
    console.error("Error in poolPost:", error)
    return error
  }
}

// Comment functions remain the same
async function poolGetComments(cardId) {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM comments WHERE card_id = ? ORDER BY comment_date DESC`, [
      cardId,
    ])
    return rows
  } catch (error) {
    console.error("Error in poolGetComments:", error)
    return error
  }
}

// Updated poolPostComment to increment comment_count
async function poolPostComment(cardId, commentAuthor, commentBody, ipAddress) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    // Insert the comment
    const insertQuery = `INSERT INTO comments (card_id, comment_author, comment_body, comment_date, ip_address)
      VALUES (?, ?, ?, UTC_TIMESTAMP(), ?)`
    await connection.query(insertQuery, [cardId, commentAuthor, commentBody, ipAddress])

    // Increment comment count on the card
    await connection.query(`UPDATE cards SET comment_count = comment_count + 1 WHERE id = ?`, [cardId])

    await connection.commit()
    return { status: "success", message: "Comment added and count updated." }
  } catch (error) {
    await connection.rollback()
    console.error("Error in poolPostComment:", error)
    throw error
  } finally {
    connection.release()
  }
}

// Like functions remain the same
async function poolHandleLike(cardId, ipAddress) {
  try {
    const [insertResult] = await pool.query(
      `INSERT INTO likes (card_id, ip_address, liked_at) VALUES (?, ?, UTC_TIMESTAMP())`,
      [cardId, ipAddress],
    )
    if (insertResult.affectedRows > 0) {
      await pool.query(`UPDATE cards SET like_count = like_count + 1 WHERE id = ?`, [cardId])
      return { status: "success", message: "Like recorded and card count updated." }
    } else {
      return { status: "failed", message: "Like record not inserted." }
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.warn("Duplicate like attempt:", error.message)
      return { status: "already_liked", message: "Esta tarjeta ya ha sido marcada como favorita" }
    }
    console.error("Database error in poolHandleLike:", error)
    throw error
  }
}

async function poolGetCardById(cardId) {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards WHERE id = ?`, [cardId])
    return rows[0] || null
  } catch (error) {
    console.error("Error in poolGetCardById:", error)
    return error
  }
}

module.exports = {
  poolGetByDateAsc,
  poolGetByDateDesc,
  poolGetByLikes,
  poolGetByComments,
  poolPost,
  poolGetComments,
  poolPostComment,
  poolHandleLike,
  poolGetCardById,
}
