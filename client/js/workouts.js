// Workouts management functionality
Auth.redirectIfNotLoggedIn();
Auth.displayUserInfo();

// Global variables
let editingWorkoutId = null;

// Logout handler
document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    Auth.logout();
});

// Load workouts data
async function loadWorkouts() {
    try {
        const workouts = await api.getWorkouts();
        displayWorkouts(workouts);
    } catch (error) {
        console.error('Error loading workouts:', error);
        showError('Error loading workouts: ' + error.message);
    }
}

function displayWorkouts(workouts) {
    const tbody = document.getElementById('workouts-tbody');

    if (workouts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No workouts found</td></tr>';
        return;
    }

    tbody.innerHTML = workouts.map(workout => `
        <tr>
            <td>${workout.name}</td>
            <td>${workout.duration}</td>
            <td>${workout.description || '-'}</td>
            <td>
                ${workout.color ?
        `<div style="width: 30px; height: 20px; background-color: ${workout.color}; border: 1px solid #ccc; display: inline-block; border-radius: 3px;"></div>`
        : '-'
    }
            </td>
            <td>${formatDate(workout.createdAt)}</td>
            <td>
                <button onclick="editWorkout('${workout.id}')" class="btn btn-secondary">Edit</button>
                <button onclick="deleteWorkout('${workout.id}')" class="btn btn-danger">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Modal management
function openCreateModal() {
    editingWorkoutId = null;
    document.getElementById('modal-title').textContent = 'Add New Workout';
    document.getElementById('workout-form').reset();
    document.getElementById('workout-id').value = '';
    document.getElementById('workout-modal').style.display = 'block';
}

async function editWorkout(id) {
    try {
        editingWorkoutId = id;
        const workout = await api.getWorkout(id);

        document.getElementById('modal-title').textContent = 'Edit Workout';
        document.getElementById('workout-id').value = workout.id;
        document.getElementById('workout-name').value = workout.name;
        document.getElementById('workout-duration').value = workout.duration;
        document.getElementById('workout-description').value = workout.description || '';
        document.getElementById('workout-color').value = workout.color || '#007bff';

        document.getElementById('workout-modal').style.display = 'block';
    } catch (error) {
        console.error('Error fetching workout:', error);
        showError('Error fetching workout: ' + error.message);
    }
}

function closeModal() {
    document.getElementById('workout-modal').style.display = 'none';
    document.getElementById('modal-error').style.display = 'none';
}

// Delete workout
async function deleteWorkout(id) {
    if (!confirm('Are you sure you want to delete this workout?')) {
        return;
    }

    try {
        await api.deleteWorkout(id);
        showSuccess('Workout deleted successfully');
        loadWorkouts();
    } catch (error) {
        console.error('Error deleting workout:', error);
        showError('Error deleting workout: ' + error.message);
    }
}

// Utility functions
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.style.display = 'block';

    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

// Modal event listeners
document.querySelector('.close').addEventListener('click', closeModal);

window.addEventListener('click', (e) => {
    const modal = document.getElementById('workout-modal');
    if (e.target === modal) {
        closeModal();
    }
});

// Form submission
document.getElementById('workout-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const workoutData = Object.fromEntries(formData);
    const modalError = document.getElementById('modal-error');

    // Convert duration to number
    workoutData.duration = parseInt(workoutData.duration);

    try {
        if (editingWorkoutId) {
            // Update existing workout
            await api.updateWorkout(editingWorkoutId, workoutData);
            showSuccess('Workout updated successfully');
        } else {
            // Create new workout
            await api.createWorkout(workoutData);
            showSuccess('Workout created successfully');
        }

        closeModal();
        loadWorkouts();
    } catch (error) {
        console.error('Error saving workout:', error);
        modalError.textContent = error.message;
        modalError.style.display = 'block';
    }
});

// Load workouts on page load
loadWorkouts();