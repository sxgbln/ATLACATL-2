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

// Get cards sorted by date ascending
async function poolGetByDateAsc() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY card_date ASC`)
    return rows
  } catch (error) {
    console.error("Error in poolGetByDateAsc:", error)
    return error
  }
}

// Get cards sorted by date descending
async function poolGetByDateDesc() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY card_date DESC`)
    return rows
  } catch (error) {
    console.error("Error in poolGetByDateDesc:", error)
    return error
  }
}

// Get cards sorted by likes count
async function poolGetByLikes() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY like_count DESC, card_date DESC`)
    return rows
  } catch (error) {
    console.error("Error in poolGetByLikes:", error)
    return error
  }
}

// Get cards sorted by comments count
async function poolGetByComments() {
  try {
    const [rows, fields] = await pool.query(`SELECT * FROM cards ORDER BY comment_count DESC, card_date DESC`)
    return rows
  } catch (error) {
    console.error("Error in poolGetByComments:", error)
    return error
  }
}

// Create new card post
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

// Get comments for a specific card
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

// Post new comment with transaction to update comment count
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

// Handle like with dual verification (IP + device_id)
async function poolHandleLike(cardId, ipAddress, deviceId) {
  try {
    // Try to insert new like with both IP and device_id
    const [insertResult] = await pool.query(
      `INSERT INTO likes (card_id, ip_address, device_id, liked_at) VALUES (?, ?, ?, UTC_TIMESTAMP())`,
      [cardId, ipAddress, deviceId],
    )

    if (insertResult.affectedRows > 0) {
      // Update like count on card
      await pool.query(`UPDATE cards SET like_count = like_count + 1 WHERE id = ?`, [cardId])
      return { status: "success", message: "Like recorded and card count updated." }
    } else {
      return { status: "failed", message: "Like record not inserted." }
    }
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.warn("Duplicate like attempt:", error.message)
      return { status: "already_liked", message: "Ya has marcado esta tarjeta como favorita desde este dispositivo" }
    }
    console.error("Database error in poolHandleLike:", error)
    throw error
  }
}

// Get single card by ID
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
