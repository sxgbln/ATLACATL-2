document.getElementById("domPostBtn").addEventListener("click", postData)
document.getElementById("domRenderButton").addEventListener("click", renderCards)
document.getElementById("domPostCommentBtn").addEventListener("click", postComment)
document.getElementById("domCancelCommentBtn").addEventListener("click", cancelComment)
document.getElementById("domBackToCardsBtn").addEventListener("click", backToCards)

const webConsole = document.getElementById("domWebConsole")
const resultGrid = document.getElementById("domResultGrid")
const sortSelect = document.getElementById("domSortSelect")
const BASE_API_URL = "https://www.atlacatl.net"

// Global state management
let currentMode = "cards"
let selectedCardId = null
let selectedCardData = null

async function postData() {
  const cardTitleInput = document.getElementById("domCardTitle")
  const cardBodyInput = document.getElementById("domCardBody")
  const cardAuthorInput = document.getElementById("domCardAuthor")
  const aiSwitch = document.getElementById("aiResponseSwitch")

  const cardTitle = cardTitleInput.value.trim()
  const cardBody = cardBodyInput.value.trim()
  let cardAuthor = cardAuthorInput.value.trim()
  const isAIEnabled = aiSwitch.checked

  if (cardTitle.length === 0 || cardBody.length === 0) {
    webConsole.value = "Error: El título y el contenido son obligatorios."
    return
  }

  if (cardAuthor.length === 0) {
    cardAuthor = "anónimo"
  }

  const cardDataToSend = {
    cardTitle: cardTitle,
    cardBody: cardBody,
    cardAuthor: cardAuthor,
  }

  const endpoint = isAIEnabled ? `${BASE_API_URL}/server/gemini` : `${BASE_API_URL}/`
  const statusMessage = isAIEnabled ? "Procesando con IA..." : "Publicando tarjeta..."

  webConsole.value = statusMessage

  const requestOptions = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(cardDataToSend),
    redirect: "follow",
  }

  try {
    const fetchResponse = await fetch(endpoint, requestOptions)
    let responseData
    try {
      responseData = await fetchResponse.json() // Parse as JSON if possible
    } catch {
      responseData = await fetchResponse.text() // Fallback to text if not JSON
    }

    if (!fetchResponse.ok) {
      // Handle errors like rate limiting (429) or others
      const errorMsg = responseData.error || responseData || "Unknown error"
      webConsole.value = `Error en Publicación: HTTP Status ${fetchResponse.status} - ${errorMsg}`
      return
    }

    if (isAIEnabled && responseData.aiResponse) {
      webConsole.value = `✅ Tarjeta con IA publicada exitosamente!\n🤖 IA respondió: ${responseData.aiResponse.substring(0, 100)}${responseData.aiResponse.length > 100 ? "..." : ""}`
    } else {
      webConsole.value = `Estado de Publicación: ${fetchResponse.status}\nRespuesta: ${JSON.stringify(responseData)}`
    }

    // Clear form fields
    cardTitleInput.value = ""
    cardBodyInput.value = ""
    cardAuthorInput.value = ""

    // Refresh cards display
    renderCards()
  } catch (error) {
    webConsole.value = `Error durante la publicación: ${error.message}`
  }
}

// Post comment to selected card
async function postComment() {
  if (!selectedCardId) {
    webConsole.value = "Error: No hay tarjeta seleccionada para comentar."
    return
  }

  const commentAuthorInput = document.getElementById("domCommentAuthor")
  const commentBodyInput = document.getElementById("domCommentBody")

  const commentBody = commentBodyInput.value.trim()
  let commentAuthor = commentAuthorInput.value.trim()

  if (commentBody.length === 0) {
    webConsole.value = "Error: El comentario es obligatorio."
    return
  }

  if (commentAuthor.length === 0) {
    commentAuthor = "anónimo"
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

  try {
    const fetchResponse = await fetch(`${BASE_API_URL}/server/comment`, requestOptions)
    let responseData
    try {
      responseData = await fetchResponse.json() // Parse as JSON if possible
    } catch {
      responseData = await fetchResponse.text() // Fallback to text if not JSON
    }

    if (!fetchResponse.ok) {
      // Handle errors like rate limiting (429) or others
      const errorMsg = responseData.error || responseData || "Unknown error"
      webConsole.value = `Error en Comentario: HTTP Status ${fetchResponse.status} - ${errorMsg}`
      return
    }

    webConsole.value = `Estado del Comentario: ${fetchResponse.status}\nRespuesta: ${JSON.stringify(responseData)}`

    // Clear comment form
    commentAuthorInput.value = ""
    commentBodyInput.value = ""

    // Refresh card comments view and scroll to new comment on mobile
    const isMobile = window.matchMedia("(max-width: 767px)").matches
    await viewCardComments(selectedCardId)
    if (isMobile) {
      const newComment = resultGrid.querySelector(".comment-card:last-child")
      if (newComment) {
        newComment.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  } catch (error) {
    webConsole.value = `Error durante el comentario: ${error.message}`
  }
}

// Render cards with selected sorting
async function renderCards() {
  const sortType = sortSelect.value
  webConsole.value = `Cargando tarjetas ordenadas por: ${getSortDisplayName(sortType)}...`
  currentMode = "cards"
  updateUIMode()

  try {
    const fetchResponse = await fetch(`${BASE_API_URL}/server/get/sorted/${sortType}`)
    webConsole.value = `HTTP Status: ${fetchResponse.status}`

    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! status: ${fetchResponse.status}`)
    }

    const recordsArray = await fetchResponse.json()
    resultGrid.innerHTML = ""

    // Generate card elements
    recordsArray.forEach((cardElementData) => {
      const cardDisplayElement = generateCardElement(cardElementData)
      resultGrid.appendChild(cardDisplayElement)
    })

    webConsole.value += `\nTarjetas cargadas y mostradas (${getSortDisplayName(sortType)}).`
  } catch (error) {
    webConsole.value = `Error cargando tarjetas: ${error.message}`
  }
}

// Get display name for sort type
function getSortDisplayName(sortType) {
  const names = {
    newest: "Más Recientes",
    oldest: "Más Antiguas",
    likes: "Más Populares",
    comments: "Más Comentadas",
  }
  return names[sortType] || "Más Recientes"
}

// View specific card with comments
async function viewCardComments(cardId) {
  webConsole.value = `Cargando tarjeta ${cardId} y comentarios...`
  currentMode = "comments"
  selectedCardId = cardId
  updateUIMode()

  try {
    const fetchResponse = await fetch(`${BASE_API_URL}/server/card/${cardId}`)

    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! status: ${fetchResponse.status}`)
    }

    const data = await fetchResponse.json()
    selectedCardData = data.card
    resultGrid.innerHTML = ""

    // Display main card
    const mainCardElement = generateCardElement(data.card, true)
    resultGrid.appendChild(mainCardElement)

    // Display comments
    data.comments.forEach((commentData) => {
      const commentElement = generateCommentElement(commentData)
      resultGrid.appendChild(commentElement)
    })

    webConsole.value = `Tarjeta ${cardId} cargada con ${data.comments.length} comentarios.`
  } catch (error) {
    webConsole.value = `Error cargando tarjeta: ${error.message}`
  }
}

// Handle like button click with improved feedback
async function handleLike(cardId) {
  const likeData = { cardId: cardId }
  const requestOptions = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(likeData),
    redirect: "follow",
  }

  try {
    const fetchResponse = await fetch(`${BASE_API_URL}/server/like`, requestOptions)
    let responseData
    try {
      responseData = await fetchResponse.json() // Parse as JSON if possible
    } catch {
      responseData = await fetchResponse.text() // Fallback to text if not JSON
    }

    if (!fetchResponse.ok) {
      // Handle errors like rate limiting (429) or others
      const errorMsg = responseData.error || responseData || "Unknown error"
      webConsole.value = `Error en Like: HTTP Status ${fetchResponse.status} - ${errorMsg}`
      return
    }

    webConsole.value = `Estado del Like: ${responseData.status} - ${responseData.message}`

    if (responseData.status === "success") {
      // Refresh current view
      if (currentMode === "cards") {
        renderCards()
      } else {
        viewCardComments(selectedCardId)
      }
    }
  } catch (error) {
    webConsole.value = `Error durante el like: ${error.message}`
  }
}

function generateCardElement(cardData, isMainCard = false) {
  const cardDiv = document.createElement("div")
  cardDiv.className = isMainCard ? "result-card main-card" : "result-card"

  const cardHeader = document.createElement("div")
  cardHeader.className = "result-card-header"
  cardHeader.textContent = `Por: ${cardData["card_author"].toString()}`

  const cardTitle = document.createElement("div")
  cardTitle.className = "result-card-title"
  cardTitle.textContent = cardData["card_title"].toString()

  const cardBody = document.createElement("div")
  cardBody.className = "result-card-body"

  const bodyText = cardData["card_body"].toString()
  if (bodyText.includes("🤖 Respuesta de IA:")) {
    // Split content and AI response for better formatting
    const parts = bodyText.split("---")
    if (parts.length > 1) {
      const userContent = parts[0].trim()
      const aiContent = parts[1].trim()

      cardBody.innerHTML = `
        <div class="user-content">${userContent}</div>
        <hr style="margin: 8px 0; border-color: #007bff;">
        <div class="ai-content" style="font-style: italic; color: #007bff;">${aiContent}</div>
      `
    } else {
      cardBody.textContent = bodyText
    }
  } else {
    cardBody.textContent = bodyText
  }

  const cardDate = document.createElement("div")
  cardDate.className = "result-card-date"
  cardDate.textContent = customFormatDate(cardData["card_date"].toString())

  const cardActions = document.createElement("div")
  cardActions.className = "card-actions"

  // Like button
  const likeButton = document.createElement("button")
  likeButton.textContent = `❤️ Me Gusta (${cardData.like_count || 0})`
  likeButton.className = "btn btn-sm btn-outline-danger like-button"
  likeButton.addEventListener("click", () => {
    handleLike(cardData.id)
  })

  // Comment button (only in cards mode)
  if (currentMode === "cards") {
    const commentButton = document.createElement("button")
    commentButton.textContent = `💬 Comentarios (${cardData.comment_count || 0})`
    commentButton.className = "btn btn-sm btn-outline-primary comment-button"
    commentButton.addEventListener("click", () => {
      viewCardComments(cardData.id)
    })
    cardActions.appendChild(commentButton)
  }

  // Add comment button (only in comments mode for main card)
  if (currentMode === "comments" && isMainCard) {
    const addCommentButton = document.createElement("button")
    addCommentButton.textContent = "✏️ Agregar Comentario"
    addCommentButton.className = "btn btn-sm btn-outline-success add-comment-button"
    addCommentButton.addEventListener("click", () => {
      switchToCommentMode(cardData)
    })
    cardActions.appendChild(addCommentButton)
  }

  cardActions.appendChild(likeButton)

  // Assemble card element
  cardDiv.appendChild(cardHeader)
  cardDiv.appendChild(cardTitle)
  cardDiv.appendChild(cardBody)
  cardDiv.appendChild(cardDate)
  cardDiv.appendChild(cardActions)

  return cardDiv
}

// Generate comment display element
function generateCommentElement(commentData) {
  const commentDiv = document.createElement("div")
  commentDiv.className = "result-card comment-card"

  const commentHeader = document.createElement("div")
  commentHeader.className = "result-card-header"
  commentHeader.textContent = `💬 Comentario por: ${commentData["comment_author"].toString()}`

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

// Switch UI to comment creation mode
function switchToCommentMode(cardData) {
  const isMobile = window.matchMedia("(max-width: 767px)").matches

  if (isMobile) {
    // Open mobile popup in comment mode
    window.openMobilePopup(true, cardData)
  } else {
    // Desktop comment mode
    document.getElementById("cardMode").style.display = "none"
    document.getElementById("commentMode").style.display = "block"
    document.getElementById("generatorTitle").textContent = "Generador de Comentarios"
    document.getElementById("selectedCardTitle").textContent = cardData.card_title

    const cardGenerator = document.querySelector(".card-generator-section")
    if (cardGenerator) {
      cardGenerator.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }
}

// Cancel comment creation and return to card mode
function cancelComment() {
  document.getElementById("cardMode").style.display = "block"
  document.getElementById("commentMode").style.display = "none"
  document.getElementById("generatorTitle").textContent = "Generador de Tarjetas"
  document.getElementById("domCommentAuthor").value = ""
  document.getElementById("domCommentBody").value = ""
}

// Return to cards view from comments view
function backToCards() {
  currentMode = "cards"
  selectedCardId = null
  selectedCardData = null
  updateUIMode()
  renderCards()
}

// Update UI elements based on current mode
function updateUIMode() {
  const backButton = document.getElementById("domBackToCardsBtn")
  const resultTitle = document.getElementById("resultGridTitle")

  if (currentMode === "comments") {
    backButton.style.display = "inline-block"
    resultTitle.textContent = "Tarjeta y Comentarios"
  } else {
    backButton.style.display = "none"
    resultTitle.textContent = "Resultados"
  }

  cancelComment()
}

// Format date for display
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

// Mobile popup functionality
function initializeMobilePopup() {
  const mobileFabCreate = document.getElementById("mobileFabCreate")
  const mobileFabInfo = document.getElementById("mobileFabInfo")
  const mobilePopupOverlay = document.getElementById("mobilePopupOverlay")
  const mobilePopupClose = document.getElementById("mobilePopupClose")
  const mobileCardGenerator = document.getElementById("mobileCardGenerator")
  const mobileWebConsole = document.getElementById("mobileWebConsole")

  // Check if we're on mobile
  function isMobile() {
    return window.matchMedia("(max-width: 767px)").matches
  }

  function openMobilePopup(isCommentMode = false, cardData = null) {
    if (!isMobile()) return

    const cardGeneratorContent = document.querySelector(".card-generator-subsection")
    const webConsoleContent = document.querySelector(".web-console-subsection")

    // Clear previous content
    mobileCardGenerator.innerHTML = ""
    mobileWebConsole.innerHTML = ""

    if (cardGeneratorContent && mobileCardGenerator) {
      const clonedContent = cardGeneratorContent.cloneNode(true)
      mobileCardGenerator.appendChild(clonedContent)

      if (isCommentMode && cardData) {
        const cardMode = clonedContent.querySelector("#cardMode")
        const commentMode = clonedContent.querySelector("#commentMode")
        const generatorTitle = clonedContent.querySelector("#generatorTitle")
        const selectedCardTitle = clonedContent.querySelector("#selectedCardTitle")
        const aiSwitchContainer = clonedContent.querySelector(".ai-switch-container")

        if (cardMode) cardMode.style.display = "none"
        if (commentMode) commentMode.style.display = "block"
        if (generatorTitle) generatorTitle.textContent = "Generador de Comentarios"
        if (selectedCardTitle) selectedCardTitle.textContent = cardData.card_title

        if (aiSwitchContainer) {
          aiSwitchContainer.classList.add("comment-mode")
          const aiSwitch = aiSwitchContainer.querySelector("#aiResponseSwitch")
          if (aiSwitch) {
            aiSwitch.checked = false
            aiSwitch.disabled = true
          }
        }

        // Re-bind event listeners for comment mode
        const postCommentBtn = clonedContent.querySelector("#domPostCommentBtn")
        const cancelCommentBtn = clonedContent.querySelector("#domCancelCommentBtn")

        if (postCommentBtn) {
          postCommentBtn.addEventListener("click", postComment)
        }
        if (cancelCommentBtn) {
          cancelCommentBtn.addEventListener("click", () => {
            window.closeMobilePopup()
            cancelComment()
          })
        }
      } else {
        const postBtn = clonedContent.querySelector("#domPostBtn")
        if (postBtn) {
          postBtn.addEventListener("click", () => {
            postData().then(() => {
              window.closeMobilePopup()
            })
          })
        }
      }
    }

    if (webConsoleContent && mobileWebConsole) {
      mobileWebConsole.appendChild(webConsoleContent.cloneNode(true))
    }

    mobilePopupOverlay.classList.add("active")
    document.body.style.overflow = "hidden"
  }

  // Close mobile popup
  function closeMobilePopup() {
    mobilePopupOverlay.classList.remove("active")
    document.body.style.overflow = ""
    // Clear popup content
    mobileCardGenerator.innerHTML = ""
    mobileWebConsole.innerHTML = ""
  }

  window.openMobilePopup = openMobilePopup
  window.closeMobilePopup = closeMobilePopup

  // Event listeners for mobile FABs
  if (mobileFabCreate) {
    mobileFabCreate.addEventListener("click", () => openMobilePopup())
  }

  if (mobileFabInfo) {
    mobileFabInfo.addEventListener("click", () => {
      window.location.href = "/about.html"
    })
  }

  if (mobilePopupClose) {
    mobilePopupClose.addEventListener("click", closeMobilePopup)
  }

  if (mobilePopupOverlay) {
    mobilePopupOverlay.addEventListener("click", (e) => {
      if (e.target === mobilePopupOverlay) {
        closeMobilePopup()
      }
    })
  }

  // Handle window resize
  window.addEventListener("resize", () => {
    if (!isMobile() && mobilePopupOverlay.classList.contains("active")) {
      closeMobilePopup()
    }
  })
}

// Initialize app when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  renderCards() // Load with default sorting (newest)
  initializeMobilePopup() // Initialize mobile popup functionality
})
