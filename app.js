const express = require("express")
const path = require("path")
const {
  poolGetAsc,
  poolGetDesc,
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

// GET ASC - All cards
app.get("/server/get/sortasc", async (request, response) => {
  console.log("GET request received for /server/get/sortasc")
  try {
    const rows = await poolGetAsc()
    response.send(rows)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// GET DESC - All cards
app.get("/server/get/sortdesc", async (request, response) => {
  console.log("GET request received for /server/get/sortdesc")
  try {
    const rows = await poolGetDesc()
    console.log(Object.keys(rows))
    rows.forEach((element) => {
      console.log(Object.keys(element))
      console.log(element["card_body"])
      console.log(element["card_date"])
    })
    response.send(rows)
  } catch (error) {
    response.status(500).send({ error: error.message })
  }
})

// POST - Create new card
app.post("/", async (request, response) => {
  console.log("POST request received:", request.body)
  try {
    const queryResult = await poolPost(request.body.cardAuthor, request.body.cardTitle, request.body.cardBody)
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
