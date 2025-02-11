# Gym Registration API

This project is a simple Node.js application demonstrating a basic Gym Registration API. The API is documented using an OpenAPI (Swagger) specification in YAML format. It provides endpoints for creating, retrieving, updating, and deleting user data.

##Features

1. OpenAPI Specification

Includes a YAML file (openapi.yaml) that defines all the available endpoints, request/response formats, authentication methods, and more.

2. Swagger UI

The server hosts a user-friendly UI for exploring and testing the endpoints directly from the browser.

3. JWT-based Authentication


POST /sessions to log in (get a token).
DELETE /sessions to log out (token is revoked).
GET /sessions to check if a session is valid.
4. In-Memory Storage

Trainees (users of the gym system)
Workouts (the available workout types)
Routines (schedules/availability for trainees)
Registrations (booking a slot in a workout)
5. CRUD Operations

Demonstrates basic create, read, update, and delete endpoints for each resource.

## Prerequisites
Node.js (v12 or newer recommended)
npm (Node Package Manager)

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

You can view the full API documentation at http://localhost:3000/api-docs. 
