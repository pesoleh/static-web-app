'use strict';

/* global Dom:true */
/* global comparisonTypes:true */

/**
 * Parse text and check for matches
 * @param {String} type - type of field to parse
 * @param {String} text - text to parse
 * @returns {String|Boolean} - result
 */
const getParsedValue = (type, text) => {
    let result = '';
    // for connectionDegree we should return boolean, therefore must process it
    if (text || type === comparisonTypes.connectionDegree) {
        switch (type) {
            case comparisonTypes.linkedinId: {
                if (!result) {
                    const searchQuery = 'urn:li:fs_profile:';
                    // assuming searchQuery is placed in front of text
                    result = text.replace(searchQuery, '');
                }

                break;
            }
            case comparisonTypes.phone: {
                // 1) get non alphabetic symbols, in order to remove words
                const phoneNumberRegEx = /[+]?[(0-9)\-\s.]+\b/;
                const phoneNumberMatch = text.match(phoneNumberRegEx);

                if (phoneNumberMatch && phoneNumberMatch.length && phoneNumberMatch[0]) {
                    // 2) get only numbers and join them into single string
                    const onlyNumbersRegEx = /[0-9]+/g;
                    const numbersList = phoneNumberMatch[0].match(onlyNumbersRegEx);

                    if (numbersList && numbersList.length) {
                        result = numbersList.join('');
                    } else {
                        result = phoneNumberMatch[0];
                    }
                } else {
                    result = text;
                }

                break;
            }
            case comparisonTypes.connectionDegree: {
                if (text.length) {
                    // it is "true" if element text has "1st" connection in it (or something similar in other language)
                    result = text.indexOf('1') !== -1;
                } else {
                    result = false;
                }

                break;
            }
            default: {
                break;
            }
        }
    }

    return result;
};

/**
 * Gets project or publication member full name
 * @param {Object} memberInfo - member data
 * @returns {String} - member full name
 */
const getMemberName = (memberInfo) => {
    const member = memberInfo.member ? memberInfo.member : memberInfo;
    if (member.firstName && member.lastName) {
        return `${member.firstName} ${member.lastName}`;
    }
    return member.name || '';
}

/**
 * Gets main info from profile data
 * @param {Object} data - profile data
 * @returns {Object} - collected profile information
 */
const getMainInfo = (data) => {
    const profileInfo = {};
    const picturePath = 'com.linkedin.common.VectorImage';

    if (data) {
        const { firstName, lastName, headline, miniProfile = {}, locationName,
            entityUrn, industryName, summary } = data;
        assignProperty(profileInfo, profileFieldNames.linkedinId, getParsedValue(profileFieldNames.linkedinId, entityUrn));
        assignProperty(profileInfo, profileFieldNames.firstName, firstName);
        assignProperty(profileInfo, profileFieldNames.lastName, lastName);
        assignProperty(profileInfo, profileFieldNames.summary, summary);
        assignProperty(profileInfo, profileFieldNames.position, headline);
        assignProperty(profileInfo, profileFieldNames.location, locationName);
        assignProperty(profileInfo, profileFieldNames.industry, industryName);
        assignProperty(profileInfo, profileFieldNames.publicIdentifier, miniProfile.publicIdentifier);
        profileInfo[profileFieldNames.firstNameNative] = '';
        profileInfo[profileFieldNames.lastNameNative] = '';
        profileInfo[profileFieldNames.photoUrl] = null;

        if (miniProfile.picture && miniProfile.picture[picturePath] &&
            miniProfile.picture[picturePath].artifacts.length) {
            let miniProfilePictureSuffix = miniProfile.picture[picturePath];
            // get path for the biggest profile photo
            assignProperty(profileInfo, profileFieldNames.photoUrl, miniProfilePictureSuffix.rootUrl +
                miniProfilePictureSuffix.artifacts[miniProfilePictureSuffix.artifacts.length - 1].fileIdentifyingUrlPathSegment);
        }
    }
    return addCandidateSuccessfulSyncFlag(profileInfo, true);
}

/**
 * Gets contact info from data
 * @param {Object} data - contact data
 * @returns {Object} - collected contact information
 */
const getContactInfo = (data) => {
    const contactInfo = {};
    const { emailAddress, phoneNumbers, ims, twitterHandles, websites } = data;

    assignProperty(contactInfo, profileFieldNames.emails, emailAddress, null, null, true);
    assignProperty(contactInfo, profileFieldNames.phones, phoneNumbers, ProfileDataProvider.getPhone, 'number', true);
    assignProperty(contactInfo, profileFieldNames.twitters, twitterHandles, null, 'name', true);
    assignProperty(contactInfo, profileFieldNames.websites, websites, null, 'url', true);

    if (ims && ims.length) {
        const skypeContacts = [];
        for (let i = 0; i < ims.length; i++) {
            if (ims[i].provider === linkedinFields.skype && skypeContacts.indexOf(ims[i].id) === -1) {
                skypeContacts.push(ims[i].id);
            }
        }
        if (skypeContacts.length) {
            assignProperty(contactInfo, profileFieldNames.skypes, skypeContacts);
        }
    }

    return contactInfo;
}

/**
 * Gets education info from education data
 * @param {Object} data - education data
 * @returns {Object} - collected education information
 */
const getEducationInfo = (data) => {
    if (data && data.paging && data.paging.total > data.paging.count) {
        // should be loaded separately later if needed
        return null;
    }

    if (data && data.elements && data.elements.length) {
        return data.elements.map((el) => {
            return {
                institution: el.schoolName,
                major: el.fieldOfStudy,
                degree: el.degreeName,
                grade: el.grade,
                activities: el.activities,
                startYear: el.timePeriod?.startDate?.year,
                endYear: el.timePeriod?.endDate?.year
            }
        });

    }

    return [];
}

/**
 * Gets language info from language data
 * @param {Object} data - language data
 * @returns {Object} - collected language information
 */
const getLanguageInfo = (data) => {
    if (data && data.paging && data.paging.total > data.paging.count) {
        // should be loaded separately later if needed
        return null;
    }

    if (data && data.elements && data.elements.length) {
        return data.elements.map((el) => ({
            name: el.name,
            level: el.proficiency
        }));
    }

    return [];
}

/**
 * Gets skills info from skills data
 * @param {Object} data - skills data
 * @returns {Object} - collected skills information
 */
const getSkillsInfo = (data) => {
    if (data && data.elements && data.elements.length) {
        return data.elements.map((el) => ({
            name: el.skill && el.skill.name,
            endorsersCount: el.endorsementCount
        }));
    }

    return [];
}

/**
 * Gets projects info from projects data
 * @param {Object} data - projects data
 * @returns {Object} - collected projects information
 */
const getProjectsInfo = (data) => {
    if (data && data.elements && data.elements.length) {
        return data.elements.map((el) => ({
            name: el.title,
            description: el.description,
            url: el.url,
            contributors: el.members ? el.members.map(getMemberName) : [],
            startDate: el.timePeriod?.startDate,
            endDate: el.timePeriod?.endDate
        }));
    }

    return [];
}

/**
 * Gets jobs info from jobs data
 * @param {Object} data - jobs data
 * @returns {Object} - collected jobs information
 */
const getJobsInfo = (data) => {
    if (data && data.elements && data.elements.length) {
        return data.elements.map((el) => ({
            position: el.title,
            description: el.description,
            company: el.companyName,
            location: el.locationName,
            startDate: el.timePeriod?.startDate,
            endDate: el.timePeriod?.endDate
        }));
    }

    return [];
}

/**
 * Gets certificates info from certificates data
 * @param {Object} data - certificates data
 * @returns {Object} - collected certificates information
 */
const getCertificatesInfo = (data) => {
    if (data && data.elements && data.elements.length) {
        return data.elements.map((el) => ({
            vendor: el.authority,
            name: el.name,
            displaySource: el.displaySource,
            licenseNumber: el.licenseNumber,
            url: el.url,
            startDate: el.timePeriod?.startDate,
            endDate: el.timePeriod?.endDate
        }));
    }

    return [];
}

/**
 * Gets honors info from honors data
 * @param {Object} data - honors data
 * @returns {Object} - collected honors information
 */
const getHonorsInfo = (data) => {
    if (data && data.elements && data.elements.length) {
        return data.elements.map((el) => ({
            title: el.title,
            issuer: el.issuer,
            description: el.description,
            year: el.issueDate ? el.issueDate.year : ''
        }));
    }

    return [];
}

/**
 * Gets publications info from publications data
 * @param {Object} data - publications data
 * @returns {Object} - collected publications information
 */
const getPublicationsInfo = (data) => {
    if (data && data.elements && data.elements.length) {
        return data.elements.map((el) => {
            return {
                name: el.name,
                publisher: el.publisher,
                description: el.description,
                url: el.url,
                authors: el.authors ? el.authors.map(getMemberName) : [],
                publishedOn: el.date
            }
        });
    }

    return [];
}

/**
 * Gets courses info from courses data
 * @param {Object} data - courses data
 * @returns {Object} - collected courses information
 */
const getCoursesInfo = (data) => {
    if (data && data.elements && data.elements.length) {
        return data.elements.map(el => el.name);
    }

    return [];
}

/**
 * Gets full additional profile info
 * @param {Object} profileData - profile data
 * @param {String} sessionCookie - session cookie
 * @returns {Object} - collected language information
 */
const getFullAdditionalInfo = (profileData, sessionCookie) => {
    const linkedinId = profileData[profileFieldNames.publicIdentifier];
    const promises = [];
    const additionalInfo = {};

    if (!profileData[profileFieldNames.educations]) {
        promises.push(getLinkedinProfileEducationsRequest(linkedinId, sessionCookie).then((data) => {
            additionalInfo[profileFieldNames.educations] = getEducationInfo(data.result);
        }));
    }
    promises.push(
        promises.push(getLinkedinProfileSkillsRequest(linkedinId, sessionCookie).then((data) => {
            additionalInfo[profileFieldNames.skills] = getSkillsInfo(data.result);
        })),
        getLinkedinProfileProjectsRequest(linkedinId, sessionCookie).then((data) => {
            additionalInfo[profileFieldNames.projects] = getProjectsInfo(data.result);
        }),
        getLinkedinProfilePositionsRequest(linkedinId, sessionCookie).then((data) => {
            additionalInfo[profileFieldNames.jobs] = getJobsInfo(data.result);
        }),
        getLinkedinProfileCertificationsRequest(linkedinId, sessionCookie).then((data) => {
            additionalInfo[profileFieldNames.certificates] = getCertificatesInfo(data.result);
        }),
        getLinkedinProfileHonorsRequest(linkedinId, sessionCookie).then((data) => {
            additionalInfo[profileFieldNames.honors] = getHonorsInfo(data.result);
        }),
        getLinkedinProfilePublicationsRequest(linkedinId, sessionCookie).then((data) => {
            additionalInfo[profileFieldNames.publications] = getPublicationsInfo(data.result);
        }),
        getLinkedinProfileCoursesRequest(linkedinId, sessionCookie).then((data) => {
            additionalInfo[profileFieldNames.courses] = getCoursesInfo(data.result);
        })
    );

    return Promise.allSettled(promises).then(() => {
        return additionalInfo;
    });
}

/* exported ProfileDataProvider */
// Service which provides profile data
const ProfileDataProvider = (() => {
    return {
        getMainInfo,
        getContactInfo,
        getEducationInfo,
        getLanguageInfo,
        getSkillsInfo,
        getFullAdditionalInfo,
        getPhone: phone => getParsedValue(comparisonTypes.phone, phone),
        getConnectionDegree: connectionDegree => getParsedValue(comparisonTypes.connectionDegree, connectionDegree)
    };
})();
