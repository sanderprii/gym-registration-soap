/***************************************************************************
 * server.js
 ***************************************************************************/

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Load the OpenAPI specification
const openapiDocumentEn = yaml.load(path.join(__dirname, 'openapi.yaml'));
const openapiDocumentEt = yaml.load(path.join(__dirname, 'openapi-et.yaml'));
const app = express();
const port = process.env.PORT || 3000;

// For demo purposes only; in production, store secrets in env variables
const JWT_SECRET = 'your-secret-key';

// In-memory data stores
let trainees = [];       // For /trainees
let workouts = [];       // For /workouts
let routines = [];       // For /routines
let registrations = [];  // For /registrations

// Track revoked tokens for logout
const revokedTokens = new Set();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI endpoint
app.use('/en', swaggerUi.serve, swaggerUi.setup(openapiDocumentEn));
app.use('/et', swaggerUi.serve, swaggerUi.setup(openapiDocumentEt));
app.get('/', (req, res) => {
    res.send('Tere tulemast Gym Training Registration API-sse!');
});

// ---------------------------------------------------------------------------
// JWT Authentication Middleware
// ---------------------------------------------------------------------------
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authorization token missing' });
    }

    // Check if token is revoked
    if (revokedTokens.has(token)) {
        return res.status(401).json({ error: 'Token is revoked' });
    }

    // Verify token
    jwt.verify(token, JWT_SECRET, (err, userData) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = userData;
        req.token = token; // store token if needed (e.g., for logout)
        next();
    });
}

// ---------------------------------------------------------------------------
// /sessions endpoints: login, logout, check session
// OpenAPI references:
//   POST /sessions
//   DELETE /sessions
//   GET /sessions
// ---------------------------------------------------------------------------

// Create session (Login)
app.post('/sessions', (req, res) => {
    const { email, password } = req.body;
    const trainee = trainees.find((t) => t.email === email && t.password === password);

    if (!trainee) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT
    // Payload contains user id, name, etc.
    const token = jwt.sign(
        { traineeId: trainee.id, email: trainee.email },
        JWT_SECRET,
        { expiresIn: '2h' }
    );

    res.status(200).json({
        message: 'Login successful',
        token
    });
});

// Destroy session (Logout)
app.delete('/sessions', authenticateToken, (req, res) => {
    // Revoke current token
    revokedTokens.add(req.token);

    // In a production environment, you might periodically remove expired tokens
    // from the revokedTokens set.
    return res.status(200).json({ message: 'Logout successful' });
});

// Check session (Authenticated?)
app.get('/sessions', authenticateToken, (req, res) => {
    // If the token is valid and not revoked, user is authenticated
    const traineeData = trainees.find(t => t.id === req.user.traineeId);

    if (!traineeData) {
        return res.status(404).json({ error: 'Trainee not found' });
    }

    return res.status(200).json({
        authenticated: true,
        trainee: traineeData
    });
});

// ---------------------------------------------------------------------------
// /trainees endpoints
// OpenAPI references:
//   GET /trainees
//   POST /trainees
//   GET /trainees/{traineeId}
//   PATCH /trainees/{traineeId}
//   DELETE /trainees/{traineeId}
// ---------------------------------------------------------------------------

// List all trainees
app.get('/trainees', authenticateToken, (req, res) => {
    // We never return passwords in a real scenario
    const safeTrainees = trainees.map(({ password, ...rest }) => rest);
    res.status(200).json({ data: safeTrainees });
});

// Create a new trainee
app.post('/trainees', (req, res) => {
    const { name, email, password, timezone } = req.body;

    // Basic check if email already used
    if (trainees.some((t) => t.email === email)) {
        return res.status(400).json({ error: 'Email already in use' });
    }

    const newTrainee = {
        id: Date.now().toString(),
        name,
        email,
        password,
        timezone: timezone || null,
        createdAt: new Date().toISOString()
    };

    trainees.push(newTrainee);

    // Return without password
    const { password: _, ...traineeWithoutPass } = newTrainee;
    res.status(201).json(traineeWithoutPass);
});

// Get trainee details
app.get('/trainees/:traineeId', authenticateToken, (req, res) => {
    const { traineeId } = req.params;
    const trainee = trainees.find((t) => t.id === traineeId);

    if (!trainee) {
        return res.status(404).json({ error: 'Trainee not found' });
    }

    // Return a "safe" object without password
    const { password, ...rest } = trainee;
    res.status(200).json(rest);
});

// Partially update a trainee
app.patch('/trainees/:traineeId', authenticateToken, (req, res) => {
    const { traineeId } = req.params;
    const { name, email, password, timezone } = req.body;

    const traineeIndex = trainees.findIndex((t) => t.id === traineeId);
    if (traineeIndex === -1) {
        return res.status(404).json({ error: 'Trainee not found' });
    }

    // Simple partial update
    if (name !== undefined) trainees[traineeIndex].name = name;
    if (email !== undefined) trainees[traineeIndex].email = email;
    if (password !== undefined) trainees[traineeIndex].password = password;
    if (timezone !== undefined) trainees[traineeIndex].timezone = timezone;

    trainees[traineeIndex].updatedAt = new Date().toISOString();

    // Return a "safe" object without password
    const { password: removedPass, ...rest } = trainees[traineeIndex];
    res.status(200).json(rest);
});

// Delete a trainee
app.delete('/trainees/:traineeId', authenticateToken, (req, res) => {
    const { traineeId } = req.params;
    const idx = trainees.findIndex((t) => t.id === traineeId);

    if (idx === -1) {
        return res.status(404).json({ error: 'Trainee not found' });
    }

    trainees.splice(idx, 1);
    res.status(204).send();
});

// ---------------------------------------------------------------------------
// /workouts endpoints
// OpenAPI references:
//   GET /workouts
//   POST /workouts
//   GET /workouts/{workoutId}
//   PATCH /workouts/{workoutId}
//   DELETE /workouts/{workoutId}
// ---------------------------------------------------------------------------

// List all workouts
app.get('/workouts', authenticateToken, (req, res) => {
    res.status(200).json(workouts);
});

// Create a new workout type
app.post('/workouts', authenticateToken, (req, res) => {
    const { name, duration, description, color } = req.body;

    // Basic validation
    if (!name || !duration) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const newWorkout = {
        id: Date.now().toString(),
        name,
        duration,
        description: description || null,
        color: color || null,
        createdAt: new Date().toISOString()
    };

    workouts.push(newWorkout);
    res.status(201).json(newWorkout);
});

// Get workout details
app.get('/workouts/:workoutId', authenticateToken, (req, res) => {
    const { workoutId } = req.params;
    const workout = workouts.find((w) => w.id === workoutId);

    if (!workout) {
        return res.status(404).json({ error: 'Workout not found' });
    }

    res.status(200).json(workout);
});

// Partially update a workout
app.patch('/workouts/:workoutId', authenticateToken, (req, res) => {
    const { workoutId } = req.params;
    const { name, duration, description, color } = req.body;

    const workoutIndex = workouts.findIndex((w) => w.id === workoutId);
    if (workoutIndex === -1) {
        return res.status(404).json({ error: 'Workout not found' });
    }

    if (name !== undefined) workouts[workoutIndex].name = name;
    if (duration !== undefined) workouts[workoutIndex].duration = duration;
    if (description !== undefined) workouts[workoutIndex].description = description;
    if (color !== undefined) workouts[workoutIndex].color = color;
    workouts[workoutIndex].updatedAt = new Date().toISOString();

    res.status(200).json(workouts[workoutIndex]);
});

// Delete a workout
app.delete('/workouts/:workoutId', authenticateToken, (req, res) => {
    const { workoutId } = req.params;
    const index = workouts.findIndex((w) => w.id === workoutId);

    if (index === -1) {
        return res.status(404).json({ error: 'Workout not found' });
    }

    workouts.splice(index, 1);
    res.status(204).send();
});

// ---------------------------------------------------------------------------
// /routines endpoints
// OpenAPI references:
//   GET /routines
//   POST /routines
//   GET /routines/{traineeId}
//   PATCH /routines/{traineeId}
//   DELETE /routines/{traineeId}
// ---------------------------------------------------------------------------

// List all routines
app.get('/routines', authenticateToken, (req, res) => {
    res.status(200).json(routines);
});

// Create a new routine
app.post('/routines', authenticateToken, (req, res) => {
    const { userId, availability } = req.body;

    if (!userId || !availability) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const newRoutine = {
        id: Date.now().toString(),
        userId,
        availability,
        createdAt: new Date().toISOString()
    };

    routines.push(newRoutine);
    res.status(201).json(newRoutine);
});

// Get a specific trainee's routine
app.get('/routines/:traineeId', authenticateToken, (req, res) => {
    const { traineeId } = req.params;
    const routine = routines.find((r) => r.userId === traineeId);

    if (!routine) {
        return res.status(404).json({ error: 'Routine not found' });
    }

    res.status(200).json(routine);
});

// Partially update a trainee's routine
app.patch('/routines/:traineeId', authenticateToken, (req, res) => {
    const { traineeId } = req.params;
    const { availability } = req.body;

    const routineIndex = routines.findIndex((r) => r.userId === traineeId);
    if (routineIndex === -1) {
        return res.status(404).json({ error: 'Routine not found' });
    }

    if (availability !== undefined) {
        routines[routineIndex].availability = availability;
    }
    routines[routineIndex].updatedAt = new Date().toISOString();

    res.status(200).json(routines[routineIndex]);
});

// Delete a routine
app.delete('/routines/:traineeId', authenticateToken, (req, res) => {
    const { traineeId } = req.params;
    const routineIndex = routines.findIndex((r) => r.userId === traineeId);

    if (routineIndex === -1) {
        return res.status(404).json({ error: 'Routine not found' });
    }

    routines.splice(routineIndex, 1);
    res.status(204).send();
});

// ---------------------------------------------------------------------------
// /registrations endpoints
// OpenAPI references:
//   GET /registrations
//   POST /registrations
//   GET /registrations/{registrationId}
//   PATCH /registrations/{registrationId}
//   DELETE /registrations/{registrationId}
// ---------------------------------------------------------------------------

// List all registrations
app.get('/registrations', authenticateToken, (req, res) => {
    res.status(200).json(registrations);
});

// Register for a workout
app.post('/registrations', authenticateToken, (req, res) => {
    const { eventId, userId, inviteeEmail, startTime, endTime, status } = req.body;

    if (!eventId || !userId || !inviteeEmail || !startTime) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const newRegistration = {
        id: Date.now().toString(),
        eventId,
        userId,
        inviteeEmail,
        startTime,
        endTime: endTime || null,
        status: status || 'scheduled',
        createdAt: new Date().toISOString()
    };

    registrations.push(newRegistration);
    res.status(201).json(newRegistration);
});

// Get registration details
app.get('/registrations/:registrationId', authenticateToken, (req, res) => {
    const { registrationId } = req.params;
    const registration = registrations.find((r) => r.id === registrationId);

    if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
    }

    res.status(200).json(registration);
});

// Partially update a registration
app.patch('/registrations/:registrationId', authenticateToken, (req, res) => {
    const { registrationId } = req.params;
    const { eventId, userId, inviteeEmail, startTime, endTime } = req.body;

    const regIndex = registrations.findIndex((r) => r.id === registrationId);
    if (regIndex === -1) {
        return res.status(404).json({ error: 'Registration not found' });
    }

    if (eventId !== undefined) registrations[regIndex].eventId = eventId;
    if (userId !== undefined) registrations[regIndex].userId = userId;
    if (inviteeEmail !== undefined) registrations[regIndex].inviteeEmail = inviteeEmail;
    if (startTime !== undefined) registrations[regIndex].startTime = startTime;
    if (endTime !== undefined) registrations[regIndex].endTime = endTime;
    registrations[regIndex].updatedAt = new Date().toISOString();

    res.status(200).json(registrations[regIndex]);
});

// Delete a registration
app.delete('/registrations/:registrationId', authenticateToken, (req, res) => {
    const { registrationId } = req.params;
    const index = registrations.findIndex((r) => r.id === registrationId);

    if (index === -1) {
        return res.status(404).json({ error: 'Registration not found' });
    }

    registrations.splice(index, 1);
    res.status(204).send();
});

// ---------------------------------------------------------------------------
// Start the Server
// ---------------------------------------------------------------------------
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});
