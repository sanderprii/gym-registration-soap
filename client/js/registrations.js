// Registrations management functionality
Auth.redirectIfNotLoggedIn();
Auth.displayUserInfo();

// Global variables
let editingRegistrationId = null;
let trainees = [];

// Logout handler
document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    Auth.logout();
});

// Load registrations and trainees data
async function loadRegistrations() {
    try {
        const registrations = await api.getRegistrations();
        displayRegistrations(registrations);
    } catch (error) {
        console.error('Error loading registrations:', error);
        showError('Error loading registrations: ' + error.message);
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
    const select = document.getElementById('registration-trainee');
    select.innerHTML = '<option value="">Select a trainee...</option>';

    trainees.forEach(trainee => {
        const option = document.createElement('option');
        option.value = trainee.id;
        option.textContent = `${trainee.name} (${trainee.email})`;
        select.appendChild(option);
    });
}

function displayRegistrations(registrations) {
    const tbody = document.getElementById('registrations-tbody');

    if (registrations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No registrations found</td></tr>';
        return;
    }

    tbody.innerHTML = registrations.map(registration => `
        <tr>
            <td>${registration.trainee.name} (${registration.trainee.email})</td>
            <td>${registration.eventId}</td>
            <td>${formatDate(registration.startTime)}</td>
            <td>${registration.endTime ? formatDate(registration.endTime) : '-'}</td>
            <td>
                <span class="status-badge status-${registration.status}">
                    ${registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                </span>
            </td>
            <td>${formatDate(registration.createdAt)}</td>
            <td>
                <button onclick="editRegistration('${registration.id}')" class="btn btn-secondary">Edit</button>
                <button onclick="deleteRegistration('${registration.id}')" class="btn btn-danger">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Modal management
function openCreateModal() {
    editingRegistrationId = null;
    document.getElementById('modal-title').textContent = 'Add New Registration';
    document.getElementById('registration-form').reset();
    document.getElementById('registration-id').value = '';

    // Set default start time to current time
    const now = new Date();
    document.getElementById('registration-start').value = formatDateTimeLocal(now);

    // Set default end time to 1 hour later
    const endTime = new Date(now);
    endTime.setHours(endTime.getHours() + 1);
    document.getElementById('registration-end').value = formatDateTimeLocal(endTime);

    document.getElementById('registration-modal').style.display = 'block';
}

async function editRegistration(id) {
    try {
        editingRegistrationId = id;
        const registration = await api.getRegistration(id);

        document.getElementById('modal-title').textContent = 'Edit Registration';
        document.getElementById('registration-id').value = registration.id;
        document.getElementById('registration-trainee').value = registration.userId;
        document.getElementById('registration-event').value = registration.eventId;
        document.getElementById('registration-email').value = registration.inviteeEmail;
        document.getElementById('registration-start').value = formatDateTimeLocal(registration.startTime);

        if (registration.endTime) {
            document.getElementById('registration-end').value = formatDateTimeLocal(registration.endTime);
        } else {
            document.getElementById('registration-end').value = '';
        }

        document.getElementById('registration-status').value = registration.status;

        document.getElementById('registration-modal').style.display = 'block';
    } catch (error) {
        console.error('Error fetching registration:', error);
        showError('Error fetching registration: ' + error.message);
    }
}

function closeModal() {
    document.getElementById('registration-modal').style.display = 'none';
    document.getElementById('modal-error').style.display = 'none';
}

// Delete registration
async function deleteRegistration(id) {
    if (!confirm('Are you sure you want to delete this registration?')) {
        return;
    }

    try {
        await api.deleteRegistration(id);
        showSuccess('Registration deleted successfully');
        loadRegistrations();
    } catch (error) {
        console.error('Error deleting registration:', error);
        showError('Error deleting registration: ' + error.message);
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
    const modal = document.getElementById('registration-modal');
    if (e.target === modal) {
        closeModal();
    }
});

// Form submission
document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const registrationData = Object.fromEntries(formData);
    const modalError = document.getElementById('modal-error');

    // Convert datetime-local inputs to ISO strings
    registrationData.startTime = new Date(registrationData.startTime).toISOString();
    if (registrationData.endTime) {
        registrationData.endTime = new Date(registrationData.endTime).toISOString();
    }

    try {
        if (editingRegistrationId) {
            // Update existing registration
            await api.updateRegistration(editingRegistrationId, registrationData);
            showSuccess('Registration updated successfully');
        } else {
            // Create new registration
            await api.createRegistration(registrationData);
            showSuccess('Registration created successfully');
        }

        closeModal();
        loadRegistrations();
    } catch (error) {
        console.error('Error saving registration:', error);
        modalError.textContent = error.message;
        modalError.style.display = 'block';
    }
});

// Add status badge styles to CSS
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 4px 8px;
        border-radius: 15px;
        color: white;
        font-size: 0.8em;
        font-weight: bold;
    }
    .status-scheduled {
        background-color: #007bff;
    }
    .status-canceled {
        background-color: #dc3545;
    }
    .status-completed {
        background-color: #28a745;
    }
`;
document.head.appendChild(style);

// Load data on page load
loadRegistrations();
loadTrainees();