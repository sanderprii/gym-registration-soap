// Routines management functionality
Auth.redirectIfNotLoggedIn();
Auth.displayUserInfo();

// Global variables
let editingRoutineId = null;
let trainees = [];

// Days of the week options
const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
];

// Logout handler
document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    Auth.logout();
});

// Load routines and trainees data
async function loadRoutines() {
    try {
        const routines = await api.getRoutines();
        displayRoutines(routines);
    } catch (error) {
        console.error('Error loading routines:', error);
        showError('Error loading routines: ' + error.message);
    }
}

async function loadTrainees() {
    try {
        // Get a large number of trainees for the dropdown
        const response = await api.getTrainees(1, 100);
        trainees = response.data;
        populateTraineeSelect();
    } catch (error) {
        console.error('Error loading trainees:', error);
        showError('Error loading trainees: ' + error.message);
    }
}

function populateTraineeSelect() {
    const select = document.getElementById('routine-trainee');
    select.innerHTML = '<option value="">Select a trainee...</option>';

    trainees.forEach(trainee => {
        const option = document.createElement('option');
        option.value = trainee.id;
        option.textContent = `${trainee.name} (${trainee.email})`;
        select.appendChild(option);
    });
}

function displayRoutines(routines) {
    const tbody = document.getElementById('routines-tbody');

    if (routines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No routines found</td></tr>';
        return;
    }

    tbody.innerHTML = routines.map(routine => `
        <tr>
            <td>${routine.trainee.name} (${routine.trainee.email})</td>
            <td>${formatAvailability(routine.availability)}</td>
            <td>${formatDate(routine.createdAt)}</td>
            <td>
                <button onclick="editRoutine('${routine.userId}')" class="btn btn-secondary">Edit</button>
                <button onclick="deleteRoutine('${routine.userId}')" class="btn btn-danger">Delete</button>
            </td>
        </tr>
    `).join('');
}

function formatAvailability(availability) {
    if (!availability || availability.length === 0) {
        return 'No availability set';
    }

    return availability.map(slot =>
        `${slot.day}: ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`
    ).join('<br>');
}

// Modal management
function openCreateModal() {
    editingRoutineId = null;
    document.getElementById('modal-title').textContent = 'Add New Routine';
    document.getElementById('routine-form').reset();
    document.getElementById('routine-id').value = '';
    clearAvailabilitySlots();
    addAvailabilitySlot(); // Add one empty slot by default
    document.getElementById('routine-modal').style.display = 'block';
}

async function editRoutine(traineeId) {
    try {
        editingRoutineId = traineeId;
        const routine = await api.getTraineeRoutine(traineeId);

        document.getElementById('modal-title').textContent = 'Edit Routine';
        document.getElementById('routine-id').value = routine.id;
        document.getElementById('routine-trainee').value = routine.userId;

        // Populate availability slots
        clearAvailabilitySlots();
        routine.availability.forEach(slot => {
            addAvailabilitySlot(slot);
        });

        document.getElementById('routine-modal').style.display = 'block';
    } catch (error) {
        console.error('Error fetching routine:', error);
        showError('Error fetching routine: ' + error.message);
    }
}

function closeModal() {
    document.getElementById('routine-modal').style.display = 'none';
    document.getElementById('modal-error').style.display = 'none';
}

// Availability slots management
function clearAvailabilitySlots() {
    document.getElementById('availability-container').innerHTML = '';
}

function addAvailabilitySlot(slot = null) {
    const container = document.getElementById('availability-container');
    const slotDiv = document.createElement('div');
    slotDiv.className = 'form-group';
    slotDiv.style.border = '1px solid #ddd';
    slotDiv.style.padding = '10px';
    slotDiv.style.marginBottom = '10px';
    slotDiv.style.borderRadius = '5px';

    slotDiv.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <select class="day-select" style="flex: 1; min-width: 120px;">
                ${daysOfWeek.map(day =>
        `<option value="${day.value}" ${slot && slot.day === day.value ? 'selected' : ''}>${day.label}</option>`
    ).join('')}
            </select>
            <input type="time" class="start-time" value="${slot ? slot.startTime : ''}" style="flex: 1; min-width: 120px;" required>
            <span>to</span>
            <input type="time" class="end-time" value="${slot ? slot.endTime : ''}" style="flex: 1; min-width: 120px;" required>
            <button type="button" onclick="removeAvailabilitySlot(this)" class="btn btn-danger" style="flex-shrink: 0;">Remove</button>
        </div>
    `;

    container.appendChild(slotDiv);
}

function removeAvailabilitySlot(button) {
    button.closest('.form-group').remove();
}

// Delete routine
async function deleteRoutine(traineeId) {
    if (!confirm('Are you sure you want to delete this routine?')) {
        return;
    }

    try {
        await api.deleteTraineeRoutine(traineeId);
        showSuccess('Routine deleted successfully');
        loadRoutines();
    } catch (error) {
        console.error('Error deleting routine:', error);
        showError('Error deleting routine: ' + error.message);
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
    const modal = document.getElementById('routine-modal');
    if (e.target === modal) {
        closeModal();
    }
});

// Form submission
document.getElementById('routine-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const routineData = {
        userId: formData.get('userId')
    };

    // Collect availability slots
    const availabilitySlots = [];
    const slots = document.querySelectorAll('#availability-container .form-group');

    slots.forEach(slot => {
        const day = slot.querySelector('.day-select').value;
        const startTime = slot.querySelector('.start-time').value;
        const endTime = slot.querySelector('.end-time').value;

        if (day && startTime && endTime) {
            availabilitySlots.push({
                day,
                startTime,
                endTime
            });
        }
    });

    routineData.availability = availabilitySlots;
    const modalError = document.getElementById('modal-error');

    try {
        if (editingRoutineId) {
            // Update existing routine
            await api.updateTraineeRoutine(editingRoutineId, { availability: availabilitySlots });
            showSuccess('Routine updated successfully');
        } else {
            // Create new routine
            await api.createRoutine(routineData);
            showSuccess('Routine created successfully');
        }

        closeModal();
        loadRoutines();
    } catch (error) {
        console.error('Error saving routine:', error);
        modalError.textContent = error.message;
        modalError.style.display = 'block';
    }
});

// Load data on page load
loadRoutines();
loadTrainees();