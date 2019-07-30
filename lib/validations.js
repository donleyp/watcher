function validateEmail(email) {
    return email && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email.trim()) ? email.trim() : false;
}

function validateNonEmpty(value) {
    return value && value.trim().length > 0 ? value.trim() : false;
}

function validateDigits(value) {
    return value && /^\d+/.test(value.trim()) ? value.trim() : false;
}

module.exports = {
    validateEmail,
    validateNonEmpty,
    validateDigits,
};