# Gym Registration API - REST & SOAP

A comprehensive gym registration system providing identical functionality through both REST and SOAP APIs. This project demonstrates functional equivalence between REST and SOAP architectures for the same business logic.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [WSDL Validation](#wsdl-validation)
- [Testing](#testing)
- [Client Examples](#client-examples)
- [Project Structure](#project-structure)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Project Overview

This project provides a complete gym registration management system with:

- **REST API** - Modern HTTP-based interface following RESTful principles
- **SOAP API** - Enterprise-grade web service with full WSDL specification
- **Functional Equivalence** - Both APIs provide identical business functionality
- **Comprehensive Testing** - Automated tests comparing REST and SOAP responses


### Core Entities

- **Trainees** - Gym members with authentication
- **Workouts** - Exercise types with duration and details
- **Routines** - Trainee availability schedules
- **Registrations** - Workout session bookings

## Features

### REST API Features
- JWT-based authentication
- Paginated responses
- Full CRUD operations
- RESTful resource design
- OpenAPI/Swagger documentation

### SOAP API Features
- WSDL-first design
- XML Schema validation
- SOAP Fault error handling
- Document/literal binding
- Full operation coverage

### Common Features
- Identical business logic
- Same database backend
- Equivalent error handling
- Consistent data validation

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                   │
│            (HTML/CSS/JS)                    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│               API Layer                     │
├─────────────────┬───────────────────────────┤
│    REST API     │       SOAP API            │
│   (Port 3000)   │     (Port 3001)           │
├─────────────────┴───────────────────────────┤
│           Business Logic Layer              │
├─────────────────────────────────────────────┤
│            Database Layer                   │
│              (SQLite)                       │
└─────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js** 16.x or higher
- **npm** 6.x or higher
- **curl** (for testing)
- **jq** (for JSON processing in tests)


## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sanderprii/gym-registration-soap
   cd gym-registration-soap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your configuration:
   ```env
   DATABASE_URL="file:./dev.db"
   PORT=3000
   SOAP_PORT=3001
   JWT_SECRET=your_secure_jwt_secret_here
   ```

4. **Initialize database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

## Quick Start

### Option 1: Using the run script
```bash
chmod +x scripts/run.sh
./scripts/run.sh
```

### Option 2: Manual startup
```bash
# Start REST API
npm start &

# Start SOAP service
npm run start:soap &
```

## API Documentation

### REST API
- **Base URL**: `http://localhost:3000`
- **Swagger UI**: `http://localhost:3000/api-docs-en`
- **Estonian**: `http://localhost:3000/api-docs-et`

### SOAP API
- **Endpoint**: `http://localhost:3001/soap`
- **WSDL**: `http://localhost:3001/soap?wsdl`

### Key Endpoints Comparison

| Operation | REST | SOAP |
|-----------|------|------|
| Login | `POST /sessions` | `Login` |
| Get Trainees | `GET /trainees` | `GetTrainees` |
| Create Workout | `POST /workouts` | `CreateWorkout` |
| Update Routine | `PATCH /routines/trainee/{id}` | `UpdateRoutine` |
| Delete Registration | `DELETE /registrations/{id}` | `DeleteRegistration` |

## WSDL Validation

Validate the WSDL file:

```bash
# Check WSDL is accessible
curl -s http://localhost:3001/soap?wsdl

# Validate WSDL format
npm run validate:wsdl

# Test WSDL with external validator
# Visit: https://www.wsdl-analyzer.com/
```

## Testing

### Run All Tests
```bash
# Automated comparison tests
npm test

# Or manually
chmod +x tests/test.sh
./tests/test.sh
```

### Run Client Example
```bash
# Test all SOAP operations
node client/example.js
```

### Test Coverage

1. **Authentication Tests**
   - Login/logout functionality
   - Session validation
   - Token verification

2. **CRUD Operation Tests**
   - Create, read, update, delete for all entities
   - Data consistency between REST and SOAP

3. **Error Handling Tests**
   - Invalid token scenarios
   - Missing required fields
   - Not found errors

4. **Business Logic Tests**
   - Pagination consistency
   - Relationship handling
   - Data validation



### Environment Variables in Docker
Set these in `docker-compose.yml`:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `SOAP_PORT`

## Client Examples



## Project Structure

```
gym-registration-soap-api/
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── scripts/
│   └── run.sh              # Main startup script
├── wsdl/
│   └── gym_registration.wsdl  # WSDL specification
├── src/
│   └── soap_server.js      # SOAP service implementation
├── tests/
│   └── test.sh             # Automated tests
│   └── test.js              # Test scripts
├── server.js               # REST API server
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
└── client/                 # Frontend files
    ├── index.html
    ├── dashboard.html
    ├── css/
    ├── js/
    └── example.js          # SOAP client example
```

## Development

### Development Commands
```bash
# Start both services in development mode
npm run dev:both

# Start services separately
npm run dev        # REST API with nodemon
npm run dev:soap   # SOAP service with nodemon

# Database operations
npm run db:migrate
npm run db:generate
npm run db:studio
npm run db:reset
```



