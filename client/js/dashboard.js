// Dashboard functionality
Auth.redirectIfNotLoggedIn();
Auth.displayUserInfo();

// Logout handler
document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    Auth.logout();
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Get counts for different entities
        const traineesResp = await api.getTrainees(1, 1);
        const workoutsResp = await api.getWorkouts();
        const routinesResp = await api.getRoutines();
        const registrationsResp = await api.getRegistrations();

        const stats = {
            trainees: traineesResp.pagination ? traineesResp.pagination.total : 0,
            workouts: workoutsResp.length || 0,
            routines: routinesResp.length || 0,
            registrations: registrationsResp.length || 0
        };

        displayStats(stats);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        document.getElementById('stats-content').innerHTML = '<p>Error loading statistics</p>';
    }
}

function displayStats(stats) {
    const html = `
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <h4>${stats.trainees}</h4>
                <p>Total Trainees</p>
            </div>
            <div class="dashboard-card">
                <h4>${stats.workouts}</h4>
                <p>Workout Types</p>
            </div>
            <div class="dashboard-card">
                <h4>${stats.routines}</h4>
                <p>Routines</p>
            </div>
            <div class="dashboard-card">
                <h4>${stats.registrations}</h4>
                <p>Registrations</p>
            </div>
        </div>
    `;

    document.getElementById('stats-content').innerHTML = html;
}

// Load stats on page load
loadDashboardStats();