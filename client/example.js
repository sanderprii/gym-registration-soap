const soap = require('soap');
const fs = require('fs');

// SOAP client for testing all operations
class GymRegistrationSOAPClient {
    constructor(url) {
        this.url = url;
        this.client = null;
        this.token = null;
    }

    async connect() {
        try {
            this.client = await soap.createClientAsync(this.url);
            console.log('Connected to SOAP service');
            return true;
        } catch (error) {
            console.error('Failed to connect to SOAP service:', error.message);
            return false;
        }
    }

    async login(email, password) {
        try {
            const [result] = await this.client.LoginAsync({ email, password });
            if (result && result.token) {
                this.token = result.token;
                console.log('✓ Login successful');
                console.log(`  Token: ${result.token.substring(0, 20)}...`);
                console.log(`  User: ${result.trainee.name} (${result.trainee.email})`);
                return result;
            }
        } catch (error) {
            console.error('✗ Login failed:', error.message);
            throw error;
        }
    }

    async logout() {
        try {
            const [result] = await this.client.LogoutAsync({ token: this.token });
            console.log('✓ Logout successful');
            this.token = null;
            return result;
        } catch (error) {
            console.error('✗ Logout failed:', error.message);
            throw error;
        }
    }

    async checkSession() {
        try {
            const [result] = await this.client.CheckSessionAsync({ token: this.token });
            console.log('✓ Session check successful');
            console.log(`  Authenticated: ${result.authenticated}`);
            if (result.trainee) {
                console.log(`  User: ${result.trainee.name}`);
            }
            return result;
        } catch (error) {
            console.error('✗ Session check failed:', error.message);
            throw error;
        }
    }

    // Trainee operations
    async getTrainees(page = 1, pageSize = 10) {
        try {
            const [result] = await this.client.GetTraineesAsync({
                token: this.token,
                page,
                pageSize
            });
            console.log('✓ Get trainees successful');
            console.log(`  Found ${result.trainees.length} trainees (Page ${result.pagination.page}/${Math.ceil(result.pagination.total / result.pagination.pageSize)})`);
            result.trainees.forEach((trainee, index) => {
                console.log(`    ${index + 1}. ${trainee.name} (${trainee.email})`);
            });
            return result;
        } catch (error) {
            console.error('✗ Get trainees failed:', error.message);
            throw error;
        }
    }

    async createTrainee(traineeData) {
        try {
            const [result] = await this.client.CreateTraineeAsync(traineeData);
            console.log('✓ Create trainee successful');
            console.log(`  Created: ${result.name} (${result.email})`);
            console.log(`  ID: ${result.id}`);
            return result;
        } catch (error) {
            console.error('✗ Create trainee failed:', error.message);
            throw error;
        }
    }

    async getTrainee(id) {
        try {
            const [result] = await this.client.GetTraineeAsync({ token: this.token, id });
            console.log('✓ Get trainee successful');
            console.log(`  ${result.name} (${result.email})`);
            console.log(`  Timezone: ${result.timezone || 'Not set'}`);
            return result;
        } catch (error) {
            console.error('✗ Get trainee failed:', error.message);
            throw error;
        }
    }

    async updateTrainee(updateData) {
        try {
            const [result] = await this.client.UpdateTraineeAsync({
                token: this.token,
                trainee: updateData
            });
            console.log('✓ Update trainee successful');
            console.log(`  Updated: ${result.name} (${result.email})`);
            return result;
        } catch (error) {
            console.error('✗ Update trainee failed:', error.message);
            throw error;
        }
    }

    async deleteTrainee(id) {
        try {
            const [result] = await this.client.DeleteTraineeAsync({ token: this.token, id });
            console.log('✓ Delete trainee successful');
            return result;
        } catch (error) {
            console.error('✗ Delete trainee failed:', error.message);
            throw error;
        }
    }

    // Workout operations
    async getWorkouts() {
        try {
            const [result] = await this.client.GetWorkoutsAsync({ token: this.token });
            console.log('✓ Get workouts successful');
            console.log(`  Found ${result.length} workouts`);
            result.forEach((workout, index) => {
                console.log(`    ${index + 1}. ${workout.name} (${workout.duration} min)`);
            });
            return result;
        } catch (error) {
            console.error('✗ Get workouts failed:', error.message);
            throw error;
        }
    }

    async createWorkout(workoutData) {
        try {
            const [result] = await this.client.CreateWorkoutAsync({
                token: this.token,
                workout: workoutData
            });
            console.log('✓ Create workout successful');
            console.log(`  Created: ${result.name} (${result.duration} min)`);
            console.log(`  ID: ${result.id}`);
            return result;
        } catch (error) {
            console.error('✗ Create workout failed:', error.message);
            throw error;
        }
    }

    async getWorkout(id) {
        try {
            const [result] = await this.client.GetWorkoutAsync({ token: this.token, id });
            console.log('✓ Get workout successful');
            console.log(`  ${result.name} (${result.duration} min)`);
            console.log(`  Description: ${result.description || 'None'}`);
            return result;
        } catch (error) {
            console.error('✗ Get workout failed:', error.message);
            throw error;
        }
    }

    async updateWorkout(updateData) {
        try {
            const [result] = await this.client.UpdateWorkoutAsync({
                token: this.token,
                workout: updateData
            });
            console.log('✓ Update workout successful');
            console.log(`  Updated: ${result.name} (${result.duration} min)`);
            return result;
        } catch (error) {
            console.error('✗ Update workout failed:', error.message);
            throw error;
        }
    }

    async deleteWorkout(id) {
        try {
            const [result] = await this.client.DeleteWorkoutAsync({ token: this.token, id });
            console.log('✓ Delete workout successful');
            return result;
        } catch (error) {
            console.error('✗ Delete workout failed:', error.message);
            throw error;
        }
    }

    // Routine operations
    async getRoutines(traineeId = null) {
        try {
            const params = { token: this.token };
            if (traineeId) params.traineeId = traineeId;

            const [result] = await this.client.GetRoutinesAsync(params);
            console.log('✓ Get routines successful');
            console.log(`  Found ${result.length} routines`);
            result.forEach((routine, index) => {
                console.log(`    ${index + 1}. ${routine.trainee.name} - ${routine.availability.length} time slots`);
            });
            return result;
        } catch (error) {
            console.error('✗ Get routines failed:', error.message);
            throw error;
        }
    }

    async createRoutine(routineData) {
        try {
            const [result] = await this.client.CreateRoutineAsync({
                token: this.token,
                routine: routineData
            });
            console.log('✓ Create routine successful');
            console.log(`  Created routine for: ${result.trainee.name}`);
            console.log(`  Availability slots: ${result.availability.length}`);
            return result;
        } catch (error) {
            console.error('✗ Create routine failed:', error.message);
            throw error;
        }
    }

    async getTraineeRoutine(traineeId) {
        try {
            const [result] = await this.client.GetTraineeRoutineAsync({
                token: this.token,
                traineeId
            });
            console.log('✓ Get trainee routine successful');
            console.log(`  Routine for: ${result.trainee.name}`);
            console.log(`  Availability:`);
            result.availability.forEach(slot => {
                console.log(`    ${slot.day}: ${slot.startTime} - ${slot.endTime}`);
            });
            return result;
        } catch (error) {
            console.error('✗ Get trainee routine failed:', error.message);
            throw error;
        }
    }

    async updateRoutine(updateData) {
        try {
            const [result] = await this.client.UpdateRoutineAsync({
                token: this.token,
                routine: updateData
            });
            console.log('✓ Update routine successful');
            console.log(`  Updated routine for: ${result.trainee.name}`);
            return result;
        } catch (error) {
            console.error('✗ Update routine failed:', error.message);
            throw error;
        }
    }

    async deleteRoutine(traineeId) {
        try {
            const [result] = await this.client.DeleteRoutineAsync({
                token: this.token,
                traineeId
            });
            console.log('✓ Delete routine successful');
            return result;
        } catch (error) {
            console.error('✗ Delete routine failed:', error.message);
            throw error;
        }
    }

    // Registration operations
    async getRegistrations() {
        try {
            const [result] = await this.client.GetRegistrationsAsync({ token: this.token });
            console.log('✓ Get registrations successful');
            console.log(`  Found ${result.length} registrations`);
            result.forEach((registration, index) => {
                console.log(`    ${index + 1}. ${registration.trainee.name} - ${registration.eventId} (${registration.status})`);
            });
            return result;
        } catch (error) {
            console.error('✗ Get registrations failed:', error.message);
            throw error;
        }
    }

    async createRegistration(registrationData) {
        try {
            const [result] = await this.client.CreateRegistrationAsync({
                token: this.token,
                registration: registrationData
            });
            console.log('✓ Create registration successful');
            console.log(`  Created registration for: ${result.trainee.name}`);
            console.log(`  Event: ${result.eventId}`);
            console.log(`  Start: ${result.startTime}`);
            return result;
        } catch (error) {
            console.error('✗ Create registration failed:', error.message);
            throw error;
        }
    }

    async getRegistration(id) {
        try {
            const [result] = await this.client.GetRegistrationAsync({ token: this.token, id });
            console.log('✓ Get registration successful');
            console.log(`  Registration for: ${result.trainee.name}`);
            console.log(`  Event: ${result.eventId}`);
            console.log(`  Status: ${result.status}`);
            return result;
        } catch (error) {
            console.error('✗ Get registration failed:', error.message);
            throw error;
        }
    }

    async updateRegistration(updateData) {
        try {
            const [result] = await this.client.UpdateRegistrationAsync({
                token: this.token,
                registration: updateData
            });
            console.log('✓ Update registration successful');
            console.log(`  Updated registration for: ${result.trainee.name}`);
            return result;
        } catch (error) {
            console.error('✗ Update registration failed:', error.message);
            throw error;
        }
    }

    async deleteRegistration(id) {
        try {
            const [result] = await this.client.DeleteRegistrationAsync({
                token: this.token,
                id
            });
            console.log('✓ Delete registration successful');
            return result;
        } catch (error) {
            console.error('✗ Delete registration failed:', error.message);
            throw error;
        }
    }
}

// Demo function that tests all operations
async function runDemo() {
    console.log('=== Gym Registration SOAP Client Demo ===\n');

    const client = new GymRegistrationSOAPClient('http://localhost:3001/soap?wsdl');

    // Connect to SOAP service
    if (!await client.connect()) {
        return;
    }

    try {
        // 1. Create a new trainee for testing
        console.log('\n--- Creating Test Trainee ---');
        const newTrainee = await client.createTrainee({
            name: 'SOAP Test User',
            email: 'soap.test@example.com',
            password: 'testpass123',
            timezone: 'Europe/Tallinn'
        });

        // 2. Login
        console.log('\n--- Login ---');
        await client.login('soap.test@example.com', 'testpass123');

        // 3. Check session
        console.log('\n--- Check Session ---');
        await client.checkSession();

        // 4. Get all trainees
        console.log('\n--- Get All Trainees ---');
        await client.getTrainees(1, 5);

        // 5. Get specific trainee
        console.log('\n--- Get Specific Trainee ---');
        await client.getTrainee(newTrainee.id);

        // 6. Update trainee
        console.log('\n--- Update Trainee ---');
        await client.updateTrainee({
            id: newTrainee.id,
            name: 'SOAP Test User Updated',
            timezone: 'Europe/London'
        });

        // 7. Create a workout
        console.log('\n--- Create Workout ---');
        const newWorkout = await client.createWorkout({
            name: 'SOAP Test Workout',
            duration: 45,
            description: 'Test workout created via SOAP',
            color: '#FF5733'
        });

        // 8. Get all workouts
        console.log('\n--- Get All Workouts ---');
        await client.getWorkouts();

        // 9. Get specific workout
        console.log('\n--- Get Specific Workout ---');
        await client.getWorkout(newWorkout.id);

        // 10. Update workout
        console.log('\n--- Update Workout ---');
        await client.updateWorkout({
            id: newWorkout.id,
            name: 'SOAP Test Workout Updated',
            duration: 60
        });

        // 11. Create a routine
        console.log('\n--- Create Routine ---');
        const newRoutine = await client.createRoutine({
            userId: newTrainee.id,
            availability: [
                { day: 'monday', startTime: '09:00', endTime: '11:00' },
                { day: 'wednesday', startTime: '14:00', endTime: '16:00' },
                { day: 'friday', startTime: '18:00', endTime: '20:00' }
            ]
        });

        // 12. Get all routines
        console.log('\n--- Get All Routines ---');
        await client.getRoutines();

        // 13. Get trainee routine
        console.log('\n--- Get Trainee Routine ---');
        await client.getTraineeRoutine(newTrainee.id);

        // 14. Update routine
        console.log('\n--- Update Routine ---');
        await client.updateRoutine({
            traineeId: newTrainee.id,
            availability: [
                { day: 'tuesday', startTime: '10:00', endTime: '12:00' },
                { day: 'thursday', startTime: '15:00', endTime: '17:00' }
            ]
        });

        // 15. Create a registration
        console.log('\n--- Create Registration ---');
        const newRegistration = await client.createRegistration({
            eventId: 'workout-session-001',
            userId: newTrainee.id,
            inviteeEmail: 'soap.test@example.com',
            startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
            status: 'scheduled'
        });

        // 16. Get all registrations
        console.log('\n--- Get All Registrations ---');
        await client.getRegistrations();

        // 17. Get specific registration
        console.log('\n--- Get Specific Registration ---');
        await client.getRegistration(newRegistration.id);

        // 18. Update registration
        console.log('\n--- Update Registration ---');
        await client.updateRegistration({
            id: newRegistration.id,
            status: 'completed'
        });

        // 19. Cleanup - Delete created resources
        console.log('\n--- Cleanup ---');
        await client.deleteRegistration(newRegistration.id);
        await client.deleteRoutine(newTrainee.id);
        await client.deleteWorkout(newWorkout.id);
        await client.deleteTrainee(newTrainee.id);

        // 20. Logout
        console.log('\n--- Logout ---');
        await client.logout();

        console.log('\n=== Demo completed successfully! ===');

    } catch (error) {
        console.error('\nDemo failed:', error.message);
        if (error.root && error.root.Envelope && error.root.Envelope.Body && error.root.Envelope.Body.Fault) {
            const fault = error.root.Envelope.Body.Fault;
            console.error('SOAP Fault:', fault.faultstring);
        }
    }
}

// Run the demo if this file is executed directly
if (require.main === module) {
    runDemo();
}

module.exports = GymRegistrationSOAPClient;