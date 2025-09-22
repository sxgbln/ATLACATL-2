// ATLACATL - New JavaScript for 4chan-inspired interface

const BASE_API_URL = "https://www.atlacatl.net"

// Global state management
let currentMode = "cards"
let selectedCardId = null
let selectedCardData = null
let currentPage = 1
let isLoading = false
let hasMoreCards = true

// DOM elements
const cardsGrid = document.getElementById("cardsGrid")
const sortSelect = document.getElementById("sortSelect")

// Initialize app when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners()
  // Set default sort to newest
  if (sortSelect) {
    sortSelect.value = "newest"
  }
  renderCards(true) // Load with default sorting (newest)
})

// Initialize all event listeners
function initializeEventListeners() {
  // Header icon buttons
  document.getElementById("addMessageBtn").addEventListener("click", openCardGenerator)
  document.getElementById("searchBtn").addEventListener("click", openSearchModal)
  document.getElementById("translateBtn").addEventListener("click", openTranslateModal)
  document.getElementById("infoBtn").addEventListener("click", () => window.location.href = "/about.html")
  document.getElementById("codeBtn").addEventListener("click", openCodeModal)
  
  // Mobile filter button
  const mobileFilterBtn = document.getElementById("mobileFilterBtn")
  if (mobileFilterBtn) {
    // Only show on mobile
    if (window.innerWidth <= 768) {
      mobileFilterBtn.style.display = "flex"
    }
    mobileFilterBtn.addEventListener("click", () => {
      document.querySelector(".right-sidebar-card").style.display = "block"
    })
    // Hide/show based on screen size
    window.addEventListener("resize", () => {
      mobileFilterBtn.style.display = window.innerWidth <= 768 ? "flex" : "none"
    })
  }

  // Make ATLACATL branding clickable for scroll to top
  document.querySelector(".site-title").addEventListener("click", scrollToTop)

  // Highlight add cards icon
  document.getElementById("addMessageBtn").classList.add("highlighted")

  // Modal close buttons
  document.getElementById("closeModal").addEventListener("click", closeCardGenerator)
  document.getElementById("closeSearchModal").addEventListener("click", closeSearchModal)
  document.getElementById("closeTranslateModal").addEventListener("click", closeTranslateModal)
  document.getElementById("closeCodeModal").addEventListener("click", closeCodeModal)

  // Card form submission
  document.getElementById("cardForm").addEventListener("submit", handleCardSubmit)

  // Sort dropdown change
  sortSelect.addEventListener("change", () => renderCards(true))

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
  document.getElementById("mobileSortModal").addEventListener("click", (e) => {
    if (e.target.id === "mobileSortModal") closeMobileSortModal()
  })

  // Scroll to top button
  document.getElementById("scrollToTopBtn").addEventListener("click", scrollToTop)

  // Mobile sort button
  document.getElementById("mobileSortBtn").addEventListener("click", openMobileSortModal)
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
    renderCards(true)

    if (isAIEnabled && responseData.aiResponse) {
      console.log("AI Response:", responseData.aiResponse)
    }
  } catch (error) {
    alert(`Error durante la publicación: ${error.message}`)
  }
}

// Render cards with selected sorting
async function renderCards(reset = true) {
  if (isLoading) return

  isLoading = true
  // Default to "newest" if sortSelect isn't available yet
  const sortType = sortSelect ? sortSelect.value : "newest"

  try {
    const response = await fetch(`${BASE_API_URL}/server/get/sorted/${sortType}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const recordsArray = await response.json()

    if (reset) {
      cardsGrid.innerHTML = ""
      currentPage = 1
      hasMoreCards = true
    }

    // Generate card elements
    recordsArray.forEach((cardData) => {
      const cardElement = generateCardElement(cardData)
      cardsGrid.appendChild(cardElement)
    })

    // Add loading indicator if there are more cards
    if (recordsArray.length >= 20) {
      const loadingDiv = document.createElement("div")
      loadingDiv.className = "loading-indicator"
      loadingDiv.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666; font-style: italic;">
          <div style="margin-bottom: 10px;">⏳</div>
          <div>Cargando más tarjetas...</div>
        </div>
      `
      cardsGrid.appendChild(loadingDiv)
    }

    currentPage++
    hasMoreCards = recordsArray.length >= 20 // Load 20 cards per page
  } catch (error) {
    console.error("Error loading cards:", error)
    if (reset) {
      cardsGrid.innerHTML = `<div class="error-message">Error cargando tarjetas: ${error.message}</div>`
    }
  } finally {
    isLoading = false
  }
}

// Generate card display element - UPDATED FOR 4CHAN STYLE
function generateCardElement(cardData) {
  const cardDiv = document.createElement("div");
  cardDiv.className = "card";

  const cardHeader = document.createElement("div");
  cardHeader.className = "card-header";
  cardHeader.innerHTML = `
    <span>Por: <span class="card-author">${cardData.card_author}</span></span>
    <span style="color: #2c5aa0; font-size: 11px; font-weight: normal;">${formatDate(cardData.card_date)}</span>
  `;

  const cardTitle = document.createElement("div");
  cardTitle.className = "card-title";
  cardTitle.textContent = cardData.card_title;

  const cardBody = document.createElement("div");
  cardBody.className = "card-body";
  cardBody.textContent = cardData.card_body;

  const cardFooter = document.createElement("div");
  cardFooter.className = "card-footer";

  const cardInfo = document.createElement("div");
  cardInfo.className = "card-info";
  cardInfo.innerHTML = `
    <span>date: ${formatDate(cardData.card_date)}</span>
  `;

  const cardActions = document.createElement("div");
  cardActions.className = "card-actions";

  const likeButton = document.createElement("button");
  likeButton.className = "action-btn like-btn";
  likeButton.innerHTML = `<span style="color: #c33;">♥</span> <span>Likes [${cardData.like_count || 0}]</span>`;
  likeButton.addEventListener("click", () => handleLike(cardData.id));

  const commentButton = document.createElement("button");
  commentButton.className = "action-btn comment-btn";
  commentButton.innerHTML = `<span style="color: #2c5aa0;">💬</span> <span>Comentarios [${cardData.comment_count || 0}]</span>`;
  commentButton.addEventListener("click", () => viewCardComments(cardData.id));

  cardActions.appendChild(likeButton);
  cardActions.appendChild(commentButton);

  cardFooter.appendChild(cardInfo);
  cardFooter.appendChild(cardActions);

  cardDiv.appendChild(cardHeader);
  cardDiv.appendChild(cardTitle);
  cardDiv.appendChild(cardBody);
  cardDiv.appendChild(cardFooter);

  return cardDiv;
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
      renderCards(true)
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

    // Add comment form
    const commentForm = document.createElement("div")
    commentForm.className = "comment-form"
    commentForm.innerHTML = `
      <h4>Agregar comentario</h4>
      <form id="commentForm">
        <div class="form-group">
          <input type="text" class="form-input" id="commentAuthor" placeholder="Autor (opcional)" value="anónimo">
        </div>
        <div class="form-group">
          <textarea class="form-textarea" id="commentBody" placeholder="Escribe tu comentario..." required></textarea>
        </div>
        <button type="submit" class="submit-btn">Publicar comentario</button>
      </form>
    `
    cardsGrid.appendChild(commentForm)

    // Handle comment form submission
    document.getElementById("commentForm").addEventListener("submit", async (e) => {
      e.preventDefault()
      const commentAuthor = document.getElementById("commentAuthor").value.trim() || "anónimo"
      const commentBody = document.getElementById("commentBody").value.trim()

      if (!commentBody) {
        alert("El contenido del comentario es obligatorio.")
        return
      }

      try {
        const response = await fetch(`${BASE_API_URL}/server/comment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: cardId,
            commentAuthor: commentAuthor,
            commentBody: commentBody
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          alert(`Error: ${errorData.error || "Error al agregar comentario"}`)
          return
        }

        // Refresh comments view
        viewCardComments(cardId)
      } catch (error) {
        alert(`Error durante el comentario: ${error.message}`)
      }
    })

    // Add back to cards button
    const backButton = document.createElement("button")
    backButton.textContent = "← Volver a tarjetas"
    backButton.className = "back-to-cards-btn"
    backButton.addEventListener("click", backToCards)
    cardsGrid.appendChild(backButton)
  } catch (error) {
    console.error("Error loading card:", error)
    cardsGrid.innerHTML = `<div class="error-message">Error cargando tarjeta: ${error.message}</div>`
  }
}

// Generate comment display element - UPDATED FOR 4CHAN STYLE
function generateCommentElement(commentData) {
  const commentDiv = document.createElement("div")
  commentDiv.className = "card comment-card"

  const commentHeader = document.createElement("div")
  commentHeader.className = "card-header"
  commentHeader.innerHTML = `<span class="card-author" style="color: #2c5aa0;">💬 Comentario por: ${commentData.comment_author}</span>`

  const commentBody = document.createElement("div")
  commentBody.className = "card-body"
  commentBody.textContent = commentData.comment_body

  const commentDate = document.createElement("div")
  commentDate.className = "card-date"
  commentDate.innerHTML = `<span style="font-size: 11px; color: #666;">${formatDate(commentData.comment_date)}</span>`

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
  renderCards(true)
}

// Format date for display - FIXED to avoid duplication
function formatDate(utcDateInput) {
  try {
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const userLanguage = navigator.language
    const convertedTimeZone = new Date(utcDateInput).toLocaleString(userLanguage, { timeZone: localTimeZone })
    return `pref: ${userLanguage}/${localTimeZone.split('/').slice(0, 2).join('/')}, ${convertedTimeZone}`
  } catch (error) {
    return `Error formatting date: ${error.message}`
  }
}

// Setup scroll to top functionality
function setupScrollToTop() {
  const scrollToTopBtn = document.getElementById("scrollToTopBtn")
  const mobileSortBtn = document.getElementById("mobileSortBtn")

  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add("visible")
      mobileSortBtn.classList.add("visible")
    } else {
      scrollToTopBtn.classList.remove("visible")
      mobileSortBtn.classList.remove("visible")
    }
  })
}

// Scroll to top function
function scrollToTop() {
  const cardsGrid = document.querySelector('.cards-grid')
  if (cardsGrid) {
    cardsGrid.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

// Setup infinite scroll
function setupInfiniteScroll() {
  window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      if (hasMoreCards && !isLoading && currentMode === "cards") {
        // Remove existing loading indicator
        const existingLoading = document.querySelector(".loading-indicator")
        if (existingLoading) {
          existingLoading.remove()
        }
        renderCards(false) // Load more cards without resetting
      }
    }
  })
}

// Handle add comment
async function handleAddComment(cardId) {
  const commentAuthor = prompt("Autor del comentario (opcional):") || "anónimo"
  const commentBody = prompt("Contenido del comentario:")

  if (!commentBody) return

  try {
    const response = await fetch(`${BASE_API_URL}/server/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: cardId,
        commentAuthor: commentAuthor,
        commentBody: commentBody
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      alert(`Error: ${errorData.error || "Error al agregar comentario"}`)
      return
    }

    // Refresh comments view
    viewCardComments(cardId)
  } catch (error) {
    alert(`Error durante el comentario: ${error.message}`)
  }
}