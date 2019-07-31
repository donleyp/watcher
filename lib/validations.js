function validateEmail(email) {
    email = email && email.trim();
    return email && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email) ? email : false;
}

function validateNonEmpty(value) {
    value = value && value.trim();
    return value && value.length > 0 ? value : false;
}

function validateDigits(value, len) {
    value = value && value.trim();
    return value && /^\d+/.test(value) && (len ? value.length == len : true) ? value : false;
}

module.exports = {
    validateEmail,
    validateNonEmpty,
    validateDigits,
};