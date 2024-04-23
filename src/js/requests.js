'use strict';

const methodNames = {
    get: 'GET',
    put: 'PUT',
    post: 'POST',
    delete: 'DELETE'
};

const jsonReqParams = {
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    }
};

/**
 * Checks if response has json content type or not
 * @param {Object} response - response object
 * @return {boolean} - true - if json type, false - otherwise
 */
const isJsonContentType = (response) => {
    const contentType = response.headers.get('Content-Type');
    return contentType ? contentType.indexOf('application/json') !== -1 : false;
};

/**
 * Extracts Json from the response or text in case of an error
 * @param {Object} response - XmlHttpRequest response
 * @returns {Promise} - promise
 */
const extractJsonResponse = (response) => {
    return response.clone().json()
        .catch((e) => {
            console.error(e);
            return response.clone().text();
        });
};

/**
 * Handle errors XmlHttpRequest response
 * @param {Object} response - XmlHttpRequest response
 * @param {String} actionName - action name
 * @returns {* | Object} processed status object
 */
const handleErrors = (response, actionName) => {
    const status = response.status;

    return new Promise((resolve, reject) => {
        if (!response.ok) {
            let errorMessage = `${status} Failed to ${actionName}`;

            if (response.status === 440) {
                // session expired
                reject({
                    errorMessage: `Please login to <a href='${ENVIRONMENT.url}' target='_blank'>Staffing Board</a> and refresh this page to enable the plug-in.`,
                    status,
                    result: false
                });
            } else {
                if (isJsonContentType(response)) {
                    extractJsonResponse(response).then((resError) => {
                        if (resError?.Message) {
                            errorMessage +=  `: "${resError.Message}"`
                        }
                        reject({ errorMessage, status, result: false });
                    });
                } else {
                    reject({ errorMessage, status, result: false });
                }
            }
        } else {
            resolve({ result: true, status: status  });
        }
    });
};

/**
 * Retrieves Json response safely
 * @param {Object} response - XmlHttpRequest response
 * @param {String} actionName - action name
 * @returns {Object} Promise
 */
const safeRetrieveJson = (response, actionName) => {
    return new Promise((resolve, reject) => {
        handleErrors(response, actionName).then(() => {
            (isJsonContentType(response) ? extractJsonResponse(response) : response.clone().text())
                .then(res => {
                    resolve({ result: res, status: response.status });
                });
        }).catch((e) => {
            reject(e);
        });
    });
};

/**
 * Resource URL builder function
 * @param {string} resource - resource name
 * @param {string} id - optional resource id
 * @returns {string} formatted string
 */
const buildURL = (resource, id = '') => {
    const base = '/api/public';

    return id ? `${base}/${resource}/${id}` : `${base}/${resource}`;
};

const buildLinkedinUrl = (profileId, resourceName, addCountParams = true, params) => {
    let urlParams = addCountParams ? { count: 50, start: 0 } : null;
    if (params) {
        urlParams = urlParams ? Object.assign(urlParams, params) : urlParams;
    }
    let urlParamsStr = '';

    if (urlParams) {
        urlParamsStr += '?';
        for (const key in urlParams) {
            if (urlParamsStr.length !== 1) {
                urlParamsStr += "&";
            }

            urlParamsStr += key + '=' + encodeURIComponent(urlParams[key]);
        }
    }

    return `/voyager/api/identity/profiles/${profileId}/${resourceName}${urlParamsStr}`;
};

const createLinkedinRequest = (url, actionName, sessionCookie) => {
    return createRequest({
        url,
        actionName: `get linkedin profile ${actionName}`,
        environment: ENVIRONMENT.linkedin,
        sessionCookie
    });
};

/**
 * Creates request
 * @param {Object} requestParams - request params
 * {String} url - url for request
 * {String} actionName - action name to inform in error about
 * {String} [method] method - ajax call method
 * {Object} [data] data - data to process
 * {String} environment - environment for request
 * {String} sessionCookieName - csrf-token
 * @returns {Object} Promise
 */
const createRequest = (requestParams) => {
    const { url, actionName, method = methodNames.get, data, environment = '', sessionCookie = '' } = requestParams;

    if (data?.linkedinUrl) {
        try {
            // check if url is not already encoded
            if (decodeURI(data.linkedinUrl) === data.linkedinUrl) {
                // save encoded linkedin url
                data.linkedinUrl = encodeURI(data.linkedinUrl);
            }
        } catch (e) {
            console.log(e);
        }
    }
    const applyData = data ? JSON.stringify(data) : null;
    const urlPrefix = environment || ENVIRONMENT.url;
    const applyUrl = urlPrefix + url;
    const reqHeaders = { ...jsonReqParams.headers };

    if (sessionCookie) {
        reqHeaders['csrf-token'] = sessionCookie;
    }

    return fetch(applyUrl, {
        headers: reqHeaders,
        credentials: 'include',
        body: applyData,
        method
    }).then((response) => safeRetrieveJson(response, actionName));
};

const getLinkedinProfileDataRequest = (profileId, sessionCookie, contactInfo = false) => {
    const url = buildLinkedinUrl(profileId, contactInfo ? 'profileContactInfo' : 'profileView', false);

    return createLinkedinRequest(url,contactInfo ? 'contacts' : 'view', sessionCookie);
};

const getLinkedinProfileSkillsRequest = (profileId, sessionCookie) => {
    const url = buildLinkedinUrl(profileId, 'featuredSkills', true,{ includeHiddenEndorsers: true });

    return createLinkedinRequest(url,'skills', sessionCookie);
};

const getLinkedinProfileEducationsRequest = (profileId, sessionCookie) => {
    const url = buildLinkedinUrl(profileId, 'educations');

    return createLinkedinRequest(url,'educations', sessionCookie);
};

const getLinkedinProfileProjectsRequest = (profileId, sessionCookie) => {
    const url = buildLinkedinUrl(profileId, 'projects');

    return createLinkedinRequest(url,'projects', sessionCookie);
};

const getLinkedinProfilePositionsRequest = (profileId, sessionCookie) => {
    const url = buildLinkedinUrl(profileId, 'positions');

    return createLinkedinRequest(url,'positions', sessionCookie);
};

const getLinkedinProfileCertificationsRequest = (profileId, sessionCookie) => {
    const url = buildLinkedinUrl(profileId, 'certifications');

    return createLinkedinRequest(url,'certifications', sessionCookie);
};

const getLinkedinProfileHonorsRequest = (profileId, sessionCookie) => {
    const url = buildLinkedinUrl(profileId, 'honors');

    return createLinkedinRequest(url,'honors', sessionCookie);
};

const getLinkedinProfilePublicationsRequest = (profileId, sessionCookie) => {
    const url = buildLinkedinUrl(profileId, 'publications');

    return createLinkedinRequest(url,'publications', sessionCookie);
};

const getLinkedinProfileCoursesRequest = (profileId, sessionCookie) => {
    const url = buildLinkedinUrl(profileId, 'courses');

    return createLinkedinRequest(url,'courses', sessionCookie);
};

/**
 * Report to ELMAH
 * @param {String} source - from where it appears
 * @param {String} message - report message
 * @returns {Object} Promise
 */
const reportToElmahRequest = (source, message) => {
    const url = '/api/logging/error';
    const version = chrome?.runtime?.getManifest?.()?.version;
    const reportObj = {
        source: `Chrome SB Extension v${version || '--'}: ${source} ---`,
        message: message + ' at ' + windowUrl
    };

    return createRequest({
        url,
        actionName: 'report to ELMAH',
        method: methodNames.post,
        data: reportObj
    });
};

/**
 * Search candidates request
 * @param {Object} data - profile data
 * @returns {Object} Promise
 */
const searchCandidatesRequest = (data) => {
    const url = buildURL('candidates', 'find');

    return createRequest({
        url,
        actionName: 'get candidates',
        method: methodNames.post,
        data
    });
};

/**
 * Search candidates request
 * @param {Object} data - { vacancyId, candidateId }
 * @returns {Object} Promise
 */
const assignToVacancyRequest = (data) => {
    const url = buildURL('applications');

    return createRequest({
        url,
        actionName: 'assign candidate to vacancy (create application)',
        method: methodNames.post,
        data
    });
};

/**
 * Search candidates request
 * @param {String} candidateId - candidate's id
 * @returns {Object} Promise
 */
const assignToMeRequest = (candidateId) => {
    const url = buildURL('candidates', `${candidateId}/assign`);

    return createRequest({
        url,
        actionName: 'assign candidate to user',
        method: methodNames.put,
        data: candidateId
    });
};

/**
 * Search candidates request
 * @param {Object} candidate - candidate's profile data
 * @returns {Object} Promise
 */
const enrichCandidateRequest = (candidate) => {
    const url = buildURL('candidates', `${candidate.id}/enrich`);

    return createRequest({
        url,
        actionName: 'enrich candidate',
        method: methodNames.put,
        data: candidate
    });
};

/**
 * Transliterate candidate name request
 * @param {Object} data - candidate's first and second names
 * @returns {Object} Promise
 */
const transliterateNameRequest = (data) => {
    const url = buildURL('candidates', 'transliterateName');

    return createRequest({
        url,
        method: methodNames.post,
        data,
        actionName: 'transliterate name'
    });
};

/**
 * Get user's active vacancies
 * @returns {Object} Promise
 */
const getVacanciesRequest = () => {
    const url = buildURL('vacancies');

    return createRequest({
        url,
        actionName: 'get vacancies'
    });
};

/**
 * Get available candidate's info sources
 * @returns {Object} Promise
 */
const getCandidateInfoSourcesRequest = () => {
    const url = buildURL('choiceValues/candidates/infoSources');

    return createRequest({
        url,
        actionName: 'get candidate info sources'
    });
};

/**
 * Get available job family groups
 * @returns {Object} Promise
 */
const getJobFamilyGroupsRequest = () => {
    const url = buildURL('choiceValues/jobFamilyGroups');

    return createRequest({
        url,
        actionName: 'get job family groups'
    });
};

/**
 * Get available job profiles
 * @param {number} jobFamilyGroupId - job family group id
 * @param {number} jobFamilyId - job family id
 * @returns {Object} Promise
 */
const getJobProfilesRequest = (jobFamilyGroupId, jobFamilyId) => {
    const url = buildURL(`choiceValues/jobFamilyGroups/${jobFamilyGroupId}/jobFamilies/${jobFamilyId}/jobProfiles`);

    return createRequest({
        url,
        actionName: 'get job family profiles'
    });
};

/**
 * Get available job families
 * @param {number|undefined} jobFamilyGroupId - job family group id
 * @returns {Object} Promise
 */
const getJobFamiliesRequest = (jobFamilyGroupId) => {
    const url =  buildURL(jobFamilyGroupId ? `choiceValues/jobFamilyGroups/${jobFamilyGroupId}/jobFamilies` :
        'choiceValues/jobFamilies');

    return createRequest({
        url,
        actionName: 'get job families'
    });
};

/**
 * Get user's editable collections
 * @returns {Object} Promise
 */
const getEditableCollectionsRequest = () => {
    const url = buildURL('collections', 'editable');

    return createRequest({
        url,
        actionName: 'get editable collections'
    });
};

/**
 * Get user's stages in collection
 * @param {Number} collectionId - collection id
 * @returns {Object} Promise
 */
const getCollectionStagesRequest = (collectionId) => {
    const url = buildURL('collections', `${collectionId}/stages`);

    return createRequest({
        url,
        actionName: 'get collection stages'
    });
};

/**
 * Delete card from collection
 * @param {Number} cardId - card id
 * @param {Number} collectionId - collection id
 * @returns {Object} Promise
 */
const deleteCardFromCollectionRequest = (cardId, collectionId) => {
    const url = buildURL('collections', `${collectionId}/cards/${cardId}`);

    return createRequest({
        url,
        method: methodNames.delete,
        actionName: 'delete card from the collection'
    });
};

/**
 * Move collection card to stage
 * @param {Number} cardId - card id
 * @param {Number} collectionId - collection id
 * @param {Number|Null} stageId - stage id
 * @returns {Object} Promise
 */
const moveCollectionCardToStageRequest = (cardId, collectionId, stageId) => {
    const url = buildURL('collections', `${collectionId}/cards/${cardId}/toStage/${stageId ? stageId : 'all'}`);

    return createRequest({
        url,
        method: methodNames.put,
        actionName: 'move collection card to stage'
    });
};

/**
 * Add candidate to collection
 * @returns {Object} Promise
 */
const addCandidateToCollectionRequest = (candidate, collection, allowSameCards) => {
    const url = buildURL('collections', `${collection.id}/cards${allowSameCards ? '?allowSameCards=true' : ''}`);

    return createRequest({
        url,
        method: methodNames.post,
        data: {
            candidateId: candidate.id
        },
        actionName: 'add candidate to collection'
    });
};

/**
 * Get candidate's last activity
 * @param {Array} candidateIds - array of candidates ids
 * @returns {Object} Promise
 */
const getLastActivityRequest = (candidateIds) => {
    const url = buildURL('candidates', `lastActivities?candidateIds=${candidateIds.join(',')}`);

    return createRequest({
        url,
        actionName: 'get last activity for candidate(s)'
    });
};

/**
 * Add new candidate to db
 * @param {Object} requestData - candidate properties
 * @param {String} sessionCookie - session cookie
 * @returns {Object} Promise
 */
const addNewCandidateRequest = (requestData, sessionCookie) => {
    let moveToStr = '';

    if (requestData.moveToRecruiting) {
        moveToStr += '?moveToRecruiting=true';
    } else {
        // this means "move candidate to Pool"
        moveToStr += '?moveToScreening=false';
    }

    const url = buildURL(`candidates${moveToStr}`);

    return ProfileDataProvider.getFullAdditionalInfo(requestData.profileData, sessionCookie).then((info) => {
        return createRequest({
            url,
            actionName: 'create new candidate in db',
            method: methodNames.post,
            data: {
                ...requestData.profileData,
                ...info
            }
        });
    });
};

/**
 * Unlink candidate
 * @param {Number} candidateId - candidate id
 * @param {String} linkedinUrl - linkedin url
 * @returns {Object} Promise
 */
const unlinkCandidateRequest = (candidateId, linkedinUrl) => {
    const url = buildURL('candidates', `${candidateId}/unlink`);

    return createRequest({
        url,
        actionName: 'unlink candidate',
        method: methodNames.put,
        data: { linkedinUrl }
    });
};

/**
 * Get candidate profiles with the most outdated information
 * @returns {Object} Promise
 */
const getCandidatesWithMostOutdatedInfoRequest = () => {
    const url = buildURL('candidates', `linkedInProfilesToUpdate`);

    return createRequest({
        url,
        actionName: 'get candidates LI profiles to update',
        method: methodNames.get
    });
};
