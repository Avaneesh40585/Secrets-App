# Secrets App 🗝️

An anonymous secret-sharing app I built with Node.js, Express, Passport.js, PostgreSQL, and EJS. It handles local and Google OAuth login, lets users submit secrets anonymously, and displays them in a rotating carousel. Uses bcrypt for password hashing, connection pooling for the database, and Material Design-inspired UI.

## Table of Contents

- [Features](#features)
- [Visual Demo](#visual-demo)
- [Folder Structure](#folder-structure)
- [How It Works](#how-it-works)
- [Dependencies](#dependencies)
- [Installation & Usage](#installation--usage)
- [Database Configuration](#database-configuration)
- [API Endpoints](#api-endpoints)
- [Customization & Extensions](#customization--extensions)
- [Contributing](#contributing)

---

## Features

- **Authentication:** Email/password and Google OAuth2
- **Anonymous sharing:** Submit and update secrets without exposing identity
- **Secrets feed:** Carousel showing all submitted secrets
- **Security:** Hashed passwords, sessions, and SQL injection-safe queries
- **UI:** Responsive, Material Design-style layout
- **Performance:** PostgreSQL connection pooling and efficient session usage
- **Validation:** Server-side input checks with error messages
- **Responsive:** Works on desktop and mobile

---

## Visual Demo

![Secrets-App Demo](https://github.com/user-attachments/assets/9ce2006c-67e5-4112-bc3e-410a51f6fbd9)

---

## Folder Structure

```
secrets-app/
├── index.js               # Main server file with routes & auth
├── package.json           # Dependencies & scripts
├── .env                   # Environment variables (gitignored)
├── views/
│   ├── home.ejs           # Landing page
│   ├── login.ejs          # Login form
│   ├── register.ejs       # Registration form
│   ├── secrets.ejs        # Rotating secrets carousel
│   ├── submit.ejs         # Secret submission form
│   └── partials/
│       ├── header.ejs     # Navigation header
│       └── footer.ejs     # Footer with attribution
└── public/
    └── css/
        └── styles.css     # Material Design-inspired styling
```

---

## How It Works

### 1. **Authentication Flow**

- Users can register with email/password or sign in with Google OAuth2
- Passwords are hashed using bcrypt with salt rounds
- Sessions store only user ID for security and efficiency
- Passport.js handles authentication strategies

### 2. **Secret Management**

- Users must be authenticated to view or submit secrets
- Each user can have one secret that can be updated
- Secrets are stored anonymously in PostgreSQL
- Submit form shows user's current secret for easy editing

### 3. **Community Carousel**

- Displays all submitted secrets in random order
- Auto-rotates every 5 seconds with smooth transitions
- Manual navigation with previous/next buttons
- Keyboard navigation support (arrow keys)
- Mobile-responsive controls

### 4. **Security & Performance**

- Connection pooling with `pg.Pool` for database efficiency
- Parameterized queries prevent SQL injection
- Session management with secure cookies
- Input validation and error handling
- Graceful shutdown with proper cleanup

---

## Dependencies

**Core Dependencies:**

- `express` - Web framework
- `ejs` - Templating engine
- `pg` - PostgreSQL client with connection pooling
- `bcrypt` - Password hashing
- `passport` - Authentication middleware
- `passport-local` - Local authentication strategy
- `passport-google-oauth2` - Google OAuth2 strategy
- `express-session` - Session management
- `cookie-parser` - Cookie parsing middleware
- `dotenv` - Environment variable management

**Development:**

- `nodemon` - Development server with auto-restart

---

## Installation & Usage

### Prerequisites

- Node.js v16 or higher
- PostgreSQL v12 or higher
- Google OAuth2 credentials (for Google sign-in)
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/Avaneesh40585/Secrets-App.git
cd Secrets-App
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment configuration**

- Required environment variables:
  | Variable | Description | Example |
  |----------|-------------|---------|
  | `PG_USER` | PostgreSQL username | `postgres` |
  | `PG_HOST` | Database host | `localhost` |
  | `PG_DATABASE` | Database name | `secrets` |
  | `PG_PASSWORD` | Database password | `mypassword` |
  | `PG_PORT` | PostgreSQL port | `5432` |
  | `GOOGLE_CLIENT_ID` | OAuth2 client ID | `your-client-id.googleusercontent.com` |
  | `GOOGLE_CLIENT_SECRET` | OAuth2 client secret | `your-client-secret` |
  | `SESSION_SECRET` | Session encryption key | `very-long-random-string` |
  | `PORT` | Application port | `3000` |

- Create a `.env` file in the root directory:

```env
PG_USER=your_database_user
PG_HOST=localhost
PG_DATABASE=secrets
PG_PASSWORD=your_database_password
PG_PORT=5432

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

SESSION_SECRET=your_very_long_random_session_secret
PORT=3000
```

4. **Database setup**

```bash
# Create the Database first if not created already
createdb -U postgres todo-list
# Then connect to PostgreSQL and run the queries.sql file
psql -U postgres -d todo-list -f queries.sql
```

5. **Google OAuth Setup**

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing
- Enable Google+ API
- Create OAuth2 credentials
- Add `http://localhost:3000/auth/google/secrets` as authorized redirect URI

6. **Start the application**

```bash
nodemon index.js
```

7. **Access the app**

Open `http://localhost:3000` in your browser

---

## Database Configuration

The application uses a single PostgreSQL table:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255),                 -- NULL for OAuth users
  secret TEXT,                           -- User's submitted secret
  provider VARCHAR(32) DEFAULT 'local'   -- 'local' or 'google'
);
```

**Key Features:**

- Auto-incrementing ID as primary key
- Unique email constraint
- Flexible password field (NULL for OAuth users)
- Provider field to distinguish authentication methods
- Text field for secrets with no length limit

---

## API Endpoints

### Public Routes

| Method | Endpoint    | Description                                 |
| ------ | ----------- | ------------------------------------------- |
| `GET`  | `/`         | Home page with registration/login options   |
| `GET`  | `/login`    | Login form                                  |
| `GET`  | `/register` | Registration form                           |
| `POST` | `/login`    | Authenticate user (redirects to `/secrets`) |
| `POST` | `/register` | Create new user account                     |

### OAuth Routes

| Method | Endpoint               | Description                 |
| ------ | ---------------------- | --------------------------- |
| `GET`  | `/auth/google`         | Initiate Google OAuth2 flow |
| `GET`  | `/auth/google/secrets` | OAuth2 callback URL         |

### Protected Routes (Authentication Required)

| Method | Endpoint   | Description                                   |
| ------ | ---------- | --------------------------------------------- |
| `GET`  | `/secrets` | View rotating carousel of all secrets         |
| `GET`  | `/submit`  | Secret submission form (shows current secret) |
| `POST` | `/submit`  | Create or update user's secret                |
| `GET`  | `/logout`  | Logout and destroy session                    |

---

## Customization & Extensions

- Add **email verification** during signup to confirm user accounts.
- Implement **password reset** via email tokens for account recovery.
- Introduce **categories and filters** so users can browse secrets by topic.
- Add a **like/reaction system** to let users interact with secrets anonymously.
- Build an **admin dashboard** for moderating flagged or inappropriate content.
- Apply **rate limiting** to prevent spam and abuse.
- Include a **dark mode toggle** for better user experience.
- Add **export functionality** so users can download their own secrets.
- Implement a **notification system** to alert users

---

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**

```bash
git fork https://github.com/yourusername/secrets-app.git
```

2. **Create a feature branch**

```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**

- Follow existing code style and conventions
- Add comments for complex logic
- Test your changes thoroughly

4. **Commit your changes**

```bash
git commit -m "Add amazing feature: description of what it does"
```

5. **Push to your fork**

```bash
git push origin feature/amazing-feature
```

6. **Open a Pull Request**

- Provide a clear description of changes
- Include screenshots if UI changes are involved
- Reference any related issues

### **Bug Reports**

- Use GitHub Issues with the "bug" label
- Include steps to reproduce, expected vs actual behavior
- Provide environment details (OS, Node version, etc.)

### **Feature Requests**

- Use GitHub Issues with the "enhancement" label
- Describe the use case and proposed solution
- Consider backward compatibility

---

**Start sharing secrets anonymously today!**
