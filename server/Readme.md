# Rehla Todo Backend

This is the Express.js backend for the Rehla Todo application with PostgreSQL database using Sequelize ORM.

## Features

- RESTful API for managing Rehla Todo
- JWT authentication with access and refresh tokens
- User-specific data and operations
- PostgreSQL database with Sequelize ORM
- Support for columns, cards, tags, and activity logs
- Drag and drop functionality for cards and columns
- History tracking for all card movements

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL database

## Setup Instructions

1. Clone the repository
   ```
   git clone <repository-url>
   cd rehlatodo-backend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your PostgreSQL database credentials

4. Create the PostgreSQL database
   ```
   psql -U postgres
   CREATE DATABASE todo;
   \q
   ```

5. Initialize the database schema and default data
   ```
   node .\database\init.js
   ```

6. Start the server
   ```
   node server.js
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user (email, password, name)
- `POST /api/auth/login` - Login and get JWT tokens (email, password)
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout and invalidate tokens
- `GET /api/auth/me` - Get current user information

### Columns (Protected - requires JWT)

- `GET /api/columns` - Get all columns with their cards
- `GET /api/columns/:id` - Get a specific column with its cards
- `POST /api/columns` - Create a new column
- `PUT /api/columns/:id` - Update a column
- `DELETE /api/columns/:id` - Delete a column

### Cards (Protected - requires JWT)

- `GET /api/cards` - Get all cards
- `GET /api/cards/:id` - Get a specific card
- `POST /api/cards` - Create a new card
- `PUT /api/cards/:id` - Update a card (move between columns, reorder, etc.)
- `DELETE /api/cards/:id` - Delete a card

### Tags (Protected - requires JWT)

- `GET /api/tags` - Get all tags
- `GET /api/tags/:id` - Get a specific tag
- `POST /api/tags` - Create a new tag
- `PUT /api/tags/:id` - Update a tag
- `DELETE /api/tags/:id` - Delete a tag
- `GET /api/tags/:id/cards` - Get all cards with a specific tag

### Logs (Protected - requires JWT)

- `GET /api/logs` - Get all logs grouped by date
- `GET /api/logs/date/:date` - Get logs for a specific date
- `GET /api/logs/card/:cardId` - Get logs for a specific card
- `GET /api/logs/summary` - Get a summary of recent logs
- `GET /api/logs/readable` - Get human-readable descriptions of logs

## Project Structure

```
rehlatod-backend/
├── database/               # Database configuration and initialization
│   ├── config.js           # Sequelize configuration
│   └── init.js             # Database initialization script
├── middleware/             # Express middleware
│   └── auth.js             # JWT authentication middleware
├── models/                 # Sequelize models
│   ├── User.js             # User model
│   ├── Column.js           # Column model
│   ├── Card.js             # Card model
│   ├── Tag.js              # Tag model
│   ├── Log.js              # Log model
│   ├── RefreshToken.js     # Refresh token model
│   └── index.js            # Model associations
├── routes/                 # API routes
│   ├── auth.js             # Authentication routes
│   ├── cards.js            # Card routes
│   ├── columns.js          # Column routes
│   ├── tags.js             # Tag routes
│   └── logs.js             # Log routes
├── .env.example            # Example environment variables
├── package.json            # Project dependencies
├── server.js               # Entry point
└── README.md               # Project documentation
```

## Data Models

### User

```javascript
{
  id: number,         // Primary key
  email: string,      // Unique, required, email format
  password: string,   // Hashed with bcrypt, required
  name: string,       // Optional
  created_at: Date,   // Automatically managed
  updated_at: Date    // Automatically managed
}
```

### Column

```javascript
{
  id: number,         // Primary key
  name: string,       // Required
  position: number,   // Required, for ordering
  userId: number      // Foreign key to User, nullable
}
```

### Card

```javascript
{
  id: number,         // Primary key
  title: string,      // Required
  description: string, // Optional
  columnId: number,   // Foreign key to Column, required
  position: number,   // Required, for ordering within column
  tagId: number,      // Foreign key to Tag, nullable
  userId: number,     // Foreign key to User, nullable
  created_at: Date    // Automatically managed
}
```

### Tag

```javascript
{
  id: number,         // Primary key
  name: string,       // Required
  color: string,      // Required, CSS color value
  userId: number      // Foreign key to User, nullable
}
```

### Log

```javascript
{
  id: number,         // Primary key
  cardId: number,     // Foreign key to Card, nullable
  cardTitle: string,  // Required
  actionType: string, // Required: 'created', 'updated', 'deleted', etc.
  fromColumn: string, // Nullable, for moves
  toColumn: string,   // Nullable, for moves
  fromPosition: number, // Nullable, for reordering
  toPosition: number, // Nullable, for reordering
  userId: number,     // Foreign key to User, nullable
  created_at: Date    // Automatically managed
}
```

### RefreshToken

```javascript
{
  id: number,         // Primary key
  userId: number,     // Foreign key to User, required
  token: string,      // Required, unique
  expiresAt: Date,    // Required
  created_at: Date    // Automatically managed
}
```