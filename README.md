# Gym Registration API

This project is a simple Node.js application demonstrating a basic Gym Registration API. The API is documented using an OpenAPI (Swagger) specification in YAML format. It provides endpoints for creating, retrieving, updating, and deleting user data.

## Features

- **Express.js** server for handling REST endpoints
- **Swagger UI** setup for easy API documentation and testing


## Prerequisites

- **Node.js** (v14 or later recommended)
- **npm** (v6 or later)

## Getting Started

1. **Clone** this repository or download the source code.

2. **Install** dependencies:

   ```bash
   
   npm install


3. **Start** the server:

   ```bash  
    npm start

4. **Open** the Swagger UI in your browser:
```bash
   http://localhost:3000/api-docs
```
## How It Works
1. Swagger Documentation:

You can view the full API documentation at http://localhost:3000/api-docs. Swagger UI provides a user-friendly interface to try out endpoints for GET, POST, PUT, and DELETE requests.

2. Endpoints: 

GET /users: Retrieves all users.
POST /users: Creates a new user.
GET /users/{userId}: Retrieves a single user by ID.
PUT /users/{userId}: Updates user details for a given ID.
DELETE /users/{userId}: Deletes a user by ID.

GET /memberships: Retrieves all membership types.
POST /memberships: Creates a new membership type.

GET /sessions: get current session
POST /sessions: create a new session
PUT /sessions: update session
DELETE /sessions: delete session

3. User Model

Defined in the openapi.yaml file under components.schemas.User. It includes:

id: string
name: string
email: string (format: email)
age: integer
membershipType: string (enum: Basic, Premium, VIP)