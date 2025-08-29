const express = require("express")
const path = require("path")
const cookieParser = require("cookie-parser")
const { v4: uuidv4 } = require("uuid")
const {
  poolGetByDateAsc,
  poolGetByDateDesc,
  poolGetByLikes,
  poolGetByComments,
  poolPost,
  poolGetComments,
  poolPostComment,
  poolHandleLike,
  poolGetCardById,
} = require("./config/conn.js")
const rateLimit = require('express-rate-limit')

const app = express()
const port = 3000

// Middleware setup
app.use(express.json())
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))

// Helper function to get client IP (handle Cloudflare/proxy chains)
function getClientIP(req) {
  // Prefer Cloudflare's trusted header if present
  if (req.headers['cf-connecting-ip']) {
    return req.headers['cf-connecting-ip'];
  }
  // Fallback to X-Forwarded-For, taking the first (client) IP
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // Other fallbacks
  return (
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    "127.0.0.1"
  );
}

// Helper function to get or create device ID from cookie
function getOrCreateDeviceId(req, res) {
  let deviceId = req.cookies.device_id

  // If no device cookie exists, create a new one
  if (!deviceId) {
    deviceId = uuidv4()
    // Set cookie to expire in 1 year
    res.cookie("device_id", deviceId, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
      httpOnly: false, // Allow JavaScript access
    })
  }

  return deviceId
}

// Helper function to sanitize card data (remove sensitive info)
function sanitizeCardData(cards) {
  if (Array.isArray(cards)) {
    return cards.map((card) => sanitizeSingleCard(card))
  }
  return sanitizeSingleCard(cards)
}

// Helper function to sanitize single card
function sanitizeSingleCard(card) {
  const { ip_address, device_id, ...sanitizedCard } = card
  return sanitizedCard
}

// Helper function to sanitize comment data
function sanitizeCommentData(comments) {
  if (Array.isArray(comments)) {
    return comments.map((comment) => {
      const { ip_address, device_id, ...sanitizedComment } = comment
      return sanitizedComment
    })
  }
  const { ip_address, device_id, ...sanitizedComment } = comments
  return sanitizedComment
}

// Rate limiters for spam-prone endpoints
// Strict limit for new cards: 2 per 5 minutes per IP
const cardLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 2, // Limit each IP to 2 card posts per 5 minutes
  message: { error: 'Too many requests from this network, please try again later.' },
  keyGenerator: (req) => getClientIP(req), // Use IP as key
})

// Moderate limit for comments: 3 per 5 minutes per IP
const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 3, // Limit each IP to 3 comments per 5 minutes
  message: { error: 'Too many requests from this network, please try again later.' },
  keyGenerator: (req) => getClientIP(req),
})

// Moderate limit for likes: 4 per 5 minutes per IP
const likeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 4, // Limit each IP to 4 likes per 5 minutes
  message: { error: 'Too many requests from this network, please try again later.' },
  keyGenerator: (req) => getClientIP(req),
})

// New unified sorting endpoint with data sanitization
app.get("/server/get/sorted/:sortType", async (request, response) => {
  const sortType = request.params.sortType
  console.log(`GET request received for sorting: ${sortType}`)

  // Set device cookie for future use
  getOrCreateDeviceId(request, response)

  try {
    let rows
    switch (sortType) {
      case "newest":
        rows = await poolGetByDateDesc()
        break
      case "oldest":
        rows = await poolGetByDateAsc()
        break
      case "likes":
        rows = await poolGetByLikes()
        break
      case "comments":
        rows = await poolGetByComments()
        break
      default:
        rows = await poolGetByDateDesc()
    }

    // Sanitize data before sending
    const sanitizedRows = sanitizeCardData(rows)
    response.send(sanitizedRows)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// Keep old endpoints for backward compatibility
app.get("/server/get/sortasc", async (request, response) => {
  console.log("GET request received for /server/get/sortasc")
  getOrCreateDeviceId(request, response)

  try {
    const rows = await poolGetByDateAsc()
    const sanitizedRows = sanitizeCardData(rows)
    response.send(sanitizedRows)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

app.get("/server/get/sortdesc", async (request, response) => {
  console.log("GET request received for /server/get/sortdesc")
  getOrCreateDeviceId(request, response)

  try {
    const rows = await poolGetByDateDesc()
    const sanitizedRows = sanitizeCardData(rows)
    response.send(sanitizedRows)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// POST - Create new card (with IP and device tracking, and rate limiting)
app.post("/", cardLimiter, async (request, response) => {
  console.log("POST request received:", request.body)

  const deviceId = getOrCreateDeviceId(request, response)
  const ipAddress = getClientIP(request)

  try {
    const queryResult = await poolPost(
      request.body.cardAuthor,
      request.body.cardTitle,
      request.body.cardBody,
      ipAddress,
    )
    response.send(queryResult)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// GET - Single card with comments (sanitized)
app.get("/server/card/:cardId", async (request, response) => {
  console.log(`GET request received for card ID: ${request.params.cardId}`)
  getOrCreateDeviceId(request, response)

  try {
    const cardId = Number.parseInt(request.params.cardId)
    const card = await poolGetCardById(cardId)
    const comments = await poolGetComments(cardId)

    if (!card) {
      return response.status(404).send({ error: "Card not found" })
    }

    // Sanitize both card and comments data
    const sanitizedCard = sanitizeCardData(card)
    const sanitizedComments = sanitizeCommentData(comments)

    response.send({
      card: sanitizedCard,
      comments: sanitizedComments,
    })
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// POST - Add comment to card (with device tracking, and rate limiting)
app.post("/server/comment", commentLimiter, async (request, response) => {
  console.log("POST comment request received:", request.body)

  const deviceId = getOrCreateDeviceId(request, response)
  const ipAddress = getClientIP(request)

  try {
    const { cardId, commentAuthor, commentBody } = request.body
    const queryResult = await poolPostComment(cardId, commentAuthor, commentBody, ipAddress)
    response.send(queryResult)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// POST - Like a card (with dual IP + device verification, and rate limiting)
app.post("/server/like", likeLimiter, async (request, response) => {
  console.log("POST like request received:", request.body)

  const deviceId = getOrCreateDeviceId(request, response)
  const ipAddress = getClientIP(request)

  try {
    const { cardId } = request.body
    const result = await poolHandleLike(cardId, ipAddress, deviceId)
    response.send(result)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Atlacatl app listening on port ${port}`)
})