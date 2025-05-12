// Configuration file for the frontend
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000',

    // Local storage keys
    TOKEN_KEY: 'auth_token',
    USER_KEY: 'current_user',

    // Pagination defaults
    DEFAULT_PAGE_SIZE: 20,

    // Date format
    DATE_FORMAT: 'YYYY-MM-DD HH:mm:ss'
};

// Helper functions
const formatDate = (date) => {
    return new Date(date).toLocaleString();
};

const formatTime = (time) => {
    return time.substring(0, 5); // HH:MM
};

const formatDateTimeLocal = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Export config for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}