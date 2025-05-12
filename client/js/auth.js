// Authentication helper functions
class Auth {
    static saveAuthData(token, user) {
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    }

    static getToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    }

    static getUser() {
        const user = localStorage.getItem(CONFIG.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    static clearAuthData() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
    }

    static isLoggedIn() {
        return this.getToken() !== null;
    }

    static redirectIfNotLoggedIn() {
        if (!this.isLoggedIn()) {
            window.location.href = 'index.html';
        }
    }

    static redirectIfLoggedIn() {
        if (this.isLoggedIn()) {
            window.location.href = 'dashboard.html';
        }
    }

    static async login(email, password) {
        try {
            const response = await api.login(email, password);
            if (response.token) {
                this.saveAuthData(response.token, response.trainee);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthData();
            window.location.href = 'index.html';
        }
    }

    static displayUserInfo() {
        const user = this.getUser();
        if (user) {
            const userInfoElement = document.getElementById('user-info');
            if (userInfoElement) {
                userInfoElement.textContent = `Welcome, ${user.name} (${user.email})`;
            }
        }
    }
}