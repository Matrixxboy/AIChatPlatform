# Frontend Documentation

## 1. Executive Overview

**Biz-Translate** is an enterprise real-time multilingual communication platform built with **React 19**, **Vite**, and **Tailwind CSS**. It enables cross-lingual real-time text chats, voice dictation (speech-to-text), media/document sharing, group conversations, PWA push notifications, and full administrative oversight with user management and analytics.

### Key Capabilities:
- **Real-Time Translation**: Real-time message translation across 15+ global languages powered by backend neural translation models with domain customization.
- **Direct & Group Chats**: 1-on-1 direct messaging and multi-user group chat rooms with member management.
- **Voice-to-Text Dictation**: In-browser speech recognition using the Web Speech API tailored to the user's selected language.
- **File & Media Sharing**: Upload attachments (documents, images, audio, video) up to 10MB with preview and cancellation capability.
- **PWA & Web Push Notifications**: Service worker integration for browser push notifications on incoming messages.
- **Enterprise Admin Console**: User lifecycle management (block/unblock, password reset, role assignment, soft delete, bulk operations), contact inquiry review, metrics, and CSV export.
- **Subpath Deployment Ready**: Configured for deployment under the `/ai-chat-platform` URL prefix with dynamic base path resolution for HTTP and WebSocket connections.

---

## 2. Technology Stack & Dependencies

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | [React](https://react.dev/) | `^19.2.5` | Component-based UI library |
| **Build Tool** | [Vite](https://vitejs.dev/) | `^8.0.10` | Fast dev server and optimized production bundler |
| **Routing** | [React Router DOM](https://reactrouter.com/) | `^7.15.0` | Client-side routing with `basename` routing support |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `^3.4.1` | Utility-first CSS framework with custom design tokens |
| **Real-Time** | [Socket.IO Client](https://socket.io/) | `^4.8.3` | Low-latency bi-directional WebSocket communication |
| **HTTP Client** | [Axios](https://axios-http.com/) | `^1.16.0` | HTTP requests with request/response token interceptors |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | `^12.38.0` | Smooth UI transitions, drawer animations, and modals |
| **Icons** | [Lucide React](https://lucide.dev/) | `^1.14.0` | Modern SVG iconography |
| **Flag Icons** | [flag-icons](https://github.com/lipis/flag-icons) | `^7.5.0` | Country flag iconography for language display |

---

## 3. Project Directory Structure

```
client/
├── public/                     # Static assets and Service Worker
│   ├── LOGO.jpg                # Platform branding logo
│   ├── biz-insightslogo1.png   # Small logo icon
│   ├── logo192.png             # PWA icon (192x192)
│   ├── logo512.png             # PWA icon (512x512)
│   ├── manifest.json           # Web App Manifest
│   └── sw.js                   # Service Worker for Web Push Notifications
│
├── src/
│   ├── assets/                 # Component assets
│   │   ├── chat-bg.png         # Chat background doodle texture
│   │   └── react.svg
│   │
│   ├── components/             # Reusable UI & Modal components
│   │   ├── AddGroupMemberModal.jsx   # Modal to add members to existing group
│   │   ├── AdminComponents.jsx       # Admin UI helpers (Tooltip, ConfirmDialog, Toaster, StatusBadge)
│   │   ├── GroupCreateModal.jsx      # Modal to create a new group conversation
│   │   │
│   │   ├── Admin/              # Modularized Admin dashboard views
│   │   │   ├── AdminContacts.jsx     # Contact inquiries table & details
│   │   │   ├── AdminNavbar.jsx       # Fixed admin top bar
│   │   │   ├── AdminOverview.jsx     # Overview statistics & growth charts
│   │   │   ├── AdminSidebar.jsx      # Admin navigation sidebar
│   │   │   └── AdminUsers.jsx        # User directory table, filters & actions
│   │   │
│   │   └── Landing/            # Modularized Landing page sections
│   │       ├── CTA.jsx               # Call to action section
│   │       ├── ContactUs.jsx         # Contact form section
│   │       ├── Features.jsx          # Feature highlights
│   │       ├── Footer.jsx            # Footer navigation
│   │       ├── Hero.jsx              # Hero banner with dynamic typing simulator
│   │       ├── HowItWorks.jsx        # Step-by-step product walkthrough
│   │       ├── LanguagesOrbit.jsx    # Supported languages visual orbit
│   │       ├── Navbar.jsx            # Landing navigation bar
│   │       ├── PlatformShowcase.jsx  # Interactive UI showcase
│   │       ├── ProblemSection.jsx    # Problem statement
│   │       ├── Problems.jsx          # Business friction points
│   │       ├── Stats.jsx             # Key metrics counter
│   │       ├── Testimonials.jsx      # Social proof & user quotes
│   │       ├── UseCases.jsx          # Industry use cases
│   │       └── WhyLoveIt.jsx         # Product value proposition
│   │
│   ├── libs/                   # Utility libraries
│   │   └── util.js             # Date/time formatting helpers (formatLastMessageTime)
│   │
│   ├── pages/                  # Top-level Page Views
│   │   ├── AdminDashboard.jsx  # Master Admin Portal orchestration
│   │   ├── ChatRoom.jsx        # WhatsApp-style active chat room & translation engine
│   │   ├── Dashboard.jsx       # WhatsApp-style sidebar & session list
│   │   ├── LandingPage.jsx     # Marketing landing page
│   │   └── Login.jsx           # Sign In & Registration portal
│   │
│   ├── api.js                  # Axios client configured with JWT auto-refresh interceptors
│   ├── App.css                 # Base application styles
│   ├── App.jsx                 # Root Router, Auth state, Socket init, Push teardown
│   ├── index.css               # Tailwind CSS imports & global design utilities
│   └── main.jsx                # React root mount & Service Worker registration
│
├── .env.development            # Development environment configuration
├── .env.production             # Production environment configuration
├── .env_example                # Template for environment variables
├── eslint.config.js            # ESLint rules configuration
├── index.html                  # HTML entry point with meta tags and fonts
├── package.json                # Project dependencies and npm scripts
├── postcss.config.js           # PostCSS configuration
├── tailwind.config.js          # Tailwind theme tokens, typography, and animations
└── vite.config.js              # Vite bundler configuration (base: '/ai-chat-platform')
```

---

## 4. Environment & Subpath Configuration

### Environment Variables
Environment configurations are managed via Vite's `import.meta.env`:

```env
# Backend Base API Endpoint
VITE_API_URL=https://developmentapi.biz-insights.com/ai-chat-platform
# Local Development Alternative:
# VITE_API_URL=http://localhost:8000
```

### Subpath & Prefix Handling
The application is designed to be hosted under `/ai-chat-platform` (e.g. `https://domain.com/ai-chat-platform`).

1. **Vite Base Path** (`vite.config.js`):
   ```javascript
   export default defineConfig({
     plugins: [react()],
     base: "/ai-chat-platform"
   });
   ```
2. **React Router Basename** (`src/App.jsx`):
   ```jsx
   <Router basename="/ai-chat-platform">
     <Routes>...</Routes>
   </Router>
   ```
3. **Axios URL Normalization** (`src/api.js`):
   Automatically prevents double slash issues and joins relative endpoints to `VITE_API_URL`.
4. **Socket.IO Path Adaptation** (`src/App.jsx`):
   Dynamically splits out `/ai-chat-platform/socket.io` for reverse proxies when `VITE_API_URL` contains a subpath prefix.

---

## 5. Authentication, Token Rotation & Routing

### Authentication Flow
1. **Login / Register** (`src/pages/Login.jsx`):
   - Requests `POST /api/auth/login` or `POST /api/auth/register`.
   - On success, stores:
     - `token`: Short-lived JWT Access Token
     - `refreshToken`: Long-lived Refresh Token
     - `user`: Serialized User Object (`{ id, name, username, role, preferredLanguage, profileImage, ... }`)
2. **Axios Interceptors & Silent Token Refresh** (`src/api.js`):
   - **Request**: Injects `Authorization: Bearer <token>` automatically.
   - **Response**: On HTTP `401 Unauthorized`, captures the failed request, invokes `POST /api/auth/refresh` using `refreshToken`, stores the new access token, and transparently retries the original request.
   - If the refresh token is also expired or invalid, it triggers a custom `window.dispatchEvent(new Event("force-logout"))` to clean up state and redirect to `/login`.
3. **Logout & Push Teardown** (`src/App.jsx`):
   - Unsubscribes browser push subscription from the backend via `POST /api/users/push-subscription/unsubscribe`.
   - Unsubscribes local `registration.pushManager.getSubscription()`.
   - Closes the active Socket.IO connection.
   - Clears `localStorage` keys (`user`, `token`, `refreshToken`).

### Route Hierarchy
| Route Path | Allowed Roles | Component | Description |
| :--- | :--- | :--- | :--- |
| `/` | Public | `LandingPage.jsx` | Marketing page with live translation simulation |
| `/login` | Public (Redirects if auth) | `Login.jsx` | Authentication screen |
| `/dashboard` | `user` | `Dashboard.jsx` | Chat sidebar, direct messages, groups, profile settings |
| `/chat/:sessionId` | `user` | `ChatRoom.jsx` | Active conversation view, translation, media, speech |
| `/admin/dashboard` | `admin` | `AdminDashboard.jsx` | Admin overview metrics & growth analytics |
| `/admin/users` | `admin` | `AdminDashboard.jsx` | User directory, filtering, CRUD & bulk actions |
| `/admin/contacts` | `admin` | `AdminDashboard.jsx` | Inquiries submitted via landing page |

---

## 6. Core Modules & Implementation Details

### A. Real-Time WebSocket Messaging (`src/pages/ChatRoom.jsx`)

Socket communication is initiated once per authenticated session in `App.jsx` and passed down to child components.

#### Emitted Events:
- `join_session(sessionId)`: Joins the room for the active chat.
- `join_user_room({ userId })`: Joins personal user room for global updates and notifications.
- `send_message(payload)`: Dispatches a new message with metadata (`sessionId`, `userId`, `text`, `fromLang`, `domain`, `messageType`, `fileUrl`, `fileName`, `fileSize`, `replyTo`).
- `typing({ sessionId, userId })` & `stop_typing({ sessionId, userId })`: Typing indicator triggers with a 2-second debounce timer.
- `mark_seen({ messageId, sessionId, userId })`: Marks an incoming message as read.

#### Received Events:
- `receive_message`: Replaces optimistic local messages or appends new messages; auto-emits `mark_seen`.
- `user_typing`: Toggles typing status for the peer participant.
- `message_status_update`: Updates message delivery status (`sent`, `delivered`, `seen`).
- `session_messages_seen`: Updates all own messages in session to `seen` (double blue check).
- `session_update`: Updates sidebar session previews and moves the updated conversation to the top.

### B. Multilingual Neural Translation Engine
- **Per-User Language Preference**: Each user configures a preferred display language (`user.preferredLanguage` or `pref_myLang`).
- **Real-Time Translation**: Incoming and outgoing messages are dynamically translated by the backend AI services.
- **Batch History Translation (`translate-all`)**:
  - When changing languages in an active room, users are prompted via a modal (`isTranslationModalOpen`).
  - Triggers `POST /api/sessions/:sessionId/translate-all` with `{ toLang, domain }`.
  - Re-fetches the conversation history so the UI displays all past messages in the newly chosen target language.
- **Domain Specialization**: Supports selecting specialized translation domains (e.g. `general`, `medical`, `legal`, `financial`, `technical`).

### C. Voice Dictation (Speech-to-Text)
- Utilizes the browser's native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
- Dynamically maps selected languages to standard BCP-47 locale tags (e.g., `Gujarati -> gu-IN`, `Hindi -> hi-IN`, `Spanish -> es-ES`).
- Requires an **HTTPS** context or `localhost` (`window.isSecureContext`).

### D. File Attachments & Media Handling
- **File Types**: Auto-detects PDFs, Images, Audio, Video, and generic files with custom icons.
- **Validation**: Strict client-side check enforcing max **10MB** limit before upload.
- **Upload Flow**:
  1. `POST /api/upload` (multipart/form-data) returns `{ url, stored_filename, size }`.
  2. Sets `attachedFile` state ready to send with text or caption.
  3. **Cancellation Mechanism**: If the user cancels the upload before sending, client invokes `DELETE /api/upload/:stored_filename` to clean up server storage.

### E. Group Chat Management
- **Group Creation Modal** (`src/components/GroupCreateModal.jsx`): Search and multi-select contacts, set group name, invokes `POST /api/sessions` with `{ isGroup: true, groupName, participantIds }`.
- **Add Group Members Modal** (`src/components/AddGroupMemberModal.jsx`): Filtered directory listing showing only users not yet in the group.
- **Admin Rights**: Only group admins can add new participants or manage the group.

### F. PWA & Web Push Notifications (`public/sw.js`)
- **Service Worker Lifecycle**:
  - `main.jsx` registers `/ai-chat-platform/sw.js` on window load.
  - `Dashboard.jsx` handles permission requests (`Notification.requestPermission()`).
  - Fetches backend VAPID key via `GET /api/users/vapid-public-key`.
  - Converts VAPID key from Base64 to `Uint8Array` using `urlBase64ToUint8Array()`.
  - Subscribes via `registration.pushManager.subscribe()` and sends the subscription payload to `POST /api/users/push-subscription`.
- **Push Event Handling**:
  - Displays rich notifications with sender name, preview message, and app icon.
  - `notificationclick` event focuses existing tabs or opens a new window directing straight to the chat session URL.

### G. Admin Management Portal (`src/pages/AdminDashboard.jsx`)
- **Overview & Analytics** (`src/components/Admin/AdminOverview.jsx`): Displays total users, active users, blocked accounts, total sessions, messages, and contact queries.
- **User Directory & Actions** (`src/components/Admin/AdminUsers.jsx`):
  - Pagination, search by name/username, filtering by role, status (active/blocked), and preferred language.
  - User creation (`POST /api/admin/users`).
  - Profile edits (`PATCH /api/admin/users/:id`).
  - Password reset (`POST /api/admin/users/:id/reset-password`).
  - Block with reason / Unblock (`PATCH /api/admin/users/:id/block` and `unblock`).
  - Role promotion/demotion (`admin` <-> `user`).
  - Soft delete (`DELETE /api/admin/users/:id`).
  - Bulk actions (bulk block, bulk unblock, bulk delete).
  - CSV User Export (`GET /api/admin/export/users`).
- **Contact Inquiries** (`src/components/Admin/AdminContacts.jsx`): Paginated list of messages submitted from the public landing page.

---

## 7. State Management & Storage Optimization

### Local Storage Schema
| Key | Type | Description |
| :--- | :--- | :--- |
| `token` | `string` | Current JWT Access Token |
| `refreshToken` | `string` | Current JWT Refresh Token |
| `user` | `JSON string` | Serialized user profile |
| `pref_myLang` | `string` | Selected language name |
| `cached_sessions` | `JSON string` | Cached list of recent chat conversations |
| `cached_messages_<sessionId>` | `JSON string` | Cached message history per conversation |

### LocalStorage Quota Management
To prevent `QuotaExceededError` on heavy chat histories containing Base64 profile images or attachment metadata, `ChatRoom.jsx` uses an eviction algorithm:
```javascript
const safeLocalStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
      // Evict older cached message keys to free space
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cached_messages_") && k !== key) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      try {
        localStorage.setItem(key, value);
      } catch (_) {
        // Skip gracefully; in-memory React state continues to work
      }
    }
  }
};
```

---

## 8. Development & Deployment Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **npm**: `v9.0.0` or higher

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd client

# Install dependencies
npm install
```

### Available Scripts
```bash
# Start local development server with network host exposed (0.0.0.0:5173)
npm run dev

# Run ESLint to check for code style issues
npm run lint

# Build the production bundle into /dist
npm run build

# Preview the production build locally
npm run preview
```
