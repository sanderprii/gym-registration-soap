// Trainees management functionality
Auth.redirectIfNotLoggedIn();
Auth.displayUserInfo();

// Global variables
let currentPage = 1;
let totalPages = 1;
let editingTraineeId = null;

// Logout handler
document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    Auth.logout();
});

// Load trainees data
async function loadTrainees(page = 1) {
    try {
        currentPage = page;
        const response = await api.getTrainees(page, CONFIG.DEFAULT_PAGE_SIZE);
        displayTrainees(response.data);
        updatePagination(response.pagination);
    } catch (error) {
        console.error('Error loading trainees:', error);
        showError('Error loading trainees: ' + error.message);
    }
}

function displayTrainees(trainees) {
    const tbody = document.getElementById('trainees-tbody');

    if (trainees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No trainees found</td></tr>';
        return;
    }

    tbody.innerHTML = trainees.map(trainee => `
        <tr>
            <td>${trainee.name}</td>
            <td>${trainee.email}</td>
            <td>${trainee.timezone || '-'}</td>
            <td>${formatDate(trainee.createdAt)}</td>
            <td>
                <button onclick="editTrainee('${trainee.id}')" class="btn btn-secondary">Edit</button>
                <button onclick="deleteTrainee('${trainee.id}')" class="btn btn-danger">Delete</button>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    totalPages = Math.ceil(pagination.total / pagination.pageSize);
    const paginationDiv = document.getElementById('pagination');

    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let buttons = '';

    // Previous button
    if (currentPage > 1) {
        buttons += `<button onclick="loadTrainees(${currentPage - 1})">Previous</button>`;
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const active = i === currentPage ? 'active' : '';
        buttons += `<button onclick="loadTrainees(${i})" class="${active}">${i}</button>`;
    }

    // Next button
    if (currentPage < totalPages) {
        buttons += `<button onclick="loadTrainees(${currentPage + 1})">Next</button>`;
    }

    paginationDiv.innerHTML = buttons;
}

// Modal management
function openCreateModal() {
    editingTraineeId = null;
    document.getElementById('modal-title').textContent = 'Add New Trainee';
    document.getElementById('trainee-form').reset();
    document.getElementById('trainee-id').value = '';
    document.getElementById('trainee-modal').style.display = 'block';
}

async function editTrainee(id) {
    try {
        editingTraineeId = id;
        const trainee = await api.getTrainee(id);

        document.getElementById('modal-title').textContent = 'Edit Trainee';
        document.getElementById('trainee-id').value = trainee.id;
        document.getElementById('trainee-name').value = trainee.name;
        document.getElementById('trainee-email').value = trainee.email;
        document.getElementById('trainee-timezone').value = trainee.timezone || '';
        // Don't pre-fill password for security
        document.getElementById('trainee-password').value = '';
        document.getElementById('trainee-password').removeAttribute('required');

        document.getElementById('trainee-modal').style.display = 'block';
    } catch (error) {
        console.error('Error fetching trainee:', error);
        showError('Error fetching trainee: ' + error.message);
    }
}

function closeModal() {
    document.getElementById('trainee-modal').style.display = 'none';
    document.getElementById('modal-error').style.display = 'none';
    document.getElementById('trainee-password').setAttribute('required', '');
}

// Delete trainee
async function deleteTrainee(id) {
    if (!confirm('Are you sure you want to delete this trainee?')) {
        return;
    }

    try {
        await api.deleteTrainee(id);
        showSuccess('Trainee deleted successfully');
        loadTrainees(currentPage);
    } catch (error) {
        console.error('Error deleting trainee:', error);
        showError('Error deleting trainee: ' + error.message);
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
    const modal = document.getElementById('trainee-modal');
    if (e.target === modal) {
        closeModal();
    }
});

// Form submission
document.getElementById('trainee-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const traineeData = Object.fromEntries(formData);
    const modalError = document.getElementById('modal-error');

    // Remove empty password for edit operations
    if (editingTraineeId && !traineeData.password) {
        delete traineeData.password;
    }

    try {
        if (editingTraineeId) {
            // Update existing trainee
            await api.updateTrainee(editingTraineeId, traineeData);
            showSuccess('Trainee updated successfully');
        } else {
            // Create new trainee
            await api.createTrainee(traineeData);
            showSuccess('Trainee created successfully');
        }

        closeModal();
        loadTrainees(currentPage);
    } catch (error) {
        console.error('Error saving trainee:', error);
        modalError.textContent = error.message;
        modalError.style.display = 'block';
    }
});

// Load trainees on page load
loadTrainees();