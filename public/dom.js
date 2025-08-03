document.getElementById("domPostBtn").addEventListener("click", postData);
document.getElementById("domRenderButton").addEventListener("click", renderCards);
document.getElementById("domDebugButton").addEventListener("click", debugFunction);
document.getElementById("domPostCommentBtn").addEventListener("click", postComment);
document.getElementById("domCancelCommentBtn").addEventListener("click", cancelComment);
document.getElementById("domBackToCardsBtn").addEventListener("click", backToCards);

const webConsole = document.getElementById("domWebConsole");
const resultGrid = document.getElementById("domResultGrid");
const sortSelect = document.getElementById("domSortSelect");
const BASE_API_URL = "https://www.atlacatl.net";

// Global state management
let currentMode = "cards";
let selectedCardId = null;
let selectedCardData = null;

// Post new card data to server
async function postData() {
  const cardTitleInput = document.getElementById("domCardTitle");
  const cardBodyInput = document.getElementById("domCardBody");
  const cardAuthorInput = document.getElementById("domCardAuthor");

  const cardTitle = cardTitleInput.value.trim();
  const cardBody = cardBodyInput.value.trim();
  let cardAuthor = cardAuthorInput.value.trim();

  if (cardTitle.length === 0 || cardBody.length === 0) {
    webConsole.value = "Error: El título y el contenido son obligatorios.";
    return;
  }

  if (cardAuthor.length === 0) {
    cardAuthor = "anónimo";
  }

  const cardDataToSend = {
    cardTitle: cardTitle,
    cardBody: cardBody,
    cardAuthor: cardAuthor,
  };

  const requestOptions = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(cardDataToSend),
    redirect: "follow",
  };

  try {
    const fetchResponse = await fetch(`${BASE_API_URL}/`, requestOptions);
    const responseText = await fetchResponse.text();
    webConsole.value = `Estado de Publicación: ${fetchResponse.status}\nRespuesta: ${responseText}`;

    // Clear form fields
    cardTitleInput.value = "";
    cardBodyInput.value = "";
    cardAuthorInput.value = "";

    // Refresh cards display
    renderCards();
  } catch (error) {
    webConsole.value = `Error durante la publicación: ${error.message}`;
  }
}

// Post comment to selected card
async function postComment() {
  if (!selectedCardId) {
    webConsole.value = "Error: No hay tarjeta seleccionada para comentar.";
    return;
  }

  const commentAuthorInput = document.getElementById("domCommentAuthor");
  const commentBodyInput = document.getElementById("domCommentBody");

  const commentBody = commentBodyInput.value.trim();
  let commentAuthor = commentAuthorInput.value.trim();

  if (commentBody.length === 0) {
    webConsole.value = "Error: El comentario es obligatorio.";
    return;
  }

  if (commentAuthor.length === 0) {
    commentAuthor = "anónimo";
  }

  const commentDataToSend = {
    cardId: selectedCardId,
    commentAuthor: commentAuthor,
    commentBody: commentBody,
  };

  const requestOptions = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(commentDataToSend),
    redirect: "follow",
  };

  try {
    const fetchResponse = await fetch(`${BASE_API_URL}/server/comment`, requestOptions);
    const responseText = await fetchResponse.text();
    webConsole.value = `Estado del Comentario: ${fetchResponse.status}\nRespuesta: ${responseText}`;

    // Clear comment form
    commentAuthorInput.value = "";
    commentBodyInput.value = "";

    // Refresh card comments view and scroll to new comment on mobile
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    await viewCardComments(selectedCardId);
    if (isMobile) {
      const newComment = resultGrid.querySelector(".comment-card:last-child");
      if (newComment) {
        newComment.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  } catch (error) {
    webConsole.value = `Error durante el comentario: ${error.message}`;
  }
}

// Render cards with selected sorting
async function renderCards() {
  const sortType = sortSelect.value;
  webConsole.value = `Cargando tarjetas ordenadas por: ${getSortDisplayName(sortType)}...`;
  currentMode = "cards";
  updateUIMode();

  try {
    const fetchResponse = await fetch(`${BASE_API_URL}/server/get/sorted/${sortType}`);
    webConsole.value = `HTTP Status: ${fetchResponse.status}`;

    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! status: ${fetchResponse.status}`);
    }

    const recordsArray = await fetchResponse.json();
    resultGrid.innerHTML = "";

    // Generate card elements
    recordsArray.forEach((cardElementData) => {
      const cardDisplayElement = generateCardElement(cardElementData);
      resultGrid.appendChild(cardDisplayElement);
    });

    webConsole.value += `\nTarjetas cargadas y mostradas (${getSortDisplayName(sortType)}).`;
  } catch (error) {
    webConsole.value = `Error cargando tarjetas: ${error.message}`;
  }
}

// Get display name for sort type
function getSortDisplayName(sortType) {
  const names = {
    newest: "Más Recientes",
    oldest: "Más Antiguas",
    likes: "Más Populares",
    comments: "Más Comentadas",
  };
  return names[sortType] || "Más Recientes";
}

// View specific card with comments
async function viewCardComments(cardId) {
  webConsole.value = `Cargando tarjeta ${cardId} y comentarios...`;
  currentMode = "comments";
  selectedCardId = cardId;
  updateUIMode();

  try {
    const fetchResponse = await fetch(`${BASE_API_URL}/server/card/${cardId}`);

    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! status: ${fetchResponse.status}`);
    }

    const data = await fetchResponse.json();
    selectedCardData = data.card;
    resultGrid.innerHTML = "";

    // Display main card
    const mainCardElement = generateCardElement(data.card, true);
    resultGrid.appendChild(mainCardElement);

    // Display comments
    data.comments.forEach((commentData) => {
      const commentElement = generateCommentElement(commentData);
      resultGrid.appendChild(commentElement);
    });

    webConsole.value = `Tarjeta ${cardId} cargada con ${data.comments.length} comentarios.`;
  } catch (error) {
    webConsole.value = `Error cargando tarjeta: ${error.message}`;
  }
}

// Handle like button click with improved feedback
async function handleLike(cardId) {
  const likeData = { cardId: cardId };
  const requestOptions = {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify(likeData),
    redirect: "follow",
  };

  try {
    const fetchResponse = await fetch(`${BASE_API_URL}/server/like`, requestOptions);
    const response = await fetchResponse.json();
    webConsole.value = `Estado del Like: ${response.status} - ${response.message}`;

    if (response.status === "success") {
      // Refresh current view
      if (currentMode === "cards") {
        renderCards();
      } else {
        viewCardComments(selectedCardId);
      }
    }
  } catch (error) {
    webConsole.value = `Error durante el like: ${error.message}`;
  }
}

// Generate card display element
function generateCardElement(cardData, isMainCard = false) {
  const cardDiv = document.createElement("div");
  cardDiv.className = isMainCard ? "result-card main-card" : "result-card";

  const cardHeader = document.createElement("div");
  cardHeader.className = "result-card-header";
  cardHeader.textContent = `Por: ${cardData["card_author"].toString()}`;

  const cardTitle = document.createElement("div");
  cardTitle.className = "result-card-title";
  cardTitle.textContent = cardData["card_title"].toString();

  const cardBody = document.createElement("div");
  cardBody.className = "result-card-body";
  cardBody.textContent = cardData["card_body"].toString();

  const cardDate = document.createElement("div");
  cardDate.className = "result-card-date";
  cardDate.textContent = customFormatDate(cardData["card_date"].toString());

  const cardActions = document.createElement("div");
  cardActions.className = "card-actions";

  // Like button
  const likeButton = document.createElement("button");
  likeButton.textContent = `❤️ Me Gusta (${cardData.like_count || 0})`;
  likeButton.className = "btn btn-sm btn-outline-danger like-button";
  likeButton.addEventListener("click", () => {
    handleLike(cardData.id);
  });

  // Comment button (only in cards mode)
  if (currentMode === "cards") {
    const commentButton = document.createElement("button");
    commentButton.textContent = `💬 Comentarios (${cardData.comment_count || 0})`;
    commentButton.className = "btn btn-sm btn-outline-primary comment-button";
    commentButton.addEventListener("click", () => {
      viewCardComments(cardData.id);
    });
    cardActions.appendChild(commentButton);
  }

  // Add comment button (only in comments mode for main card)
  if (currentMode === "comments" && isMainCard) {
    const addCommentButton = document.createElement("button");
    addCommentButton.textContent = "✏️ Agregar Comentario";
    addCommentButton.className = "btn btn-sm btn-outline-success add-comment-button";
    addCommentButton.addEventListener("click", () => {
      switchToCommentMode(cardData);
    });
    cardActions.appendChild(addCommentButton);
  }

  cardActions.appendChild(likeButton);

  // Assemble card element
  cardDiv.appendChild(cardHeader);
  cardDiv.appendChild(cardTitle);
  cardDiv.appendChild(cardBody);
  cardDiv.appendChild(cardDate);
  cardDiv.appendChild(cardActions);

  return cardDiv;
}

// Generate comment display element
function generateCommentElement(commentData) {
  const commentDiv = document.createElement("div");
  commentDiv.className = "result-card comment-card";

  const commentHeader = document.createElement("div");
  commentHeader.className = "result-card-header";
  commentHeader.textContent = `💬 Comentario por: ${commentData["comment_author"].toString()}`;

  const commentBody = document.createElement("div");
  commentBody.className = "result-card-body";
  commentBody.textContent = commentData["comment_body"].toString();

  const commentDate = document.createElement("div");
  commentDate.className = "result-card-date";
  commentDate.textContent = customFormatDate(commentData["comment_date"].toString());

  commentDiv.appendChild(commentHeader);
  commentDiv.appendChild(commentBody);
  commentDiv.appendChild(commentDate);

  return commentDiv;
}

// Switch UI to comment creation mode
function switchToCommentMode(cardData) {
  document.getElementById("cardMode").style.display = "none";
  document.getElementById("commentMode").style.display = "block";
  document.getElementById("generatorTitle").textContent = "Generador de Comentarios";
  document.getElementById("selectedCardTitle").textContent = cardData.card_title;

  // Scroll to card generator on mobile
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  if (isMobile) {
    const cardGenerator = document.querySelector(".card-generator-section");
    if (cardGenerator) {
      cardGenerator.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

// Cancel comment creation and return to card mode
function cancelComment() {
  document.getElementById("cardMode").style.display = "block";
  document.getElementById("commentMode").style.display = "none";
  document.getElementById("generatorTitle").textContent = "Generador de Tarjetas";
  document.getElementById("domCommentAuthor").value = "";
  document.getElementById("domCommentBody").value = "";
}

// Return to cards view from comments view
function backToCards() {
  currentMode = "cards";
  selectedCardId = null;
  selectedCardData = null;
  updateUIMode();
  renderCards();
}

// Update UI elements based on current mode
function updateUIMode() {
  const backButton = document.getElementById("domBackToCardsBtn");
  const resultTitle = document.getElementById("resultGridTitle");

  if (currentMode === "comments") {
    backButton.style.display = "inline-block";
    resultTitle.textContent = "Tarjeta y Comentarios";
  } else {
    backButton.style.display = "none";
    resultTitle.textContent = "Resultados";
  }

  cancelComment();
}

// Format date for display
function customFormatDate(utcDateInput) {
  try {
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userLanguage = navigator.language;
    const convertedTimeZone = new Date(utcDateInput).toLocaleString(userLanguage, { timeZone: localTimeZone });
    return `pref: ${userLanguage} date: ${convertedTimeZone}`;
  } catch (error) {
    return `Error formatting date: ${error.message}`;
  }
}

// Debug function to show current state
function debugFunction() {
  webConsole.value = `Debug Info:
Modo Actual: ${currentMode}
ID de Tarjeta Seleccionada: ${selectedCardId}
Tarjeta Seleccionada: ${selectedCardData ? selectedCardData.card_title : "Ninguna"}
Ordenamiento: ${getSortDisplayName(sortSelect.value)}
Cookie Device ID: ${document.cookie.includes("device_id") ? "Presente" : "No encontrada"}`;
}

// Initialize app when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  renderCards(); // Load with default sorting (newest)
});