const statusElement = document.getElementById('status-label');

function setStatus(message) {
    if (statusElement) statusElement.textContent = message;
}

// Export to window
window.setStatus = setStatus;
