const express = require("express")
const path = require("path")
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

const app = express()
const port = 3000

app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

// Helper function to get client IP
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    "127.0.0.1"
  )
}

// New unified sorting endpoint
app.get("/server/get/sorted/:sortType", async (request, response) => {
  const sortType = request.params.sortType
  console.log(`GET request received for sorting: ${sortType}`)

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
        rows = await poolGetByDateDesc() // Default to newest
    }
    response.send(rows)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// Keep old endpoints for backward compatibility (optional)
app.get("/server/get/sortasc", async (request, response) => {
  console.log("GET request received for /server/get/sortasc")
  try {
    const rows = await poolGetByDateAsc()
    response.send(rows)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

app.get("/server/get/sortdesc", async (request, response) => {
  console.log("GET request received for /server/get/sortdesc")
  try {
    const rows = await poolGetByDateDesc()
    response.send(rows)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// POST - Create new card (now with IP tracking)
app.post("/", async (request, response) => {
  console.log("POST request received:", request.body)
  try {
    const ipAddress = getClientIP(request)
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

// GET - Single card with comments
app.get("/server/card/:cardId", async (request, response) => {
  console.log(`GET request received for card ID: ${request.params.cardId}`)
  try {
    const cardId = Number.parseInt(request.params.cardId)
    const card = await poolGetCardById(cardId)
    const comments = await poolGetComments(cardId)
    if (!card) {
      return response.status(404).send({ error: "Card not found" })
    }
    response.send({
      card: card,
      comments: comments,
    })
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// POST - Add comment to card
app.post("/server/comment", async (request, response) => {
  console.log("POST comment request received:", request.body)
  try {
    const { cardId, commentAuthor, commentBody } = request.body
    const ipAddress = getClientIP(request)
    const queryResult = await poolPostComment(cardId, commentAuthor, commentBody, ipAddress)
    response.send(queryResult)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// POST - Like a card
app.post("/server/like", async (request, response) => {
  console.log("POST like request received:", request.body)
  try {
    const { cardId } = request.body
    const ipAddress = getClientIP(request)
    const result = await poolHandleLike(cardId, ipAddress)
    response.send(result)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

app.listen(port, () => {
  console.log(`Atlacatl app listening on port ${port}`)
})
