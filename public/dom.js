// Updated generateCardElement function for 4chan-style layout
function generateCardElement(cardData) {
  const cardDiv = document.createElement("div");
  cardDiv.className = "card";

  // Create post number for 4chan aesthetic
  const postNumber = `No.${1000 + Math.floor(Math.random() * 9000)}`;

  const cardHeader = document.createElement("div");
  cardHeader.className = "card-header";
  cardHeader.innerHTML = `
    <span>Por: <span class="card-author">${cardData.card_author}</span></span>
    <span style="color: #2c5aa0; font-size: 11px; font-weight: normal;">${postNumber}</span>
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
    <span style="font-size: 10px; color: #888;">pref: (en-US/America/El_Salvador)</span>
    <span style="font-size: 10px; color: #888;">date: ${formatDate(cardData.card_date)}</span>
  `;

  const cardActions = document.createElement("div");
  cardActions.className = "card-actions";

  const likeButton = document.createElement("button");
  likeButton.className = "action-btn like-btn";
  likeButton.innerHTML = `<span style="color: #c33;">♥</span> <span>${cardData.like_count || 0}</span>`;
  likeButton.addEventListener("click", () => handleLike(cardData.id));

  const commentButton = document.createElement("button");
  commentButton.className = "action-btn comment-btn";
  commentButton.innerHTML = `<span style="color: #2c5aa0;">💬</span> <span>${cardData.comment_count || 0}</span>`;
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

// Updated generateCommentElement function for 4chan-style comments
function generateCommentElement(commentData) {
  const commentDiv = document.createElement("div");
  commentDiv.className = "card comment-card";

  const commentHeader = document.createElement("div");
  commentHeader.className = "card-header";
  commentHeader.innerHTML = `<span style="color: #2c5aa0;">💬 Comentario por: ${commentData.comment_author}</span>`;

  const commentBody = document.createElement("div");
  commentBody.className = "card-body";
  commentBody.textContent = commentData.comment_body;

  const commentDate = document.createElement("div");
  commentDate.className = "card-date";
  commentDate.innerHTML = `<span style="font-size: 11px; color: #666;">${formatDate(commentData.comment_date)}</span>`;

  commentDiv.appendChild(commentHeader);
  commentDiv.appendChild(commentBody);
  commentDiv.appendChild(commentDate);

  return commentDiv;
}