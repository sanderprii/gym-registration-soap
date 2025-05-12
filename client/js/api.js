// API utility functions
class API {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
    }

    // Get auth token from localStorage
    getToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    }

    // Common headers for authenticated requests
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);

            // Handle different response status codes
            if (response.status === 204) {
                return null; // No content
            }

            if (response.status === 401) {
                // Unauthorized - redirect to login
                localStorage.removeItem(CONFIG.TOKEN_KEY);
                localStorage.removeItem(CONFIG.USER_KEY);
                window.location.href = 'index.html';
                return;
            }

            const data = response.ok ? await response.json() : { error: await response.text() };

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PATCH request
    async patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Session endpoints
    async login(email, password) {
        return this.post('/sessions', { email, password });
    }

    async logout() {
        return this.delete('/sessions');
    }

    async checkSession() {
        return this.get('/sessions');
    }

    // Trainees endpoints
    async getTrainees(page = 1, pageSize = CONFIG.DEFAULT_PAGE_SIZE) {
        return this.get(`/trainees?page=${page}&pageSize=${pageSize}`);
    }

    async createTrainee(trainee) {
        return this.post('/trainees', trainee);
    }

    async getTrainee(id) {
        return this.get(`/trainees/${id}`);
    }

    async updateTrainee(id, updates) {
        return this.patch(`/trainees/${id}`, updates);
    }

    async deleteTrainee(id) {
        return this.delete(`/trainees/${id}`);
    }

    // Workouts endpoints
    async getWorkouts() {
        return this.get('/workouts');
    }

    async createWorkout(workout) {
        return this.post('/workouts', workout);
    }

    async getWorkout(id) {
        return this.get(`/workouts/${id}`);
    }

    async updateWorkout(id, updates) {
        return this.patch(`/workouts/${id}`, updates);
    }

    async deleteWorkout(id) {
        return this.delete(`/workouts/${id}`);
    }

    // Routines endpoints
    async getRoutines(traineeId = null) {
        const query = traineeId ? `?traineeId=${traineeId}` : '';
        return this.get(`/routines${query}`);
    }

    async createRoutine(routine) {
        return this.post('/routines', routine);
    }

    async getTraineeRoutine(traineeId) {
        return this.get(`/routines/trainee/${traineeId}`);
    }

    async updateTraineeRoutine(traineeId, updates) {
        return this.patch(`/routines/trainee/${traineeId}`, updates);
    }

    async deleteTraineeRoutine(traineeId) {
        return this.delete(`/routines/trainee/${traineeId}`);
    }

    // Registrations endpoints
    async getRegistrations() {
        return this.get('/registrations');
    }

    async createRegistration(registration) {
        return this.post('/registrations', registration);
    }

    async getRegistration(id) {
        return this.get(`/registrations/${id}`);
    }

    async updateRegistration(id, updates) {
        return this.patch(`/registrations/${id}`, updates);
    }

    async deleteRegistration(id) {
        return this.delete(`/registrations/${id}`);
    }
}

const api = new API();