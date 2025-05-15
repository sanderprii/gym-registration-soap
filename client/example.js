const soap = require('soap');

const url = 'http://localhost:3001/soap?wsdl';

class GymRegistrationClient {
    constructor() {
        this.client = null;
        this.token = null;
    }

    async connect() {
        this.client = await soap.createClientAsync(url);
        console.log('Connected to SOAP service');
    }

    async createSession(email, password) {
        try {
            const request = { email, password };
            const [result] = await this.client.CreateSessionAsync({ request });
            this.token = result.token;
            console.log('Login successful:', result);
            return result;
        } catch (error) {
            console.error('Login failed:', error.message);
            throw error;
        }
    }

    async deleteSession() {
        try {
            const request = { token: this.token };
            const [result] = await this.client.DeleteSessionAsync({ request });
            console.log('Logout successful:', result);
            this.token = null;
            return result;
        } catch (error) {
            console.error('Logout failed:', error.message);
            throw error;
        }
    }

    async listTrainees(page = 1, pageSize = 5) {
        try {
            const request = { token: this.token, page, pageSize };
            const [result] = await this.client.ListTraineesAsync({ request });
            console.log('Trainees:', result);
            return result;
        } catch (error) {
            console.error('List trainees failed:', error.message);
            throw error;
        }
    }

    async createTrainee(name, email, password, timezone) {
        try {
            const request = { name, email, password, timezone };
            const [result] = await this.client.CreateTraineeAsync({ request });
            console.log('Trainee created:', result);
            return result;
        } catch (error) {
            // Check if error is "Email already in use" and continue
            if (error.body && error.body.includes('Email is already in use')) {
                console.log('Trainee already exists, continuing...');
                return null;
            }
            console.error('Create trainee failed:', error.message);
            throw error;
        }
    }

    async createWorkout(name, duration, description, color) {
        try {
            const request = { token: this.token, name, duration, description, color };
            const [result] = await this.client.CreateWorkoutAsync({ request });
            console.log('Workout created:', result);
            return result;
        } catch (error) {
            console.error('Create workout failed:', error.message);
            throw error;
        }
    }

    async listWorkouts() {
        try {
            const request = { token: this.token };
            const [result] = await this.client.ListWorkoutsAsync({ request });
            console.log('Workouts:', result);
            return result;
        } catch (error) {
            console.error('List workouts failed:', error.message);
            throw error;
        }
    }

    async createRoutine(userId, availability) {
        try {
            const request = { token: this.token, userId, availability };
            const [result] = await this.client.CreateRoutineAsync({ request });
            console.log('Routine created:', result);
            return result;
        } catch (error) {
            console.error('Create routine failed:', error.message);
            throw error;
        }
    }

    async createRegistration(eventId, userId, inviteeEmail, startTime, endTime, status) {
        try {
            const request = {
                token: this.token,
                eventId,
                userId,
                inviteeEmail,
                startTime,
                endTime,
                status
            };
            const [result] = await this.client.CreateRegistrationAsync({ request });
            console.log('Registration created:', result);
            return result;
        } catch (error) {
            console.error('Create registration failed:', error.message);
            throw error;
        }
    }
}

// Example usage
async function runExamples() {
    const client = new GymRegistrationClient();

    try {
        await client.connect();

        // Create a test trainee (ignore if already exists)
        console.log('\n=== Creating Test Trainee ===');
        await client.createTrainee('Test User', 'test@example.com', 'password123', 'Europe/Tallinn');

        // Login with test user
        console.log('\n=== Logging in ===');
        await client.createSession('test@example.com', 'password123');

        // List trainees
        console.log('\n=== Listing Trainees ===');
        const trainees = await client.listTrainees();
        const testUserId = trainees.data[0].id;

        // Create a workout
        console.log('\n=== Creating Workout ===');
        await client.createWorkout('HIIT Training', 45, 'High intensity interval training', '#FF5733');

        // List workouts
        console.log('\n=== Listing Workouts ===');
        await client.listWorkouts();

        // Create a routine
        console.log('\n=== Creating Routine ===');
        const availability = [
            { day: 'monday', startTime: '08:00', endTime: '10:00' },
            { day: 'wednesday', startTime: '18:00', endTime: '20:00' }
        ];
        await client.createRoutine(testUserId, availability);

        // Create a registration
        console.log('\n=== Creating Registration ===');
        const startTime = new Date();
        startTime.setHours(startTime.getHours() + 1);
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + 2);

        await client.createRegistration(
            'event-123',
            testUserId,
            'test@example.com',
            startTime.toISOString(),
            endTime.toISOString(),
            'scheduled'
        );

        // Logout
        console.log('\n=== Logging out ===');
        await client.deleteSession();

        console.log('\n✅ All examples completed successfully!');

    } catch (error) {
        console.error('❌ Example failed:', error.message);
    }
}

// Run examples if this file is executed directly
if (require.main === module) {
    runExamples();
}

module.exports = GymRegistrationClient;