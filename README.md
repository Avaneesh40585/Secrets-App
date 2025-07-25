# Secrets App 🗝️

A modern anonymous secret-sharing application built with Node.js, Express, Passport.js (local & Google OAuth), PostgreSQL, and EJS. Demonstrates secure authentication, connection pooling, dynamic templating, and a rotating secrets carousel with a Material Design–inspired UI.

## Table of Contents

- [Features](#features)  
- [Demo](#demo)  
- [Folder Structure](#folder-structure)  
- [How It Works](#how-it-works)  
- [Dependencies](#dependencies)  
- [Installation & Usage](#installation--usage)  
- [Database Setup](#database-setup)  
- [Environment Configuration](#environment-configuration)  
- [API Endpoints](#api-endpoints)  
- [Best Practices Implemented](#best-practices-implemented)  
- [Contributing](#contributing)  
- [License](#license)  

## Features

- **🔐 Authentication**: Local (email/password) & Google OAuth2 authentication  
- **📝 Anonymous Sharing**: Submit and update secrets anonymously  
- **🎠 Community Carousel**: Rotating display of all user-submitted secrets with auto-rotation  
- **🔒 Secure**: Password hashing with bcrypt, session management, SQL injection protection  
- **🎨 Modern UI**: Material Design-inspired responsive interface  
- **⚡ Performance**: PostgreSQL connection pooling, efficient session handling  
- **✅ Validation**: Input validation with friendly error messages  
- **📱 Responsive**: Mobile-friendly design with keyboard navigation support  

## Demo

*Add your demo screenshot or GIF here*

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

## Installation & Usage

### Prerequisites

- Node.js v16 or higher
- PostgreSQL v12 or higher
- Google OAuth2 credentials (for Google sign-in)
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/secrets-app.git
cd secrets-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment configuration**

Create a `.env` file in the root directory:
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

Create the database and table:
```sql
CREATE DATABASE secrets;
\c secrets;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255),
  secret TEXT,
  provider VARCHAR(32) DEFAULT 'local'
);
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

## Database Setup

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

## Environment Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `PG_USER` | PostgreSQL username | `postgres` | ✅ |
| `PG_HOST` | Database host | `localhost` | ✅ |
| `PG_DATABASE` | Database name | `secrets` | ✅ |
| `PG_PASSWORD` | Database password | `mypassword` | ✅ |
| `PG_PORT` | PostgreSQL port | `5432` | ✅ |
| `GOOGLE_CLIENT_ID` | OAuth2 client ID | `your-client-id.googleusercontent.com` | ✅ |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret | `your-client-secret` | ✅ |
| `SESSION_SECRET` | Session encryption key | `very-long-random-string` | ✅ |
| `PORT` | Application port | `3000` | ❌ |

## API Endpoints

### Public Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Home page with registration/login options |
| `GET` | `/login` | Login form |
| `GET` | `/register` | Registration form |
| `POST` | `/login` | Authenticate user (redirects to `/secrets`) |
| `POST` | `/register` | Create new user account |

### OAuth Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/google` | Initiate Google OAuth2 flow |
| `GET` | `/auth/google/secrets` | OAuth2 callback URL |

### Protected Routes (Authentication Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/secrets` | View rotating carousel of all secrets |
| `GET` | `/submit` | Secret submission form (shows current secret) |
| `POST` | `/submit` | Create or update user's secret |
| `GET` | `/logout` | Logout and destroy session |

## Best Practices Implemented

### 🔒 **Security**
- **Password Hashing**: bcrypt with configurable salt rounds
- **SQL Injection Prevention**: Parameterized queries throughout
- **Session Security**: Secure session configuration with httpOnly cookies
- **Authentication Separation**: Different strategies for local vs OAuth users
- **Input Validation**: Email format and password length validation

### ⚡ **Performance**
- **Connection Pooling**: pg.Pool for efficient database connections
- **Session Storage**: Store only user ID in sessions, not full objects
- **Graceful Shutdown**: Proper cleanup of database connections
- **Minimal Payload**: Efficient data transfer between server and client

### 🏗️ **Code Quality**
- **Modern JavaScript**: ES6+ syntax with import/export
- **Separation of Concerns**: Clear separation of routes, auth, and data logic
- **Error Handling**: Comprehensive try-catch blocks with user-friendly messages
- **Template Organization**: Reusable EJS partials for DRY code
- **Environment Management**: Secure credential handling with dotenv

### 🎨 **User Experience**
- **Material Design**: Google-inspired clean, modern interface
- **Responsive Design**: Mobile-first approach with proper breakpoints
- **Progressive Enhancement**: Works without JavaScript, enhanced with it
- **Accessibility**: Semantic HTML, keyboard navigation, proper contrast ratios
- **Loading States**: Smooth transitions and visual feedback

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

### 🐛 **Bug Reports**
- Use GitHub Issues with the "bug" label
- Include steps to reproduce, expected vs actual behavior
- Provide environment details (OS, Node version, etc.)

### 💡 **Feature Requests**
- Use GitHub Issues with the "enhancement" label
- Describe the use case and proposed solution
- Consider backward compatibility

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 **What's Next?**

Potential future enhancements:
- Email verification for registration
- Password reset functionality
- Secret categories and filtering
- Like/reaction system for secrets
- Admin dashboard for moderation
- Rate limiting for spam prevention
- Dark mode toggle
- Export secrets functionality

**Start sharing secrets anonymously today! 🤫✨**





