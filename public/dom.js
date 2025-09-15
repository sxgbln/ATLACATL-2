// ATLACATL - New JavaScript for 4chan-inspired interface

const BASE_API_URL = "https://www.atlacatl.net"

// Global state management
let currentMode = "cards"
let selectedCardId = null
let selectedCardData = null

// DOM elements
const cardsGrid = document.getElementById("cardsGrid")
const sortSelect = document.getElementById("sortSelect")

// Initialize app when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners()
  renderCards() // Load with default sorting (newest)
})

// Initialize all event listeners
function initializeEventListeners() {
  // Header icon buttons
  document.getElementById("addMessageBtn").addEventListener("click", openCardGenerator)
  document.getElementById("searchBtn").addEventListener("click", openSearchModal)
  document.getElementById("translateBtn").addEventListener("click", openTranslateModal)
  document.getElementById("infoBtn").addEventListener("click", () => window.location.href = "/about.html")
  document.getElementById("codeBtn").addEventListener("click", openCodeModal)

  // Modal close buttons
  document.getElementById("closeModal").addEventListener("click", closeCardGenerator)
  document.getElementById("closeSearchModal").addEventListener("click", closeSearchModal)
  document.getElementById("closeTranslateModal").addEventListener("click", closeTranslateModal)
  document.getElementById("closeCodeModal").addEventListener("click", closeCodeModal)

  // Card form submission
  document.getElementById("cardForm").addEventListener("submit", handleCardSubmit)

  // Sort dropdown change
  sortSelect.addEventListener("change", renderCards)

  // Modal overlay clicks
  document.getElementById("cardGeneratorModal").addEventListener("click", (e) => {
    if (e.target.id === "cardGeneratorModal") closeCardGenerator()
  })
  document.getElementById("searchModal").addEventListener("click", (e) => {
    if (e.target.id === "searchModal") closeSearchModal()
  })
  document.getElementById("translateModal").addEventListener("click", (e) => {
    if (e.target.id === "translateModal") closeTranslateModal()
  })
  document.getElementById("codeModal").addEventListener("click", (e) => {
    if (e.target.id === "codeModal") closeCodeModal()
  })
}

// Modal functions
function openCardGenerator() {
  document.getElementById("cardGeneratorModal").classList.add("active")
  document.body.style.overflow = "hidden"
}

function closeCardGenerator() {
  document.getElementById("cardGeneratorModal").classList.remove("active")
  document.body.style.overflow = ""
  // Clear form
  document.getElementById("cardForm").reset()
}

function openSearchModal() {
  document.getElementById("searchModal").classList.add("active")
  document.body.style.overflow = "hidden"
}

function closeSearchModal() {
  document.getElementById("searchModal").classList.remove("active")
  document.body.style.overflow = ""
}

function openTranslateModal() {
  document.getElementById("translateModal").classList.add("active")
  document.body.style.overflow = "hidden"
}

function closeTranslateModal() {
  document.getElementById("translateModal").classList.remove("active")
  document.body.style.overflow = ""
}

function openCodeModal() {
  document.getElementById("codeModal").classList.add("active")
  document.body.style.overflow = "hidden"
}

function closeCodeModal() {
  document.getElementById("codeModal").classList.remove("active")
  document.body.style.overflow = ""
}

// Handle card form submission
async function handleCardSubmit(e) {
  e.preventDefault()
  
  const cardTitle = document.getElementById("cardTitle").value.trim()
  const cardBody = document.getElementById("cardBody").value.trim()
  const cardAuthor = document.getElementById("cardAuthor").value.trim() || "anónimo"
  const isAIEnabled = document.getElementById("aiSwitch").checked

  if (!cardTitle || !cardBody) {
    alert("El título y el contenido son obligatorios.")
    return
  }

  const cardData = {
    cardTitle: cardTitle,
    cardBody: cardBody,
    cardAuthor: cardAuthor,
  }

  const endpoint = isAIEnabled ? `${BASE_API_URL}/server/gemini` : `${BASE_API_URL}/`
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardData),
    })

    let responseData
    try {
      responseData = await response.json()
    } catch {
      responseData = await response.text()
    }

    if (!response.ok) {
      const errorMsg = responseData.error || responseData || "Unknown error"
      alert(`Error: ${errorMsg}`)
      return
    }

    // Success - close modal and refresh cards
    closeCardGenerator()
    renderCards()
    
    if (isAIEnabled && responseData.aiResponse) {
      console.log("AI Response:", responseData.aiResponse)
    }
  } catch (error) {
    alert(`Error durante la publicación: ${error.message}`)
  }
}

// Render cards with selected sorting
async function renderCards() {
  const sortType = sortSelect.value
  
  try {
    const response = await fetch(`${BASE_API_URL}/server/get/sorted/${sortType}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const recordsArray = await response.json()
    cardsGrid.innerHTML = ""

    // Generate card elements
    recordsArray.forEach((cardData) => {
      const cardElement = generateCardElement(cardData)
      cardsGrid.appendChild(cardElement)
    })
  } catch (error) {
    console.error("Error loading cards:", error)
    cardsGrid.innerHTML = `<div class="error-message">Error cargando tarjetas: ${error.message}</div>`
  }
}

// Generate card display element
function generateCardElement(cardData) {
  const cardDiv = document.createElement("div")
  cardDiv.className = "card"

  // Card header with author
  const cardHeader = document.createElement("div")
  cardHeader.className = "card-header"
  cardHeader.innerHTML = `<span class="card-author">Por: ${cardData.card_author}</span>`

  // Card title
  const cardTitle = document.createElement("div")
  cardTitle.className = "card-title"
  cardTitle.textContent = cardData.card_title

  // Card body
  const cardBody = document.createElement("div")
  cardBody.className = "card-body"
  
  const bodyText = cardData.card_body
  if (bodyText.includes("🤖 Respuesta de IA:")) {
    // Split content and AI response for better formatting
    const parts = bodyText.split("---")
    if (parts.length > 1) {
      const userContent = parts[0].trim()
      const aiContent = parts[1].trim()
      cardBody.innerHTML = `
        <div>${userContent}</div>
        <hr style="margin: 8px 0; border-color: #ccc;">
        <div style="font-style: italic; color: #666;">${aiContent}</div>
      `
    } else {
      cardBody.textContent = bodyText
    }
  } else {
    cardBody.textContent = bodyText
  }

  // Card footer with date and actions
  const cardFooter = document.createElement("div")
  cardFooter.className = "card-footer"

  const cardDate = document.createElement("div")
  cardDate.className = "card-date"
  cardDate.textContent = formatDate(cardData.card_date)

  const cardActions = document.createElement("div")
  cardActions.className = "card-actions"

  // Like button
  const likeButton = document.createElement("button")
  likeButton.textContent = `❤️ Likes [${cardData.like_count || 0}]`
  likeButton.className = "action-btn like-btn"
  likeButton.addEventListener("click", () => handleLike(cardData.id))

  // Comment button
  const commentButton = document.createElement("button")
  commentButton.textContent = `💬 Comentarios [${cardData.comment_count || 0}]`
  commentButton.className = "action-btn comment-btn"
  commentButton.addEventListener("click", () => viewCardComments(cardData.id))

  cardActions.appendChild(likeButton)
  cardActions.appendChild(commentButton)

  cardFooter.appendChild(cardDate)
  cardFooter.appendChild(cardActions)

  // Assemble card
  cardDiv.appendChild(cardHeader)
  cardDiv.appendChild(cardTitle)
  cardDiv.appendChild(cardBody)
  cardDiv.appendChild(cardFooter)

  return cardDiv
}

// Handle like button click
async function handleLike(cardId) {
  try {
    const response = await fetch(`${BASE_API_URL}/server/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: cardId }),
    })

    let responseData
    try {
      responseData = await response.json()
    } catch {
      responseData = await response.text()
    }

    if (!response.ok) {
      const errorMsg = responseData.error || responseData || "Unknown error"
      alert(`Error: ${errorMsg}`)
      return
    }

    // Refresh current view
    if (currentMode === "cards") {
      renderCards()
    } else {
      viewCardComments(selectedCardId)
    }
  } catch (error) {
    alert(`Error durante el like: ${error.message}`)
  }
}

// View specific card with comments
async function viewCardComments(cardId) {
  currentMode = "comments"
  selectedCardId = cardId
  
  try {
    const response = await fetch(`${BASE_API_URL}/server/card/${cardId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    selectedCardData = data.card
    cardsGrid.innerHTML = ""

    // Display main card
    const mainCardElement = generateCardElement(data.card)
    mainCardElement.classList.add("main-card")
    cardsGrid.appendChild(mainCardElement)

    // Display comments
    data.comments.forEach((commentData) => {
      const commentElement = generateCommentElement(commentData)
      cardsGrid.appendChild(commentElement)
    })

    // Add back to cards button
    const backButton = document.createElement("button")
    backButton.textContent = "← Volver a tarjetas"
    backButton.className = "action-btn"
    backButton.style.marginTop = "20px"
    backButton.addEventListener("click", backToCards)
    cardsGrid.appendChild(backButton)
  } catch (error) {
    console.error("Error loading card:", error)
    cardsGrid.innerHTML = `<div class="error-message">Error cargando tarjeta: ${error.message}</div>`
  }
}

// Generate comment display element
function generateCommentElement(commentData) {
  const commentDiv = document.createElement("div")
  commentDiv.className = "card comment-card"

  const commentHeader = document.createElement("div")
  commentHeader.className = "card-header"
  commentHeader.innerHTML = `<span class="card-author">💬 Comentario por: ${commentData.comment_author}</span>`

  const commentBody = document.createElement("div")
  commentBody.className = "card-body"
  commentBody.textContent = commentData.comment_body

  const commentDate = document.createElement("div")
  commentDate.className = "card-date"
  commentDate.textContent = formatDate(commentData.comment_date)

  commentDiv.appendChild(commentHeader)
  commentDiv.appendChild(commentBody)
  commentDiv.appendChild(commentDate)

  return commentDiv
}

// Return to cards view from comments view
function backToCards() {
  currentMode = "cards"
  selectedCardId = null
  selectedCardData = null
  renderCards()
}

// Format date for display
function formatDate(utcDateInput) {
  try {
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const userLanguage = navigator.language
    const convertedTimeZone = new Date(utcDateInput).toLocaleString(userLanguage, { timeZone: localTimeZone })
    return `información sobre fecha: ${convertedTimeZone}`
  } catch (error) {
    return `Error formatting date: ${error.message}`
  }
}