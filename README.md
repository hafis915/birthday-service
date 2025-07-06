# Birthday Reminder API

A modular REST API built with MongoDB, Express, TypeScript, and Mongoose, with Jest for testing and node-cron for scheduled birthday reminder tasks. This API helps manage users and sends birthday reminders.

## Tech Stack

- **MongoDB**: NoSQL database
- **Express**: Web framework for Node.js
- **TypeScript**: Typed JavaScript
- **Mongoose**: MongoDB object modeling
- **Jest**: Testing framework
- **node-cron**: Task scheduler for birthday reminders
- **Docker**: Containerization for consistent development and deployment

## Project Structure

```
├── src/
│   ├── config/         # Configuration files
│   ├── models/         # Mongoose models
│   ├── controllers/    # Route controllers
│   ├── handlers/       # Error handlers
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── jobs/           # Cron jobs
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── tests/              # Test files
│   ├── models/         # Model tests
│   ├── controllers/    # Controller tests
│   └── routes/         # Route tests
├── .env                # Environment variables
├── .env.example        # Example environment variables
├── jest.config.ts      # Jest configuration
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration.

### Running the Application

#### Development mode:
```bash
npm run dev
```

#### Production mode:
```bash
npm run build
npm start
```

### Testing
```bash
npm test
```

Run tests with coverage report:
```bash
npm test -- --coverage
```

The test suite includes comprehensive coverage for:
- User model validation
- User controller functionality
- Birthday reminder services with edge case handling
- Error handling

## API Endpoints

### User Routes
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `GET /api/users/:id` - Get a user by ID
- `PATCH /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

## Cron Jobs

- Daily cleanup job: Runs every day at midnight
- Hourly job: Runs every hour

## Docker Setup

This project includes Docker configuration for easy development and deployment.

### Prerequisites

- Docker
- Docker Compose

## Running with Docker

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Starting the Application

1. Build and start the containers:

```bash
docker compose up -d
```

This command will:
- Build the Node.js application using the Dockerfile
- Start the MongoDB container
- Start the application container
- Connect them via a Docker network

2. After running the command:
   - The API will be available at http://localhost:3000/api
   - MongoDB will be available at mongodb://localhost:27018 (mapped to port 27018 to avoid conflicts)

### Checking Status and Logs

- Check container status:
  ```bash
  docker compose ps
  ```

- View logs:
  ```bash
  # All services
  docker compose logs

  # Follow logs (continuous output)
  docker compose logs -f
  
  # Just the API
  docker compose logs birthday-reminder-api
  
  # Just MongoDB
  docker compose logs birthday-app-mongodb
  ```

### Stopping and Restarting

- Stop the services:
  ```bash
  docker compose down
  ```

- Restart after making changes:
  ```bash
  docker compose down
  docker compose up -d
  ```

- Rebuild the API after code changes:
  ```bash
  docker compose build app
  docker compose up -d app
  ```

- Remove everything including volumes:
  ```bash
  docker compose down -v
  ```

### Accessing MongoDB Shell

You can access the MongoDB shell inside the container with:

```bash
docker exec -it birthday-app-mongodb mongosh
```

### Docker Volumes and Development Mode

- MongoDB data is persisted in a Docker volume (`mongodb-data`)
- The source code is mounted as a volume for development, enabling hot reloads
- Node modules are in a separate volume to avoid overwriting container dependencies

## API Documentation

The API is available at `http://localhost:3000/api` when running.

### Health Check

```
GET /api/health
```

Response:
```json
{
  "status": "success",
  "message": "API is running"
}
```

### User Endpoints

#### Create a User

```
POST /api/users
```

Request Body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "birthDate": "1990-01-15"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "birthDate": "1990-01-15",
      "createdAt": "2025-07-06T12:00:00.000Z",
      "updatedAt": "2025-07-06T12:00:00.000Z"
    }
  }
}
```

#### Get All Users

```
GET /api/users
```

Response:
```json
{
  "status": "success",
  "results": 1,
  "data": {
    "users": [
      {
        "_id": "60d21b4667d0d8992e610c85",
        "name": "John Doe",
        "email": "john@example.com",
        "birthDate": "1990-01-15",
        "createdAt": "2025-07-06T12:00:00.000Z",
        "updatedAt": "2025-07-06T12:00:00.000Z"
      }
    ]
  }
}
```

#### Get User by ID

```
GET /api/users/:id
```

Response:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "John Doe",
      "email": "john@example.com",
      "birthDate": "1990-01-15",
      "createdAt": "2025-07-06T12:00:00.000Z",
      "updatedAt": "2025-07-06T12:00:00.000Z"
    }
  }
}
```

#### Update User

```
PATCH /api/users/:id
```

Request Body:
```json
{
  "name": "John Smith"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "name": "John Smith",
      "email": "john@example.com",
      "birthDate": "1990-01-15",
      "createdAt": "2025-07-06T12:00:00.000Z",
      "updatedAt": "2025-07-06T12:30:00.000Z"
    }
  }
}
```

#### Delete User

```
DELETE /api/users/:id
```

Response:
```json
{
  "status": "success",
  "data": null
}
```

## Design Decisions, Assumptions and Limitations

### Architecture

- **Express.js Framework**: Used for building the RESTful API with TypeScript for type safety.
- **MongoDB**: NoSQL database used for storing user data and birthday information.
- **Containerization**: Docker and Docker Compose for easy deployment and consistent environments.
- **Cron Jobs**: Scheduled jobs for birthday reminders with two main jobs:
  - Daily cleanup job: Runs every day at midnight
  - Hourly job: Checks for upcoming birthdays and sends notifications

### Assumptions

1. **Time Zone Handling**: The system assumes UTC time for all operations. Birthdays are calculated based on UTC dates.
2. **Notification System**: The system is set up to send birthday reminders, but actual notification delivery (email/SMS) would require additional services.
3. **Persistence**: MongoDB data is persisted using Docker volumes.

### Limitations

1. **Scalability**: While the application can be scaled, the current Docker setup is optimized for development rather than production.
2. **Authentication**: The API currently does not implement authentication. In a production environment, JWT or OAuth should be added.
3. **Testing**: The system includes thorough tests for core components (models, controllers, services) with extended test coverage for edge cases in the birthday service. Additional test coverage for routes and database operations would further strengthen the system for production use.

### Future Improvements

1. **User Authentication**: Implement JWT authentication for secure API access.
2. **Email Integration**: Add email service integration for birthday notifications.
3. **API Rate Limiting**: Implement rate limiting to prevent abuse.
4. **Monitoring**: Add health monitoring and alerting systems.
5. **Pagination**: Implement pagination for endpoints returning multiple records.

## Cron Jobs and Birthday Reminder Worker

The application includes a worker that runs scheduled tasks:

### Birthday Reminder Service

The birthday service checks for upcoming birthdays and handles reminder notifications:

- **Hourly Job**: Runs every hour to check for users with upcoming birthdays
- **Daily Cleanup**: Runs at midnight to perform maintenance tasks

The cron jobs are automatically started when the Docker container runs. No additional setup is required.

### How Birthday Reminders Work

1. The system scans the database for users whose birthdays are approaching
2. For each user with an upcoming birthday, a notification is prepared
3. The notification system logs the reminder (actual delivery would require email/SMS integration)

### Monitoring Cron Jobs

You can monitor cron job activity through Docker logs:

```bash
docker logs birthday-reminder-api | grep "Cron"
```
