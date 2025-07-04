document.getElementById("domPostBtn").addEventListener("click", postData)
document.getElementById("domConsoleAscButton").addEventListener("click", getRecordsAsc)
document.getElementById("domConsoleDescButton").addEventListener("click", getRecordsDesc)
document.getElementById("domDebugButton").addEventListener("click", debugFunction)
document.getElementById("domPostCommentBtn").addEventListener("click", postComment)
document.getElementById("domCancelCommentBtn").addEventListener("click", cancelComment)
document.getElementById("domBackToCardsBtn").addEventListener("click", backToCards)

const webConsole = document.getElementById("domWebConsole")
const resultGrid = document.getElementById("domResultGrid")

// Global state
let currentMode = "cards" // 'cards' or 'comments'
let selectedCardId = null
let selectedCardData = null

/**
 * Handles the POST request to send card data to the server.
 */
function postData() {
  const cardTitleInput = document.getElementById("domCardTitle")
  const cardBodyInput = document.getElementById("domCardBody")
  const cardAuthorInput = document.getElementById("domCardAuthor")

  const cardTitle = cardTitleInput.value.trim()
  const cardBody = cardBodyInput.value.trim()
  let cardAuthor = cardAuthorInput.value.trim()

  if (cardTitle.length === 0 || cardBody.length === 0) {
    webConsole.value = "Error: Title and Body are required."
    return
  }

  if (cardAuthor.length === 0) {
    cardAuthor = "anonymous"
  }

  const cardDataToSend = {
    cardTitle: cardTitle,
    cardBody: cardBody,
    cardAuthor: cardAuthor,
  }

  const requestOptions = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(cardDataToSend),
    redirect: "follow",
  }

  async function sendPostRequest() {
    try {
      const fetchResponse = await fetch("https://atlacatl.digital/", requestOptions)
      const responseText = await fetchResponse.text()
      webConsole.value = `POST Request Status: ${fetchResponse.status}\nResponse: ${responseText}`

      // Clear form
      cardTitleInput.value = ""
      cardBodyInput.value = ""
      cardAuthorInput.value = ""

      // Refresh the grid
      getRecordsDesc()
    } catch (error) {
      webConsole.value = `Error during POST: ${error.message}`
    }
  }

  sendPostRequest()
}

/**
 * Posts a comment to the selected card
 */
function postComment() {
  if (!selectedCardId) {
    webConsole.value = "Error: No card selected for commenting."
    return
  }

  const commentAuthorInput = document.getElementById("domCommentAuthor")
  const commentBodyInput = document.getElementById("domCommentBody")

  const commentBody = commentBodyInput.value.trim()
  let commentAuthor = commentAuthorInput.value.trim()

  if (commentBody.length === 0) {
    webConsole.value = "Error: Comment body is required."
    return
  }

  if (commentAuthor.length === 0) {
    commentAuthor = "anonymous"
  }

  const commentDataToSend = {
    cardId: selectedCardId,
    commentAuthor: commentAuthor,
    commentBody: commentBody,
  }

  const requestOptions = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(commentDataToSend),
    redirect: "follow",
  }

  async function sendCommentRequest() {
    try {
      const fetchResponse = await fetch("https://atlacatl.digital/server/comment", requestOptions)
      const responseText = await fetchResponse.text()
      webConsole.value = `Comment Status: ${fetchResponse.status}\nResponse: ${responseText}`

      // Clear form
      commentAuthorInput.value = ""
      commentBodyInput.value = ""

      // Refresh the comments view
      viewCardComments(selectedCardId)
    } catch (error) {
      webConsole.value = `Error during comment POST: ${error.message}`
    }
  }

  sendCommentRequest()
}

/**
 * Fetches records from the server in ascending order and displays them.
 */
function getRecordsAsc() {
  webConsole.value = "Fetching records in ascending order..."
  currentMode = "cards"
  updateUIMode()

  async function asyncGetAsc() {
    try {
      const fetchResponse = await fetch("https://atlacatl.digital/server/get/sortasc")
      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`)
      }
      const recordsArray = await fetchResponse.json()

      resultGrid.innerHTML = ""
      recordsArray.forEach((cardElementData) => {
        const cardDisplayElement = generateCardElement(cardElementData)
        resultGrid.appendChild(cardDisplayElement)
      })

      webConsole.value = "Records fetched and displayed in ascending order."
    } catch (error) {
      webConsole.value = `Error fetching ASC: ${error.message}`
    }
  }

  asyncGetAsc()
}

/**
 * Fetches records from the server in descending order and displays them.
 */
function getRecordsDesc() {
  webConsole.value = "Fetching records in descending order..."
  currentMode = "cards"
  updateUIMode()

  async function asyncGetDesc() {
    try {
      const fetchResponse = await fetch("https://atlacatl.digital/server/get/sortdesc")
      webConsole.value = fetchResponse.status.toString()

      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`)
      }
      const recordsArray = await fetchResponse.json()

      resultGrid.innerHTML = ""
      recordsArray.forEach((cardElementData) => {
        const cardDisplayElement = generateCardElement(cardElementData)
        resultGrid.appendChild(cardDisplayElement)
      })

      webConsole.value += "\nRecords fetched and displayed in descending order."
    } catch (error) {
      webConsole.value = `Error fetching DESC: ${error.message}`
    }
  }

  asyncGetDesc()
}

/**
 * Views a specific card and its comments
 */
function viewCardComments(cardId) {
  webConsole.value = `Loading card ${cardId} and comments...`
  currentMode = "comments"
  selectedCardId = cardId
  updateUIMode()

  async function fetchCardAndComments() {
    try {
      const fetchResponse = await fetch(`https://atlacatl.digital/server/card/${cardId}`)
      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! status: ${fetchResponse.status}`)
      }
      const data = await fetchResponse.json()

      selectedCardData = data.card
      resultGrid.innerHTML = ""

      // Display the main card first
      const mainCardElement = generateCardElement(data.card, true)
      resultGrid.appendChild(mainCardElement)

      // Display comments as cards
      data.comments.forEach((commentData) => {
        const commentElement = generateCommentElement(commentData)
        resultGrid.appendChild(commentElement)
      })

      webConsole.value = `Loaded card ${cardId} with ${data.comments.length} comments.`
    } catch (error) {
      webConsole.value = `Error loading card: ${error.message}`
    }
  }

  fetchCardAndComments()
}

/**
 * Handles liking a card
 */
function handleLike(cardId) {
  const likeData = { cardId: cardId }

  const requestOptions = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(likeData),
    redirect: "follow",
  }

  async function sendLikeRequest() {
    try {
      const fetchResponse = await fetch("https://atlacatl.digital/server/like", requestOptions)
      const response = await fetchResponse.json()

      webConsole.value = `Like Status: ${response.status} - ${response.message}`

      if (response.status === "success") {
        // Refresh the current view
        if (currentMode === "cards") {
          getRecordsDesc()
        } else {
          viewCardComments(selectedCardId)
        }
      }
    } catch (error) {
      webConsole.value = `Error during like: ${error.message}`
    }
  }

  sendLikeRequest()
}

/**
 * Creates and returns a DOM element for a single card based on the data.
 */
function generateCardElement(cardData, isMainCard = false) {
  const cardDiv = document.createElement("div")
  cardDiv.className = isMainCard ? "result-card main-card" : "result-card"

  const cardHeader = document.createElement("div")
  cardHeader.className = "result-card-header"
  cardHeader.textContent = `By: ${cardData["card_author"].toString()}`

  const cardTitle = document.createElement("div")
  cardTitle.className = "result-card-title"
  cardTitle.textContent = cardData["card_title"].toString()

  const cardBody = document.createElement("div")
  cardBody.className = "result-card-body"
  cardBody.textContent = cardData["card_body"].toString()

  const cardDate = document.createElement("div")
  cardDate.className = "result-card-date"
  cardDate.textContent = customFormatDate(cardData["card_date"].toString())

  // Card actions
  const cardActions = document.createElement("div")
  cardActions.className = "card-actions"

  // Like button
  const likeButton = document.createElement("button")
  likeButton.textContent = `❤️ Like (${cardData.like_count || 0})`
  likeButton.className = "btn btn-sm btn-outline-danger like-button"
  likeButton.addEventListener("click", () => {
    handleLike(cardData.id)
  })

  // Comment button (only show if not in comment mode)
  if (currentMode === "cards") {
    const commentButton = document.createElement("button")
    commentButton.textContent = "💬 Comments"
    commentButton.className = "btn btn-sm btn-outline-primary comment-button"
    commentButton.addEventListener("click", () => {
      viewCardComments(cardData.id)
    })
    cardActions.appendChild(commentButton)
  }

  // Add comment button (only show if in comment mode and this is the main card)
  if (currentMode === "comments" && isMainCard) {
    const addCommentButton = document.createElement("button")
    addCommentButton.textContent = "✏️ Add Comment"
    addCommentButton.className = "btn btn-sm btn-outline-success add-comment-button"
    addCommentButton.addEventListener("click", () => {
      switchToCommentMode(cardData)
    })
    cardActions.appendChild(addCommentButton)
  }

  cardActions.appendChild(likeButton)

  cardDiv.appendChild(cardHeader)
  cardDiv.appendChild(cardTitle)
  cardDiv.appendChild(cardBody)
  cardDiv.appendChild(cardDate)
  cardDiv.appendChild(cardActions)

  return cardDiv
}

/**
 * Creates a comment element that looks like a card
 */
function generateCommentElement(commentData) {
  const commentDiv = document.createElement("div")
  commentDiv.className = "result-card comment-card"

  const commentHeader = document.createElement("div")
  commentHeader.className = "result-card-header"
  commentHeader.textContent = `💬 Comment by: ${commentData["comment_author"].toString()}`

  const commentBody = document.createElement("div")
  commentBody.className = "result-card-body"
  commentBody.textContent = commentData["comment_body"].toString()

  const commentDate = document.createElement("div")
  commentDate.className = "result-card-date"
  commentDate.textContent = customFormatDate(commentData["comment_date"].toString())

  commentDiv.appendChild(commentHeader)
  commentDiv.appendChild(commentBody)
  commentDiv.appendChild(commentDate)

  return commentDiv
}

/**
 * Switches the generator to comment mode
 */
function switchToCommentMode(cardData) {
  document.getElementById("cardMode").style.display = "none"
  document.getElementById("commentMode").style.display = "block"
  document.getElementById("generatorTitle").textContent = "Comment Generator"
  document.getElementById("selectedCardTitle").textContent = cardData.card_title
}

/**
 * Cancels comment mode and returns to card mode
 */
function cancelComment() {
  document.getElementById("cardMode").style.display = "block"
  document.getElementById("commentMode").style.display = "none"
  document.getElementById("generatorTitle").textContent = "Card Generator"

  // Clear comment form
  document.getElementById("domCommentAuthor").value = ""
  document.getElementById("domCommentBody").value = ""
}

/**
 * Returns to cards view from comments view
 */
function backToCards() {
  currentMode = "cards"
  selectedCardId = null
  selectedCardData = null
  updateUIMode()
  getRecordsDesc()
}

/**
 * Updates UI elements based on current mode
 */
function updateUIMode() {
  const backButton = document.getElementById("domBackToCardsBtn")
  const resultTitle = document.getElementById("resultGridTitle")

  if (currentMode === "comments") {
    backButton.style.display = "inline-block"
    resultTitle.textContent = "Card & Comments"
  } else {
    backButton.style.display = "none"
    resultTitle.textContent = "Result Grid"
  }

  // Ensure we're in card mode for the generator
  cancelComment()
}

/**
 * Formats a UTC date string into the user's local timezone and preferred language.
 */
function customFormatDate(utcDateInput) {
  try {
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const userLanguage = navigator.language
    const convertedTimeZone = new Date(utcDateInput).toLocaleString(userLanguage, { timeZone: localTimeZone })
    return `pref: ${userLanguage} date: ${convertedTimeZone}`
  } catch (error) {
    return `Error formatting date: ${error.message}`
  }
}

/**
 * Debugging function.
 */
function debugFunction() {
  webConsole.value = `Debug Info:
Current Mode: ${currentMode}
Selected Card ID: ${selectedCardId}
Selected Card: ${selectedCardData ? selectedCardData.card_title : "None"}`
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  getRecordsDesc()
})
