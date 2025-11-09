# ATLACATL Technical Documentation

## 1\. Overview

Welcome to the technical documentation for ATLACATL, the first Salvadoran social network. This document provides a comprehensive overview of the project's architecture, technology stack, and core functionalities.

The guiding design principle is a "4chan-esque" aesthetic: simple, functional, and content-focused, with a responsive layout that is charmingly straightforward rather than minimalist.

## 2\. Technology Stack

### Frontend

* **Language:** Vanilla JavaScript (ES6+), HTML5, CSS3
* **Core Logic:** All DOM manipulation, event handling, and API communication is managed in `public/dom.js`.
* **Styling:**

  * Custom CSS for a unique, retro-inspired theme (`public/style.css`).
  * Responsive design handled by `public/desktop.css` and `public/mobile.css`.

* **Libraries:**

  * **Bootstrap Icons:** For iconography.
  * **Google Fonts:** For typography (`Kanit` and `Open Sans`).

### Backend

* **Runtime/Framework:** Node.js with Express.js
* **Database:** MySQL (connected via the `mysql2` promise-based library).
* **Key Dependencies:**

  * `express`: Core web framework.
  * `mysql2`: Database driver.
  * `dotenv`: Manages environment variables.
  * `cookie-parser`: Middleware for handling cookies.
  * `uuid`: Generates unique device IDs for anti-spam measures.
  * `express-rate-limit`: Provides rate limiting to prevent abuse.
  * `@google/genai`: Integrates with Google's Gemini API for AI-powered content enhancement.

## 3\. Architecture

ATLACATL is built as a **monolithic application**. The single Express.js server is responsible for:

1. Serving the static frontend assets (HTML, CSS, JavaScript).
2. Providing a RESTful API for the frontend to consume.

The frontend operates like a Single-Page Application (SPA), where `index.html` is the main entry point and JavaScript dynamically renders content without full page reloads.

## 4\. Backend Details

### Database

The `config/conn.js` file manages the MySQL connection pool and exports asynchronous functions for all database operations. This centralizes data logic and makes it reusable across the application.

### Security \& Anti-Spam Measures

To prevent bot spam and duplicate actions (like multiple likes from the same user), a multi-layered approach is used:

1. **IP Address Tracking:** The application correctly identifies the client's IP address, even when behind a proxy like Cloudflare, by checking `cf-connecting-ip` and `x-forwarded-for` headers.
2. **Device ID Tracking:** A unique `uuid` is generated for each new user and stored in a long-term cookie (`device\_id`). This ID is used alongside the IP address to verify actions like liking a post.
3. **Rate Limiting:** The `express-rate-limit` middleware is applied to sensitive endpoints to prevent abuse:

   * **Creating Posts:** 2 posts per 5 minutes per IP.
   * **Commenting:** 2 comments per 1 minute per IP.
   * **Liking:** 3 likes per 1 minute per IP.

4. **Data Sanitization:** Before sending data to the client, server-side helper functions (`sanitizeCardData`, `sanitizeCommentData`) remove sensitive information like IP addresses and device IDs from the payload.

### API Endpoints

The frontend communicates with the following backend endpoints. All endpoints are prefixed by the base URL (e.g., `https://www.atlacatl.net`).

| Method | Endpoint                               | Description                                                                                             | Request Body/Params                                                              |
| :----- | :------------------------------------- | :------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------- |
| `GET`  | `/server/get/sorted/:sortType`         | Fetches all cards, sorted by the specified type (`newest`, `oldest`, `likes`, `comments`).                | `sortType` (URL parameter).                                                      |
| `GET`  | `/server/card/:cardId`                 | Fetches a single card and all its associated comments.                                                  | `cardId` (URL parameter).                                                        |
| `POST` | `/`                                    | Creates a new card (post). Subject to rate limiting.                                                    | `{ "cardAuthor": "...", "cardTitle": "...", "cardBody": "..." }`                  |
| `POST` | `/server/comment`                      | Adds a new comment to a card. Subject to rate limiting.                                                 | `{ "cardId": "...", "commentAuthor": "...", "commentBody": "..." }`               |
| `POST` | `/server/like`                         | Likes a card. Uses IP and `device\_id` cookie for verification. Subject to rate limiting.                | `{ "cardId": "..." }`                                                            |
| `POST` | `/server/gemini`                       | Creates a new card with content enhanced by the Gemini AI. Subject to the same rate limit as new cards. | `{ "cardAuthor": "...", "cardTitle": "...", "cardBody": "..." }`                  |

## 5\. Frontend Details

### Core Logic (`dom.js`)

This file is the heart of the frontend. It handles:

* **State Management:** Tracks the current view (`cards` or `comments`), selected card, and loading states.
* **Event Handling:** Manages all user interactions, from button clicks and form submissions to keyboard shortcuts.
* **API Communication:** Contains all `fetch` calls to the backend API.
* **DOM Rendering:** Dynamically generates and updates HTML for cards, comments, and modals.

### Styling Philosophy

The UI is intentionally simple and functional. The custom CSS in `style.css` establishes a unique color palette and layout reminiscent of early internet forums, while `desktop.css` and `mobile.css` ensure the interface is usable across different screen sizes.

## 6\. Running the Project

To set up and run the project locally, follow these steps:

1. **Install Dependencies:**

&nbsp;   ```bash
    npm install
    ```

2. **Set Up Environment:**

   * Create a `.env` file in the root directory.
   * Add the necessary environment variables for the database connection and Gemini API key (see `config/conn.js` and `app.js` for details).

3. **Run in Development Mode:**

   * This command uses `nodemon` to automatically restart the server on file changes.

&nbsp;   ```bash
    npm run dev
    ```

4. **Run in Production Mode:**

&nbsp;   ```bash
    npm start
    ```

The application will be available at `http://localhost:3000`.

