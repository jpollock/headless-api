

/**
 * Compares two date strings and returns true if the first date is after the second.
 * @param {string} date1 - First date string
 * @param {string} date2 - Second date string
 * @returns {boolean} True if date1 is after date2, false otherwise
 */
export function isDateAfter(date1, date2) {
    return parseCustomDate(date1) > parseCustomDate(date2);
}

export function parseCustomDate(dateString) {
    if (!dateString) {
        return new Date(0); // Return epoch time if dateString is undefined or empty
    }

    // Check if the date is in ISO format
    if (dateString.includes('T')) {
        return new Date(dateString);
    }

    const [datePart, timePart, timezone] = dateString.split(' ');
    if (!datePart || !timePart) {
        console.error('Invalid date string format:', dateString);
        return new Date(0);
    }

    const [year, month, day] = datePart.split('-');
    let [time, ampm] = timePart.split(/(?=[ap]m)/i);
    let [hours, minutes] = time.split(':');

    // Convert to 24-hour format
    if (ampm.toLowerCase() === 'pm' && hours !== '12') {
        hours = String(Number(hours) + 12);
    } else if (ampm.toLowerCase() === 'am' && hours === '12') {
        hours = '00';
    }

    // Construct ISO 8601 format
    const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes}:00Z`;
    return new Date(isoString);
}

export function formatCustomDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('Invalid date object:', date);
        return '';
    }

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    let hours = date.getUTCHours();
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    let ampm = 'am';

    if (hours >= 12) {
        ampm = 'pm';
        if (hours > 12) hours -= 12;
    } else if (hours === 0) {
        hours = 12;
    }

    return `${year}-${month}-${day} ${hours}:${minutes}${ampm} GMT`;
}

/**
 * Gets the current date and time in the custom string format.
 * @returns {string} Current date and time in custom format
 */
export function getCurrentCustomDate() {
    return formatCustomDate(new Date());
}