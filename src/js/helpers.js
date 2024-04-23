'use strict';

/* global infoFormatting:true */
/* global linkedinProfileRegEx:true */

// Calendar month names
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const HOURS_IN_ONE_YEAR = 8760;

/* exported formatDate */
/**
 * Human-friendly short date formatting function.
 * @param {String} dateString - a string that contains date in some format.
 * @param {boolean} withTime - with time or without
 * @returns {String} a human-readable relative date format.
 */
const formatDate = (dateString, withTime = false) => {
    let result;

    if (!dateString || !Date.parse(dateString)) {
        result = infoFormatting.n_a;
    } else {
        const date = new Date(dateString);
        let strTime = '';
        if (withTime) {
            let hours = date.getHours();
            let minutes = date.getMinutes();
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0'+minutes : minutes;
            strTime = hours + ':' + minutes;
        }

        result = date.getDate() + '-' + MONTHS[date.getMonth()] + '-' + date.getFullYear() + (strTime && ` ${strTime}`);
    }

    return result;
};

/**
* Gets difference date value and unit
* @param {Number} diffDays - difference in days
* @param {Number} diffSec - difference in days
* @param {Boolean} isHoursSkipped - a boolean that represents if formatting should skip hours and show days instead
* @returns {Object} object in format {value: ..., units: ...}
*/
const getDiffDateValues = (diffDays, diffSec, isHoursSkipped) => {
    let value = 0;
    let units;

    // figuring out the scale and the value.
    if (diffDays > 0) {
        // currently we decided to prioritize days over hours/seconds/minutes, if there is a date change.
        if (diffDays < 14) {
            value = Math.floor(diffDays);
            units = 'day';
        } else if (diffDays < 30) {
            value = Math.floor(diffDays / 7);
            units = 'week';
        } else if (diffDays < 365) {
            value = Math.floor(diffDays / 30);
            units = 'month';
        } else {
            value = Math.floor(diffDays / 365);
            units = 'year';
        }

    } else if (!isHoursSkipped) {
        if (diffSec < 60) {
            value = 'a few';
            units = 'sec.';
        } else if (diffSec < 60 * 60) {
            value = Math.floor(diffSec / 60);
            units = 'min.';
        } else { // if (diffSec < (60 * 60 * 24))
            value = Math.floor(diffSec / (60 * 60));
            units = 'hour';
        }

    } else {
        units = 'today';
    }

    return { value, units };
};

/**
 * Checks if value is date
 * @param {*} value - value to check
 * @return {boolean} - true if value is a correct date, false - otherwise
 */
const isDate = (value) => {
    return Object.prototype.toString.call(value) === "[object Date]";
}

/**
 * Human-friendly date formatting function.
 * @param {String} dateString - a string that contains date in some format.
 * @param {Boolean} isHoursSkipped - a boolean that represents if formatting should skip hours and show days instead
 * @param {Boolean} isShortDateFormat - a boolean that represents if to use short date format (e.g. 2 years ago --> 2y ago)
 * @returns {String} a human-readable relative date format.
 */
 const formatDateRelatively = (dateString, isHoursSkipped = false, isShortDateFormat = false) => {
    if (!dateString) {
        return infoFormatting.n_a;
    }

    const date = new Date(dateString);
    const now = new Date();

    if (!isDate(date)) {
        return infoFormatting.n_a;
    }

    // getting exact action and now date to measure short intervals.
    const dateTime = date.getTime();
    const nowTime = now.getTime();

    // getting action and today's date to measure longer than day intervals.
    const dateDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // determining the actual difference between timestamps in seconds.
    const isFuture = nowTime < dateTime;
    const diffSec = Math.abs(nowTime - dateTime) / 1000;

    // calculating the difference between days of timestamps in days.
    const diffDays = Math.floor(Math.abs(nowDate - dateDate) / (1000 * 60 * 60 * 24));
    let { value, units } = getDiffDateValues(diffDays, diffSec, isHoursSkipped);

    if (units === 'today') {
        return units;
    }
    if (value === 1 && units === 'day') {
        return isFuture ? 'tomorrow' : 'yesterday';
    }
    // fixing scale formatting
    if (value === 1 && !isShortDateFormat) {
        value = units === 'hour' ? 'an' : 'a';
    } else if (['sec.', 'today', 'min.'].indexOf(units) === -1) {
        if (isShortDateFormat) {
            return `${value}${units.charAt(0)} ago`;
        }
        units += 's';
    }

    return `${value} ${units} ago`;
};

/* exported getCookie */
/**
 * Get cookie value by name
 * @param {String} cname - cookie name
 * @return {String} cookie value
 */
const getCookie = (cname) => {
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    let name = cname + '=';
    let result = '';

    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        // remove empty space from the beginning of the string
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }

        if (c.indexOf(name) === 0) {
            let cookieValue = c.substring(name.length, c.length);
            // remove double quotes if any
            if (cookieValue[0] === '"') {
                cookieValue = cookieValue.slice(1);
            }

            if (cookieValue[cookieValue.length - 1] === '"') {
                cookieValue = cookieValue.slice(0, -1);
            }

            result = cookieValue;
            break;
        }
    }

    return result;
};

/* exported parseLinkedinUrl */
/**
 * Parse window url to match a pattern
 * @param {String} url - url
 * @returns {string} empty or found url match
 */
const parseLinkedinProfileUrl = (url) => {
    if (!url) {
        return '';
    }
    // keep only part with "https://www.linkedin.com/in/person-example-12345/"
    const foundProfileMatch = decodeURIComponent(url).match(linkedinProfileRegEx);
    let result = '';

    if (foundProfileMatch) {
        result = foundProfileMatch[0];
        if (result[result.length - 1] !== '/') {
            result = `${result}/`;
        }
    }

    return result;
};

/* exported parseLinkedinRecruiterProfileUrl */
/**
 * Parse window url to match a pattern
 * @param {String} url - url path
 * @returns {string} empty or found url match
 */
const parseLinkedinRecruiterProfileUrl = (url) => {
    let result = '';
    if (!url) {
        return result;
    }
    const foundProfileMatch = decodeURIComponent(url).match(linkedinRecruiterProfileRegEx);

    if (foundProfileMatch) {
        result = foundProfileMatch[0];
    }

    return result;
};

/* exported getCorrectProfileLink */
/**
 * Get correct profile link depending on if it starts with "http"
 * @param {String} url - url
 * @returns {string} modified url
 */
const getCorrectProfileLink = (url) => {
    if (!url) {
        return '';
    }

    const possibleUrlPrefix = 'http';
    const necessaryUrlPrefix = 'https://';
    const resultUrl = url.indexOf(possibleUrlPrefix) === 0 ? url : necessaryUrlPrefix + url

    return decodeURI(resultUrl);
};

/**
 * Parses profile url to get a profile id
 * @param {string} profileUrl - linkedin profile url
 * @returns {string} profile id string
 */
const getProfileId = (profileUrl) => {
    // keep only part "person-example-12345/" from "https://www.linkedin.com/in/person-example-12345/"
    return profileUrl.replace(ENVIRONMENT.linkedin + '/in/', '').slice(0, -1);
};

/**
 * Gets profile id from the linkedin url in all formats.
 * @param {string} profileUrl - linkedin url
 * @returns {string} profile id string or '' in case when the url is not correct
 */
const getProfileIdFromUrl = (profileUrl) => {
    if (!profileUrl) {
        return '';
    }
    let result =  profileUrl?.split('/in/')[1];
    if (!result) {
        return '';
    }
    const endIndex = result?.indexOf('/');
    if (endIndex > 0) {
        result = result.substring(0, endIndex);
    }

    return result;
};

/* exported isEmpty */
/**
 * Checks if value is empty
 * @param {*} value - the value to check
 * @returns {Boolean} - result
 */
const isEmpty = (value) => {
    return value === undefined || value === null || value === '';
}

/* exported isObject */
/**
 * Checks if value is an Object
 * @param {*} value - the value to check
 * @returns {Boolean} - result
 */
const isObject = (value) => {
    return typeof value === 'object';
}

/* exported assignProperty */
/**
 * Assigns new property to object if value is not empty
 * @param {Object} obj - object for assigning
 * @param {String} propName - object property name
 * @param {*} value - object property value
 * @param {Function|undefined} valueParser - value prop parser
 * @param {String|null} valuePropName - value prop name in case when value is array of objects
 * @param {Boolean} isArray - should be value converted to an array or not
 * @returns {void}
 */
const assignProperty = (obj, propName, value, valueParser= null, valuePropName = null, isArray = false) => {
    if (isEmpty(value)) {
        return;
    }
    if (Array.isArray(value)) {
        if (value.length) {
            let resValue;
            // get all not empty values from array
            value.map((el) => {
                let elValue = valuePropName ? el[valuePropName] : el;
                elValue = valueParser && !isEmpty(elValue) ? valueParser(elValue) : elValue;
                if (isEmpty(elValue)) {
                    return;
                }
                if (!resValue) {
                    resValue = [elValue];
                } else if (resValue.indexOf(elValue) === -1) { // do not allow duplicates
                    resValue.push(elValue);
                }
            });
            if (resValue) {
                obj[propName] = resValue;
            }
        }
    } else {
        obj[propName] = isArray ? [value] : value;
    }
}

/* exported isLinkedinPageCurrentlyOpened */
/**
 * Checks if linkedinUrl is currently opened
 * @param {string} linkedinUrl - linkedin URL to check
 * @returns {Boolean} - result
 */
const isLinkedinPageCurrentlyOpened = (linkedinUrl) => {
    if (linkedinUrl) {
        return decodeURI(window.location.href).startsWith(decodeURI(linkedinUrl));
    }
    return false;
}

/* exported addCandidateSuccessfulSyncFlag */
/**
 * Adds `isLastSyncSuccessful` flag to the candidate information object
 * @param {Object} candidateData - candidate data
 * @param {boolean} isSuccessful - is successful flag
 * @returns {Object} - updated candidate data
 */
const addCandidateSuccessfulSyncFlag = (candidateData, isSuccessful) => {
    if (isObject(candidateData)) {
        candidateData[profileFieldNames.isLastSyncSuccessful] = isSuccessful;
    }
    return candidateData;
}

/* exported isCandidateLastSyncSuccessful */
/**
 * Checks `isLastSyncSuccessful` flag in the candidate information object
 * @param {Object} candidateData - candidate data
 * @returns {boolean} - is last sync successful status
 */
const isCandidateLastSyncSuccessful = (candidateData) => {
    if (isObject(candidateData)) {
        return candidateData[profileFieldNames.isLastSyncSuccessful];
    }
    return false;
};

/**
 * Sets cookie
 * @param {string} cookieName - cookie name
 * @param {*} value - cookie value
 * @param {number} hoursNum - duration hours
 * @returns {void}
 */
const setCookie = (cookieName, value, hoursNum = HOURS_IN_ONE_YEAR) => {
    const date = new Date();
    let result = `${cookieName}=${value}; path=/`;

    if (hoursNum > 0) {
        date.setTime(date.getTime() + (hoursNum * 60 * 60 * 1000));
        result = `${result}; expires=${date.toUTCString()}`;
    }

    document.cookie = result;
};
