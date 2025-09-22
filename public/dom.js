// ATLACATL - Enhanced JavaScript for Modern Forum Interface

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
  renderCards() // Load with default sorting (newest)
  updateActivePostsCount()
})

// Initialize all event listeners
function initializeEventListeners() {
  // Header icon buttons
  document.getElementById("addMessageBtn").addEventListener("click", openCardGenerator)
  document.getElementById("searchBtn").addEventListener("click", openSearchModal)
  document.getElementById("translateBtn").addEventListener("click", openTranslateModal)
  document.getElementById("infoBtn").addEventListener("click", () => (window.location.href = "/about.html"))
  document.getElementById("codeBtn").addEventListener("click", openCodeModal)

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
  document.getElementById("mobileFilterModal").addEventListener("click", (e) => {
    if (e.target.id === "mobileFilterModal") closeMobileFilterModal()
  })

  // Mobile filter button and modal
  const mobileFilterBtn = document.getElementById("mobileFilterBtn")
  const closeMobileFilterBtn = document.getElementById("closeMobileFilterModal")

  if (mobileFilterBtn) {
    mobileFilterBtn.addEventListener("click", openMobileFilterModal)
  }

  if (closeMobileFilterBtn) {
    closeMobileFilterBtn.addEventListener("click", closeMobileFilterModal)
  }

  // Mobile filter options
  document.querySelectorAll(".filter-option").forEach((option) => {
    option.addEventListener("click", (e) => {
      const value = e.currentTarget.dataset.value
      sortSelect.value = value

      // Update active state
      document.querySelectorAll(".filter-option").forEach((opt) => opt.classList.remove("active"))
      e.currentTarget.classList.add("active")

      // Apply filter and close modal
      renderCards(true)
      closeMobileFilterModal()
    })
  })

  // Sort toggle for mobile
  const sortToggle = document.getElementById("sortToggle")
  if (sortToggle) {
    sortToggle.addEventListener("click", openMobileFilterModal)
  }

  // Filter tags functionality
  document.querySelectorAll(".filter-tag").forEach((tag) => {
    tag.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-tag").forEach((t) => t.classList.remove("active"))
      e.currentTarget.classList.add("active")
      // Add filter logic here if needed
    })
  })

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts)
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
  // Only trigger if not typing in an input
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return

  switch (e.key) {
    case "n":
    case "N":
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        openCardGenerator()
      }
      break
    case "/":
      e.preventDefault()
      openSearchModal()
      break
    case "Escape":
      closeAllModals()
      break
  }
}

// Close all modals
function closeAllModals() {
  closeCardGenerator()
  closeSearchModal()
  closeTranslateModal()
  closeCodeModal()
  closeMobileFilterModal()
}

// Modal functions
function openCardGenerator() {
  document.getElementById("cardGeneratorModal").classList.add("active")
  document.body.style.overflow = "hidden"
  // Focus on first input
  setTimeout(() => {
    document.getElementById("cardAuthor").focus()
  }, 100)
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
  // Focus on search input if it exists
  setTimeout(() => {
    const searchInput = document.querySelector(".search-input")
    if (searchInput) searchInput.focus()
  }, 100)
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
  // Start console cursor animation
  startConsoleCursor()
}

function closeCodeModal() {
  document.getElementById("codeModal").classList.remove("active")
  document.body.style.overflow = ""
}

function openMobileFilterModal() {
  const mobileFilterModal = document.getElementById("mobileFilterModal")
  if (mobileFilterModal) {
    mobileFilterModal.classList.add("active")
    document.body.style.overflow = "hidden"
  }
}

function closeMobileFilterModal() {
  const mobileFilterModal = document.getElementById("mobileFilterModal")
  if (mobileFilterModal) {
    mobileFilterModal.classList.remove("active")
    document.body.style.overflow = ""
  }
}

// Console cursor animation
function startConsoleCursor() {
  const cursor = document.querySelector(".console-cursor")
  if (cursor) {
    cursor.style.animation = "blink 1s infinite"
  }
}

// Handle card form submission
async function handleCardSubmit(e) {
  e.preventDefault()

  const cardTitle = document.getElementById("cardTitle").value.trim()
  const cardBody = document.getElementById("cardBody").value.trim()
  const cardAuthor = document.getElementById("cardAuthor").value.trim() || "anónimo"
  const isAIEnabled = document.getElementById("aiSwitch").checked

  if (!cardTitle || !cardBody) {
    showNotification("El título y el contenido son obligatorios.", "error")
    return
  }

  // Show loading state
  const submitBtn = document.querySelector(".btn-primary")
  const originalText = submitBtn.textContent
  submitBtn.textContent = "Publicando..."
  submitBtn.disabled = true

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
      showNotification(`Error: ${errorMsg}`, "error")
      return
    }

    // Success - close modal and refresh cards
    closeCardGenerator()
    renderCards(true)
    showNotification("Post publicado exitosamente", "success")
    updateActivePostsCount()

    if (isAIEnabled && responseData.aiResponse) {
      console.log("AI Response:", responseData.aiResponse)
    }
  } catch (error) {
    showNotification(`Error durante la publicación: ${error.message}`, "error")
  } finally {
    // Reset button state
    submitBtn.textContent = originalText
    submitBtn.disabled = false
  }
}

// Show notification
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`
  notification.textContent = message

  // Add styles
  Object.assign(notification.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "12px 20px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "500",
    zIndex: "1001",
    transform: "translateX(100%)",
    transition: "transform 0.3s ease",
    maxWidth: "300px",
  })

  // Set background color based on type
  switch (type) {
    case "success":
      notification.style.background = "#10b981"
      break
    case "error":
      notification.style.background = "#ef4444"
      break
    default:
      notification.style.background = "#3b82f6"
  }

  document.body.appendChild(notification)

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)"
  }, 100)

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = "translateX(100%)"
    setTimeout(() => {
      document.body.removeChild(notification)
    }, 300)
  }, 3000)
}

// Render cards with selected sorting
async function renderCards(reset = true) {
  if (isLoading) return

  isLoading = true
  const sortType = sortSelect.value

  // Show loading state
  if (reset) {
    cardsGrid.innerHTML = `
      <div class="loading-indicator">
        <div style="text-align: center; padding: 40px 20px; color: var(--foreground-subtle);">
          <div style="margin-bottom: 16px; font-size: 24px;">⏳</div>
          <div>Cargando posts...</div>
        </div>
      </div>
    `
  }

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

    // Generate card elements with staggered animation
    recordsArray.forEach((cardData, index) => {
      setTimeout(() => {
        const cardElement = generateCardElement(cardData)
        cardsGrid.appendChild(cardElement)
      }, index * 50) // Stagger by 50ms
    })

    // Add loading indicator if there are more cards
    if (recordsArray.length >= 20) {
      const loadingDiv = document.createElement("div")
      loadingDiv.className = "loading-indicator"
      loadingDiv.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--foreground-subtle); font-style: italic;">
          <div style="margin-bottom: 10px;">⏳</div>
          <div>Cargando más posts...</div>
        </div>
      `
      cardsGrid.appendChild(loadingDiv)
    }

    currentPage++
    hasMoreCards = recordsArray.length >= 20 // Load 20 cards per page

    // Update active posts count
    updateActivePostsCount(recordsArray.length)
  } catch (error) {
    console.error("Error loading cards:", error)
    if (reset) {
      cardsGrid.innerHTML = `
        <div class="error-message">
          <div style="text-align: center; padding: 40px 20px;">
            <div style="margin-bottom: 16px; font-size: 24px;">⚠️</div>
            <div>Error cargando posts: ${error.message}</div>
            <button onclick="renderCards(true)" style="margin-top: 16px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
              Reintentar
            </button>
          </div>
        </div>
      `
    }
  } finally {
    isLoading = false
  }
}

// Update active posts count in sidebar
function updateActivePostsCount(count = null) {
  const activePostsElement = document.getElementById("activePosts")
  if (activePostsElement) {
    if (count !== null) {
      activePostsElement.textContent = count
    } else {
      // Fetch current count
      activePostsElement.textContent = document.querySelectorAll(".card:not(.comment-card)").length
    }
  }
}

// Generate card display element - Enhanced modern design
function generateCardElement(cardData) {
  const cardDiv = document.createElement("div")
  cardDiv.className = "card"
  cardDiv.setAttribute("data-card-id", cardData.id)

  const cardHeader = document.createElement("div")
  cardHeader.className = "card-header"
  cardHeader.innerHTML = `
    <div>
      <span class="card-author">${cardData.card_author}</span>
      <span style="color: var(--foreground-subtle); margin-left: 8px;">•</span>
      <span style="color: var(--foreground-subtle); margin-left: 8px; font-size: 12px;">${formatDate(cardData.card_date)}</span>
    </div>
  `

  const cardTitle = document.createElement("div")
  cardTitle.className = "card-title"
  cardTitle.textContent = cardData.card_title

  const cardBody = document.createElement("div")
  cardBody.className = "card-body"
  cardBody.textContent = cardData.card_body

  const cardFooter = document.createElement("div")
  cardFooter.className = "card-footer"

  const cardInfo = document.createElement("div")
  cardInfo.className = "card-info"
  cardInfo.innerHTML = `
    <span class="card-date">#${cardData.id}</span>
  `

  const cardActions = document.createElement("div")
  cardActions.className = "card-actions"

  const likeButton = document.createElement("button")
  likeButton.className = "action-btn like-btn"
  likeButton.innerHTML = `
    <i class="bi bi-heart"></i>
    <span>${cardData.like_count || 0}</span>
  `
  likeButton.addEventListener("click", (e) => {
    e.stopPropagation()
    handleLike(cardData.id)
  })

  const commentButton = document.createElement("button")
  commentButton.className = "action-btn comment-btn"
  commentButton.innerHTML = `
    <i class="bi bi-chat"></i>
    <span>${cardData.comment_count || 0}</span>
  `
  commentButton.addEventListener("click", (e) => {
    e.stopPropagation()
    viewCardComments(cardData.id)
  })

  cardActions.appendChild(likeButton)
  cardActions.appendChild(commentButton)

  cardFooter.appendChild(cardInfo)
  cardFooter.appendChild(cardActions)

  cardDiv.appendChild(cardHeader)
  cardDiv.appendChild(cardTitle)
  cardDiv.appendChild(cardBody)
  cardDiv.appendChild(cardFooter)

  // Add click handler for full card
  cardDiv.addEventListener("click", () => {
    viewCardComments(cardData.id)
  })

  // Add hover effect enhancement
  cardDiv.addEventListener("mouseenter", () => {
    cardDiv.style.cursor = "pointer"
  })

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
      showNotification(`Error: ${errorMsg}`, "error")
      return
    }

    // Show success feedback
    showNotification("¡Like agregado!", "success")

    // Refresh current view
    if (currentMode === "cards") {
      renderCards(true)
    } else {
      viewCardComments(selectedCardId)
    }
  } catch (error) {
    showNotification(`Error durante el like: ${error.message}`, "error")
  }
}

// View specific card with comments
async function viewCardComments(cardId) {
  currentMode = "comments"
  selectedCardId = cardId

  // Show loading state
  cardsGrid.innerHTML = `
    <div class="loading-indicator">
      <div style="text-align: center; padding: 40px 20px; color: var(--foreground-subtle);">
        <div style="margin-bottom: 16px; font-size: 24px;">⏳</div>
        <div>Cargando comentarios...</div>
      </div>
    </div>
  `

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

    // Display comments with animation
    data.comments.forEach((commentData, index) => {
      setTimeout(
        () => {
          const commentElement = generateCommentElement(commentData)
          cardsGrid.appendChild(commentElement)
        },
        (index + 1) * 100,
      )
    })

    // Add comment form
    const commentForm = document.createElement("div")
    commentForm.className = "comment-form"
    commentForm.innerHTML = `
      <h4><i class="bi bi-chat-plus"></i> Agregar comentario</h4>
      <form id="commentForm">
        <div class="form-group">
          <label class="form-label">Autor</label>
          <input type="text" class="form-input" id="commentAuthor" placeholder="Tu nombre (opcional)" value="anónimo">
        </div>
        <div class="form-group">
          <label class="form-label">Comentario</label>
          <textarea class="form-textarea" id="commentBody" placeholder="Escribe tu comentario..." required></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="backToCards()">Cancelar</button>
          <button type="submit" class="btn-primary">Publicar comentario</button>
        </div>
      </form>
    `
    cardsGrid.appendChild(commentForm)

    // Handle comment form submission
    document.getElementById("commentForm").addEventListener("submit", async (e) => {
      e.preventDefault()
      const commentAuthor = document.getElementById("commentAuthor").value.trim() || "anónimo"
      const commentBody = document.getElementById("commentBody").value.trim()

      if (!commentBody) {
        showNotification("El contenido del comentario es obligatorio.", "error")
        return
      }

      // Show loading state
      const submitBtn = e.target.querySelector(".btn-primary")
      const originalText = submitBtn.textContent
      submitBtn.textContent = "Publicando..."
      submitBtn.disabled = true

      try {
        const response = await fetch(`${BASE_API_URL}/server/comment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: cardId,
            commentAuthor: commentAuthor,
            commentBody: commentBody,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          showNotification(`Error: ${errorData.error || "Error al agregar comentario"}`, "error")
          return
        }

        // Success feedback
        showNotification("Comentario publicado exitosamente", "success")

        // Refresh comments view
        viewCardComments(cardId)
      } catch (error) {
        showNotification(`Error durante el comentario: ${error.message}`, "error")
      } finally {
        submitBtn.textContent = originalText
        submitBtn.disabled = false
      }
    })

    // Add back to cards button
    const backButton = document.createElement("button")
    backButton.innerHTML = `<i class="bi bi-arrow-left"></i> Volver a posts`
    backButton.className = "back-to-cards-btn"
    backButton.addEventListener("click", backToCards)
    cardsGrid.appendChild(backButton)
  } catch (error) {
    console.error("Error loading card:", error)
    cardsGrid.innerHTML = `
      <div class="error-message">
        <div style="text-align: center; padding: 40px 20px;">
          <div style="margin-bottom: 16px; font-size: 24px;">⚠️</div>
          <div>Error cargando post: ${error.message}</div>
          <button onclick="backToCards()" style="margin-top: 16px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
            Volver a posts
          </button>
        </div>
      </div>
    `
  }
}

// Generate comment display element - Enhanced design
function generateCommentElement(commentData) {
  const commentDiv = document.createElement("div")
  commentDiv.className = "card comment-card"

  const commentHeader = document.createElement("div")
  commentHeader.className = "card-header"
  commentHeader.innerHTML = `
    <div>
      <i class="bi bi-chat" style="color: var(--primary); margin-right: 6px;"></i>
      <span class="card-author">${commentData.comment_author}</span>
      <span style="color: var(--foreground-subtle); margin-left: 8px;">•</span>
      <span style="color: var(--foreground-subtle); margin-left: 8px; font-size: 12px;">${formatDate(commentData.comment_date)}</span>
    </div>
  `

  const commentBody = document.createElement("div")
  commentBody.className = "card-body"
  commentBody.textContent = commentData.comment_body

  commentDiv.appendChild(commentHeader)
  commentDiv.appendChild(commentBody)

  return commentDiv
}

// Return to cards view from comments view
function backToCards() {
  currentMode = "cards"
  selectedCardId = null
  selectedCardData = null
  renderCards(true)
}

// Format date for display - Enhanced formatting
function formatDate(utcDateInput) {
  try {
    const date = new Date(utcDateInput)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "ahora"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`

    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    })
  } catch (error) {
    return "fecha inválida"
  }
}

// Scroll to top function
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  })
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

// Initialize infinite scroll
setupInfiniteScroll()

// Add some utility functions for enhanced UX
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Enhanced search functionality (placeholder)
function initializeSearch() {
  const searchInput = document.querySelector(".search-input")
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        const query = e.target.value.trim()
        if (query.length > 2) {
          // Implement search functionality here
          console.log("Searching for:", query)
        }
      }, 300),
    )
  }
}

// Initialize search when search modal opens
document.getElementById("searchBtn").addEventListener("click", () => {
  setTimeout(initializeSearch, 100)
})
