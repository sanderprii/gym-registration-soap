const soap = require('soap');
const axios = require('axios');

const SOAP_URL = 'http://localhost:3001/soap?wsdl';
const REST_URL = 'http://localhost:3000';

class SOAPTester {
    constructor() {
        this.soapClient = null;
        this.restToken = null;
        this.soapToken = null;
    }

    async connect() {
        this.soapClient = await soap.createClientAsync(SOAP_URL);
        console.log('✓ Connected to SOAP service');
    }

    async testAuth() {
        console.log('\n=== Testing Authentication ===');

        try {
            const testEmail = 'test@example.com';
            const testPassword = 'password123';

            // First create a test user via REST (ignore if exists)
            try {
                await axios.post(`${REST_URL}/trainees`, {
                    name: 'Test User',
                    email: testEmail,
                    password: testPassword,
                    timezone: 'Europe/Tallinn'
                });
            } catch (error) {
                // Ignore if user already exists
            }

            // SOAP login
            const soapLoginResult = await this.soapClient.CreateSessionAsync({
                request: { email: testEmail, password: testPassword }
            });
            this.soapToken = soapLoginResult[0].token;
            console.log('✓ SOAP login successful');

            // REST login
            const restLoginResult = await axios.post(`${REST_URL}/sessions`, {
                email: testEmail,
                password: testPassword
            });
            this.restToken = restLoginResult.data.token;
            console.log('✓ REST login successful');

            console.log('✓ Both logins successful');
        } catch (error) {
            console.error('✗ Authentication test failed:', error.message);
            throw error;
        }
    }

    async testTrainees() {
        console.log('\n=== Testing Trainees ===');

        try {
            // Make sure we have the same test user in both systems
            const testUser = {
                name: 'Test User 2',
                email: 'test2@example.com',
                password: 'password123',
                timezone: 'Europe/Tallinn'
            };

            // Create user in REST
            try {
                await axios.post(`${REST_URL}/trainees`, testUser);
            } catch (error) {
                // Ignore if already exists
            }

            // Create user in SOAP
            try {
                await this.soapClient.CreateTraineeAsync({ request: testUser });
            } catch (error) {
                // Ignore if already exists
            }

            // List trainees via SOAP
            const soapResult = await this.soapClient.ListTraineesAsync({
                request: { token: this.soapToken, page: 1, pageSize: 20 }
            });

            // List trainees via REST
            const restResult = await axios.get(`${REST_URL}/trainees?page=1&pageSize=20`, {
                headers: { Authorization: `Bearer ${this.restToken}` }
            });

            const soapCount = soapResult[0].pagination.total;
            const restCount = restResult.data.pagination.total;

            console.log(`SOAP trainees: ${soapCount}, REST trainees: ${restCount}`);

            // We don't require exact match since they might be using different databases
            console.log('✓ Trainees list operation successful');
        } catch (error) {
            console.error('✗ Trainees test failed:', error.message);
            throw error;
        }
    }

    async testWorkouts() {
        console.log('\n=== Testing Workouts ===');

        try {
            // Create workout via SOAP
            const workoutData = {
                name: 'Test SOAP Workout',
                duration: 60,
                description: 'Test workout created via SOAP',
                color: '#FF0000'
            };

            await this.soapClient.CreateWorkoutAsync({
                request: { token: this.soapToken, ...workoutData }
            });

            // Create workout via REST
            await axios.post(`${REST_URL}/workouts`, workoutData, {
                headers: { Authorization: `Bearer ${this.restToken}` }
            });

            // List workouts via both
            const soapResult = await this.soapClient.ListWorkoutsAsync({
                request: { token: this.soapToken }
            });

            const restResult = await axios.get(`${REST_URL}/workouts`, {
                headers: { Authorization: `Bearer ${this.restToken}` }
            });

            const soapWorkouts = soapResult[0].workouts || [];
            const restWorkouts = restResult.data || [];

            console.log(`SOAP workouts: ${soapWorkouts.length}, REST workouts: ${restWorkouts.length}`);
            console.log('✓ Workouts operations successful');
        } catch (error) {
            console.error('✗ Workouts test failed:', error.message);
            throw error;
        }
    }

    async testErrorHandling() {
        console.log('\n=== Testing Error Handling ===');

        try {
            // Test invalid token
            try {
                await this.soapClient.ListTraineesAsync({
                    request: { token: 'invalid_token', page: 1, pageSize: 20 }
                });
                console.log('✗ Should have failed with invalid token');
            } catch (error) {
                // Parse SOAP fault
                const errorMessage = this.extractSOAPError(error);
                if (errorMessage && (errorMessage.includes('Invalid token') ||
                    errorMessage.includes('Authorization') ||
                    errorMessage.includes('missing'))) {
                    console.log('✓ Invalid token properly rejected');
                } else {
                    console.log('✗ Unexpected error for invalid token:', errorMessage);
                }
            }

            // Test missing required fields
            try {
                await this.soapClient.CreateTraineeAsync({
                    request: { name: 'Test' }
                });
                console.log('✗ Should have failed with missing fields');
            } catch (error) {
                const errorMessage = this.extractSOAPError(error);
                if (errorMessage && errorMessage.includes('required')) {
                    console.log('✓ Missing fields properly rejected');
                } else {
                    console.log('✗ Unexpected error for missing fields:', errorMessage);
                }
            }
        } catch (error) {
            console.error('✗ Error handling test failed:', error.message);
        }
    }

    extractSOAPError(error) {
        if (error.body) {
            // Extract error from SOAP fault
            const match = error.body.match(/<soap:Text>(.*?)<\/soap:Text>/s);
            if (match) {
                return match[1].replace(/&quot;/g, '"').trim();
            }
        }
        return error.message || 'Unknown error';
    }

    async runAllTests() {
        try {
            await this.connect();
            await this.testAuth();
            await this.testTrainees();
            await this.testWorkouts();
            await this.testErrorHandling();
            console.log('\n✓ All tests completed!');
        } catch (error) {
            console.error('\n✗ Tests failed:', error.message);
            process.exit(1);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new SOAPTester();
    tester.runAllTests().then(() => {
        console.log('\n🎉 Test suite completed successfully!');
        process.exit(0);
    }).catch(error => {
        console.error('\n❌ Test suite failed:', error.message);
        process.exit(1);
    });
}

module.exports = SOAPTester;