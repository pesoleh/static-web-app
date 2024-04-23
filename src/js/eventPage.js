'use strict';

importScripts('./helpers.js', './config.js', './requests.js', './envConfig.js', './ProfileDataProvider.js', './dictionariesProvider.js')

/* global chrome:true */
/* global MSG:true */
/* global searchCandidatesRequest:true */
/* global addNewCandidateRequest:true */
/* global assignToVacancyRequest:true */
/* global assignToMeRequest:true */
/* global updateCandidateRequest:true */
/* global unlinkCandidateRequest:true */
/* global getVacanciesRequest:true */
/* global getLastActivityRequest:true */
/* global reportToElmahRequest:true */
/* global unlinkCandidateRequest:true */
/* global getLinkedinProfileDataRequest:true */
/* global parseLinkedinUrl:true */

const sbEnvironmentsList = chrome.runtime.getManifest().externally_connectable.matches;
const linkedinUrlPref = 'https://www.linkedin.com/';
// map for each tab with profileUrl
let tabs = {};
/* exported windowUrl */
// use for reporting an error with url
let windowUrl = '';

/**
 * Handle response from context script
 * @param {number} tabId - tab id
 * @param {object} response - response
 * @returns {void}
 */
const processContextResponse = (tabId, response) => {
    // if user is not logged in to LinkedIn - show warning icon and popover
    if (response && response.actionName === MSG.notLoggedIn) {
        chrome.action.setIcon({
            tabId: tabId,
            path: '../icons/warning16.png'
        });
        chrome.action.setTitle({
            tabId: tabId,
            title: 'Warning: Login to LinkedIn'
        });
        chrome.action.setPopup({
            tabId: tabId,
            popup: '../popup.html'
        });
    }
};

/**
 * Send message to content script
 * @param {Number} tabId - tab id
 * @param {Object} message - JSON-like message
 * @param {Function} [response] response - synchronous callback
 * @returns {void}
 */
const sendEventMessage = (tabId, message, response) => {
    chrome.tabs.sendMessage(tabId, message, null, response);
};

/**
 * Handler for retrieving tab information by tab id
 * @param {Number} tabId - tab id
 * @param {Function} resolve - promise resolve function
 * @param {Number} count - counter for tries
 * @returns {void}
 */
const getActiveTabHandler = (tabId, resolve, count) => {
    if (count > 10) {
        throw new Error('Failed to get tab information');
        return;
    }
    chrome.tabs.get(tabId, tab => {
        if (!tab) {
            setTimeout(() => getActiveTabHandler(tabId, resolve, count + 1), 100);
        } else {
            resolve(tab);
        }
    });
}

/**
 * Gets tab information promise
 * @param {Number} tabId - tab id
 * @returns {Promise<Object>} - tab information object
 */
const getActiveTab = (tabId) => {
    return new Promise((resolve) => {
        getActiveTabHandler(tabId, resolve, 0);
    });
}

/**
 * Sends page event message
 * @param {Object} tab - tab information
 * @param {Object} message - message information
 * @param {string} prevLinkedinUrl - previous linkedin url
 * @returns {void}
 */
const sendPageEventMessage = (tab, message, prevLinkedinUrl) => {
    sendEventMessage(
        tab.id,
        {
            ...message,
            linkedinUrl: tab.url,
            prevLinkedinUrl
        },
        response => processContextResponse(tab.id, response)
    );
}

/**
 * Checks current page and performs some actions on it if needed
 * @param {Object} tab - browser tab information
 * @return {void}
 */
const checkPageAndPerformActions = (tab, prevLinkedinUrl) => {
    const parsedLinkedinProfileUrl = parseLinkedinProfileUrl(tab.url);
    const parsedLinkedinRecruiterProfileUrl = parseLinkedinRecruiterProfileUrl(tab.url);
    const decodedUrl = decodeURIComponent(tab.url);

    // is profile page
    if (parsedLinkedinProfileUrl && decodedUrl.startsWith(parsedLinkedinProfileUrl) &&
        (!decodedUrl[parsedLinkedinProfileUrl.length] || decodedUrl[parsedLinkedinProfileUrl.length] === '?')) {
        sendPageEventMessage(tab, {
            actionName: MSG.profileFound,
            profileUrl: parsedLinkedinProfileUrl
        }, prevLinkedinUrl);
        tabs[tab.id] = parsedLinkedinProfileUrl;
    } else if (decodedUrl.match(linkedinSearchPeoplePageRegEx)) {
        sendPageEventMessage(tab, { actionName: MSG.searchPeoplePageFound }, prevLinkedinUrl);
    } else if (parsedLinkedinRecruiterProfileUrl && decodedUrl.startsWith(parsedLinkedinRecruiterProfileUrl)) {
        sendPageEventMessage(tab, {
            actionName: MSG.profileFound,
            isRecruiterPage: true
        }, prevLinkedinUrl);
        tabs[tab.id] = parsedLinkedinProfileUrl;
    }
}

/**
 * Listen to "onActivated" event when other tab is selected
 */
chrome.tabs.onActivated.addListener(activeInfo => {
    const tabId = activeInfo.tabId;

    getActiveTab(tabId).then(tab => {
        checkPageAndPerformActions(tab);
    });
});

/**
 * Listen to onUpdate event from context script
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const { status } = changeInfo;
    const decodedUrl = decodeURIComponent(tab.url);
    // make extension button greyed out
    chrome.action.disable();

    if (decodedUrl.indexOf(linkedinUrlPref) !== -1 && status && tab.active) {
        // const parsedLinkedinUrl = parseLinkedinProfileUrl(tab.url);
        const prevLinkedinUrl = tabs[tabId] || '';

        const eventStatusComplete = 'complete';
        // highlight extension button for every matching tab
        chrome.action.enable(tabId);

        if (status === eventStatusComplete) {
            checkPageAndPerformActions(tab, prevLinkedinUrl);
        }
    }
});

/**
 * Handles API errors
 * @param {Object} response - api response information
 * @return {void}
 */
const handleApiError = (response) => {
    if (response.status >= 400 && response.status !== 440) {
        // Report to Elmah about all 400+ status requests (except 440).
        reportToElmahRequest('', `Status ${response.status}, ${response.errorMessage}`);
    }
}

/**
 * Handles enrich candidate request
 * @param {Object} candidate - main candidate information
 * @param {string} sessionCookie - session cookie
 * @return {Promise<unknown>} - api promise
 */
const enrichCandidateHandler = (candidate, sessionCookie) => {
    const candidateInfoToEnrich = {};
    // get only needed information for enrich
    enrichCandidateFields.forEach(fieldName => {
        if (candidate[fieldName] !== undefined) {
            candidateInfoToEnrich[fieldName] = candidate[fieldName];
        }
    });
    // handle cases when profile URL ends with an id, but not with a public identifier
    if (candidate[profileFieldNames.linkedinUrl].indexOf(candidate[profileFieldNames.publicIdentifier]) === -1) {
        candidateInfoToEnrich[profileFieldNames.linkedinUrl] = candidateInfoToEnrich[profileFieldNames.linkedinUrl]
            .replace(candidate[profileFieldNames.linkedinId], candidate[profileFieldNames.publicIdentifier]);
    }
    // retrieve additional information if we have retrieved main profile data before
    if (isCandidateLastSyncSuccessful(candidateInfoToEnrich)) {
        return ProfileDataProvider.getFullAdditionalInfo(candidateInfoToEnrich, sessionCookie).then((info) => {
            return enrichCandidateRequest({ ...candidateInfoToEnrich, ...info });
        });
    }
    // enrich candidate by flag 'isLastSyncSuccessful', which means that we were not able to get an information
    return enrichCandidateRequest(candidateInfoToEnrich);
}

/**
 * Enrich candidate after searching if the candidate is perfect match and `linkedinInfoUpdateRequired` flag is true
 * @param {Object} searchResponse - search candidate response
 * @param {Object} candidateData - candidate information
 * @param {string} sessionCookie - session cookie
 * @return {void}
 */
const enrichCandidateInformationAfterSearchIfNeeded = (searchResponse, candidateData, sessionCookie) => {
    // Enrich found perfect match in DB immediately.
    if (searchResponse.result?.length === 1 && searchResponse.result[0].isPerfectMatch) {
        const matchedCandidate = searchResponse.result[0];
        // we do not need to enrich here candidates if 'linkedinInfoUpdateRequired' is 'false' or
        // 'publicIdentifier' is not defined (search people page for ex.).
        if (!matchedCandidate.linkedinInfoUpdateRequired || !candidateData[profileFieldNames.publicIdentifier]) {
            return;
        }

        const candidate = { ...candidateData, id: matchedCandidate.id };
        enrichCandidateHandler(candidate, sessionCookie);
    }
}

/**
 * Listen to messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const resHandler = (response) => {
        if (!message.doNotLogError) {
            handleApiError(response);
        }
        return sendResponse(response);
    };
    let handlerFn = null;
    windowUrl = message.windowUrl;

    switch (message.actionName) {
        case MSG.searchCandidates: {
            handlerFn = () => searchCandidatesRequest(message.data).then(response => {
                enrichCandidateInformationAfterSearchIfNeeded(response, message.data, message.sessionCookie);
                return response;
            });
            break;
        }
        case MSG.addNewCandidate: {
            handlerFn = () => addNewCandidateRequest(message.data, message.sessionCookie);
            break;
        }
        case MSG.getCandidatesWithOutdatedInfo: {
            handlerFn = () => getCandidatesWithMostOutdatedInfoRequest();
            break;
        }
        case MSG.assignToVacancy: {
            handlerFn = () => assignToVacancyRequest(message.data);
            break;
        }
        case MSG.assignToMe: {
            handlerFn = () => assignToMeRequest(message.data);
            break;
        }
        case MSG.enrichCandidate: {
            handlerFn = () => enrichCandidateHandler(message.data, message.sessionCookie);
            break;
        }
        case MSG.transliterateName: {
            handlerFn = () => transliterateNameRequest(message.data);
            break;
        }
        case MSG.getVacancies: {
            handlerFn = () => getVacanciesRequest();
            break;
        }
        case MSG.getEditableCollections: {
            handlerFn = () => getEditableCollectionsRequest();
            break;
        }
        case MSG.getInfoSources: {
            handlerFn = () => dictionariesProvider.infoSources();
            break;
        }
        case MSG.getJobFamilyGroups: {
            handlerFn = () => dictionariesProvider.jobFamilyGroups();
            break;
        }
        case MSG.getJobFamilies: {
            handlerFn = () => dictionariesProvider.jobFamilies(message.data.jobFamilyGroupId);
            break;
        }
        case MSG.getJobProfiles: {
            handlerFn = () => dictionariesProvider.getJobProfiles(message.data.jobFamilyGroupId, message.data.jobFamilyId);
            break;
        }
        case MSG.getCollectionStages: {
            handlerFn = () => getCollectionStagesRequest(message.data.collectionId);
            break;
        }
        case MSG.deleteCollectionCard: {
            handlerFn = () => deleteCardFromCollectionRequest(message.data.cardId, message.data.collectionId);
            break;
        }
        case MSG.moveCollectionCardToStage: {
            handlerFn = () => moveCollectionCardToStageRequest(message.data.cardId, message.data.collectionId, message.data.stageId);
            break;
        }
        case MSG.addCandidateToCollection: {
            handlerFn = () => addCandidateToCollectionRequest(message.data.candidate, message.data.collection, message.data.allowSameCards);
            break;
        }
        case MSG.getLastActivity: {
            handlerFn = () => getLastActivityRequest(message.data);
            break;
        }
        case MSG.unlink: {
            handlerFn = () => unlinkCandidateRequest(message.data.id, message.data.linkedinUrl);
            break;
        }
        case MSG.getLinkedinPrimaryInfo: {
            handlerFn = () => getLinkedinProfileDataRequest(message.data, message.sessionCookie);
            break;
        }
        case MSG.getLinkedinProfileContactInfo: {
            handlerFn = () => getLinkedinProfileDataRequest(message.data, message.sessionCookie, true);
            break;
        }
        case MSG.reportError: {
            reportToElmahRequest(message.data.source, message.data.message);
            break;
        }
        default:
            break;
    }

    if (handlerFn) {
        // apply selected function and process response
        handlerFn().then(resHandler).catch(resHandler);
    }

    // return true to keep channel open for further responses
    return true;
});

/**
 * Listen to external messages from outer websites
 */
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    const isMatchEnvironment = sbEnvironmentsList.some(env => {
        const isMatch = sender.url.match(env);
        return isMatch && isMatch[0];
    });

    if (isMatchEnvironment && request.actionName === MSG.installed) {
        sendResponse(true);
    }
});
