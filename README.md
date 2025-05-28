# Event Booking System API

A RESTful API for managing event bookings, built with Node.js, Express, and Sequelize.

## 🚀 Implemented Features

### Authentication & Authorization
- JWT-based authentication system
- Role-based access control (Admin and User roles)
- Secure password hashing with bcrypt
- Token refresh mechanism
- Input validation for all auth endpoints

### Event Management
- CRUD operations for events
- Event categorization (conference, workshop, seminar, concert, sports, other)
- Event status tracking (active, cancelled, completed)
- Image URL support for event banners
- Pagination and filtering for event listings
- Search functionality for events

### Booking System
- Ticket booking and management
- Booking status tracking (pending, confirmed, cancelled, refunded)
- Payment status tracking (pending, completed, failed, refunded)
- Unique booking reference generation
- Seat availability management
- Booking history per user

### User Management
- User registration and profile management
- Role-based permissions
- Basic user dashboard
- Profile update functionality

## 🛠️ Tech Stack

- **Backend Framework:** Node.js with Express
- **Database:** MySQL with Sequelize ORM
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** Express Validator
- **Environment Variables:** dotenv
- **API Documentation:** Swagger/OpenAPI
- **Containerization:** Docker

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn package manager
- Docker and Docker Compose (for containerized setup)

## 🔧 Installation

### Option 1: Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/event-booking-system-api.git
   cd event-booking-system-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=event_booking_db
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=24h
   ```

4. Create the database:
   ```bash
   mysql -u your_db_user -p
   CREATE DATABASE event_booking_db;
   ```

5. Run database migrations:
   ```bash
   npx sequelize-cli db:migrate
   ```

6. Start the server:
   ```bash
   npm start
   ```

### Option 2: Docker Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/event-booking-system-api.git
   cd event-booking-system-api
   ```

2. Create a `.env` file (same as above)

3. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

The application will be available at `http://localhost:3000`

## 📚 API Documentation

### Swagger UI
The API documentation is available through Swagger UI at:
```
http://localhost:3000/api-docs
```

The Swagger documentation includes:
- Detailed endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Available query parameters and filters

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/update-profile` - Update user profile
- `PUT /api/auth/change-password` - Change user password
- `POST /api/auth/refresh-token` - Refresh JWT token

### Event Endpoints

- `GET /api/events` - Get all events (with pagination)
- `POST /api/events` - Create a new event (Admin only)
- `GET /api/events/:id` - Get event by ID
- `PUT /api/events/:id` - Update event (Admin only)
- `DELETE /api/events/:id` - Delete event (Admin only)
- `GET /api/events/search` - Search events

### Booking Endpoints

- `POST /api/bookings` - Create a new booking
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `PUT /api/bookings/:id` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking

## 🔐 Role-Based Access Control

### Admin
- Full access to all endpoints
- Can manage all events
- Can view all bookings
- Can manage user roles

### User
- Can view events
- Can make bookings
- Can manage own profile
- Can view own bookings

## 📝 API Request Examples

### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "Password123"
  }'
```

### Create a new event (Admin only)
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tech Conference 2024",
    "description": "Annual technology conference",
    "venue": "Convention Center",
    "eventDate": "2024-06-15T09:00:00Z",
    "totalSeats": 500,
    "ticketPrice": 99.99,
    "category": "conference"
  }'
```

### Create a booking
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "event-uuid",
    "seats": 2,
    "specialRequests": "Vegetarian meal preference"
  }'
```

## 🐳 Docker Configuration

The project includes Docker configuration for easy deployment:

### Dockerfile
```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=event_booking_db
      - MYSQL_USER=appuser
      - MYSQL_PASSWORD=apppassword
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

