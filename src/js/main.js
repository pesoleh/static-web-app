'use strict';

/* global chrome:true */
/* global Dom:true */
/* global ProfileDataProvider:true */
/* global MSG:true */
/* global insertPopover:true */
/* global insertPanelEl:true */
/* global onPopoverClose:true */
/* global renderPanelError:true */
/* global insertLoadingEl:true */
/* global insertFoundMatchEl:true */
/* global insertFoundMultipleCandidatesEl:true */
/* global insertAddCandidateEl:true */
/* global getCookie:true */
/* global LINKEDIN:true */
/* global ENVIRONMENT:true */
/* global parseLinkedinUrl:true */

let profiles = {};

/**
 * Check if navigation panel Element is present - if yes - User is logged into LinkedIn
 * @returns {Object} Promise to check if user is logged in or not
 */
const checkLiLogin = () => {
    return Dom.linkedin.getNavigationEl().then(el => !!el);
};

/**
 * Send message to event page
 * @param {String} actionName - action name
 * @param {Object} data - message data
 * @param {Function} callback - message callback
 * @param {boolean} doNotLogError - do we need to log error or not
 * @returns {void}
 */
const sendContextMessage = (actionName, data, callback, doNotLogError = false) => {
    const sessionCookie = getCookie(LINKEDIN.sessionCookieName);
    chrome.runtime.sendMessage('', { actionName: actionName, data: data, doNotLogError, windowUrl: window.location.href, sessionCookie }, callback);
};

/**
 * Show or hide disclaimer panel (toggle css)
 * @returns {void}
 */
const renderDisclaimerEl = () => {
    let panelEl = Dom.extension.getPanelEl();
    if (!panelEl) {
        return;
    }
    Dom.linkedin.getConnectionDegreeEl().then(connectionDegreeEl => {
        if (connectionDegreeEl) {
            const disclaimerEl = panelEl?.disclaimerEl;
            if (panelEl && disclaimerEl) {
                // css class which adds extra space for disclaimer
                const cssClass = 'with-disclaimer';
                // show only for other than first connection
                if (!ProfileDataProvider.getConnectionDegree(connectionDegreeEl.textContent.trim())) {
                    panelEl.classList.add(cssClass);
                    disclaimerEl.className = 'disclaimer';
                    disclaimerEl.textContent = 'Extension operates better with 1st connections. Please connect with the candidate to see contact info.';
                } else {
                    panelEl.classList.remove(cssClass);
                    disclaimerEl.className = '';
                    disclaimerEl.textContent = null;
                }
            }
        }
    })
};

/**
 * Hide disclaimer panel explicitly
 * @returns {void}
 */
const hideDisclaimerEl = () => {
    let panelEl = Dom.extension.getPanelEl();
    if (panelEl) {
        Dom.extension.removePanelDisclaimerEl();
        panelEl.classList.remove('with-disclaimer');
    }
};

/**
 * Handles an error when candidate's LinkedIn profile URL is not valid:
 *  - URL is not correct
 *  - profile page not found
 * @param {Object} candidate - candidate information
 * @param {*} error - error information
 * @return {void}
 */
const handleSyncProfileError = (candidate, error) => {
    let errorMessage;
    if (!isCandidateLastSyncSuccessful(candidate)) {
        // unlink candidate if also previous sync wasn't successful - looks like the profile page does not exist.
        sendContextMessage(MSG.unlink, candidate);
        errorMessage = `Unlink profile URL: ${candidate.linkedinUrl}`;
    } else {
        sendContextMessage(MSG.enrichCandidate, addCandidateSuccessfulSyncFlag(candidate, false));
        errorMessage = `Not found profile URL: ${candidate.linkedinUrl}`;
    }
    if (error) {
        errorMessage += `; Error: ${JSON.stringify(error)}`;
    }
    sendContextMessage(
        MSG.reportError,
        {
            source: `Update outdated Profile information for "${candidate.firstName} ${candidate.lastName}"`,
            message: errorMessage
        }
    );
}

/**
 * Updates candidates with the most outdated information
 */
const updateMostOutdatedCandidateProfiles = () => {
    sendContextMessage(MSG.getCandidatesWithOutdatedInfo, null, (data) => {
        const candidates = data?.result;
        if (!candidates?.length) {
            return;
        }
        candidates.forEach((c) => {
            const candidate = {
                id: c.candidateId,
                firstName: c.firstName,
                lastName: c.lastName,
                isLastSyncSuccessful: c.isLastSyncSuccessful,
                linkedinUrl: c.linkedinUrl
            };
            const profileId = getProfileIdFromUrl(candidate.linkedinUrl);
            // we need to handle the error when candidate's LinkedIn profile URL is not valid
            if (!profileId) {
                handleSyncProfileError(candidate, 'Profile URL is not correct');
                return;
            }
            getCandidateInfoByProfileUrl(candidate.linkedinUrl, profileId, true, true).then((profileData) => {
                sendContextMessage(MSG.enrichCandidate, { ...profileData, ...candidate, isLastSyncSuccessful: profileData.isLastSyncSuccessful });
            }).catch((error) => {
                if (error?.status >= 400) {
                    handleSyncProfileError(candidate, error);
                }
            });
        });
    });
};

/**
 * Find candidates api call error handler
 * @param {Objece} response - response error
 * @param {boolean} displayError - show error message on the panel
 * @returns {void}
 */
const handleFindCandidatesError = (response, displayError) => {
    const isNoAccessError = response.status === 403;
    if (isNoAccessError && !getCookie(noAccessModeCookieName)) {
        setCookie(noAccessModeCookieName, true);
    }
    // display error message if needed
    if (displayError) {
        renderPanelError(isNoAccessError ? noAccessErrorMessage : response.errorMessage);
    }
}

/**
 * Resolve received candidates
 * @param {Object} response - found candidates
 * @param {string} profileUrl - profile url
 * @returns {void}
 */
const resolveReceivedCandidates = (response, profileUrl) => {
    /* compare previous profile's linkedinId with current profile's linkedinId to
       avoid overriding a panel with outdated data, in case if user switched to different page during XMLHTTPRequest */
    if (profiles[profileUrl] && profiles[profileUrl].linkedinUrl && isLinkedinPageCurrentlyOpened(profiles[profileUrl].pageUrl)) {
        const isPerfectMatch = response.result?.length === 1 && response.result[0]?.isPerfectMatch;
        if ((!profiles[profileUrl].firstName || !profiles[profileUrl].lastName) && !isPerfectMatch) {
            renderFindCandidatePanel(profileUrl);
            return;
        }
        if (response.errorMessage) {
            hideDisclaimerEl();
            handleFindCandidatesError(response, true);
        } else if (response.result?.length) {
            // resolve disclaimer and 1st connection after "Name" element holder is available
            renderDisclaimerEl();
            // single perfect match found
            if (isPerfectMatch) {
                insertFoundMatchEl(response.result[0], profileUrl);
                updateMostOutdatedCandidateProfiles();
            } else {
                // multiple candidates found
                insertFoundMultipleCandidatesEl(response.result, profileUrl);
            }
        } else {
            // candidate was not found in our DB
            insertAddCandidateEl(profileUrl);
            renderDisclaimerEl();
        }
    }
};

/**
 * Get profile primary data from linkedin request
 * @param {String} profileId - profile id
 * @param {boolean} doNotLogError - do we need to log error or not
 * @return {Promise} Promise
 */
const collectPrimaryProfileData = (profileId, doNotLogError) => {
    return new Promise((resolve, reject) => {
        sendContextMessage(MSG.getLinkedinPrimaryInfo, profileId, data => {
            if (data && data.result) {
                let localProfileData = ProfileDataProvider.getMainInfo(data.result[linkedinFields.profile]);
                localProfileData[profileFieldNames.educations] = ProfileDataProvider.getEducationInfo(data.result[linkedinFields.educationView]);
                localProfileData[profileFieldNames.languages] = ProfileDataProvider.getLanguageInfo(data.result[linkedinFields.languageView]);
                resolve(localProfileData);
            } else {
                reject(data);
            }
        }, doNotLogError);
    });
};

/**
 * Get profile contact data from linkedin request
 * @param {String} profileId - profile id
 * @param {boolean} doNotLogError - do we need to log error or not
 * @return {Promise} Promise
 */
const collectContactProfileData = (profileId, doNotLogError) => {
    return new Promise(resolve => {
        sendContextMessage(MSG.getLinkedinProfileContactInfo, profileId, data => {
            if (data && data.result) {
                resolve(ProfileDataProvider.getContactInfo(data.result));
            } else {
                resolve({});
            }
        }, doNotLogError);
    });
};

/**
 * Transliterate name request
 * @param {String} firstName - candidate first name
 * @param {String} lastName - candidate last name
 * @return {Promise} Promise
 */
const transliterateName = (firstName, lastName) => {
    return new Promise(resolve => {
        sendContextMessage(MSG.transliterateName, { firstName, lastName }, data => {
            if (data && data.result) {
                resolve(data.result);
            } else {
                resolve();
            }
        });
    });
};

/**
 * Collects primary contact data by profile url
 * @param {string} profileUrl - linkedin profile url
 * @param {boolean} doNotLogError - do we need to log error or not
 * @param {boolean} doNotTransliterate - do we need to transliterate name or not
 * @returns {Object} - promise for collecting all data.
 */
const getCandidateInfoByProfileUrl = (profileUrl, profileId = null, doNotLogError = false, doNotTransliterate = false) => {
    const profileIdValue = profileId || getProfileId(profileUrl);
    let promises = [collectPrimaryProfileData(profileIdValue, doNotLogError), collectContactProfileData(profileIdValue, doNotLogError)];

    return Promise.all(promises).then((data) => {
        const profileData = data.length ? Object.assign({}, data[0], data[1], { linkedinUrl: profileUrl }) : null;
        if (!profileData) {
            return null;
        }
        if (doNotTransliterate) {
            return profileData;
        }
        return transliterateName(profileData.firstName, profileData.lastName).then((res) => {
            if (res) {
                profileData.firstName = res.firstName;
                profileData.lastName = res.lastName;
                profileData.firstNameNative = res.firstNameNative;
                profileData.lastNameNative = res.lastNameNative;
            }
            return profileData;
        });
    });
};

/**
 * Collects primary contact data from the page
 * @param {string} profileUrl - linkedin profile url
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const collectProfileData = (profileUrl, linkedinUrl) => {
    profiles[profileUrl] = Object.assign({}, profiles[profileUrl], { isLinkedInApiLoading: true, pageUrl: linkedinUrl  });

    getCandidateInfoByProfileUrl(profileUrl).then((profileInfoResponse) => {
        profiles[profileUrl].isLinkedInApiLoading = false;

        if (isLinkedinPageCurrentlyOpened(linkedinUrl) && profileInfoResponse) {
            profiles[profileInfoResponse.linkedinUrl] = Object.assign({}, profiles[profileInfoResponse.linkedinUrl], profileInfoResponse);
            let profileData = profiles[profileInfoResponse.linkedinUrl];

            // check all required fields
            if (profileData.linkedinId && profileData.linkedinUrl) {
                if (profileData.linkedinUrl && profileData.isRequestPending) {
                    insertLoadingEl(profileData.panelLoadingText);
                } else {
                    sendContextMessage(MSG.searchCandidates, profileData,
                        response => resolveReceivedCandidates(response, profileData.linkedinUrl));
                }
            } else {
                renderFindCandidatePanel(profileData.linkedinUrl);
            }
        }
    }).catch(() => {
        profiles[profileUrl].isLinkedInApiLoading = false;

        renderPanelError('Failed to get profile data. Please refresh a page.');
        sendContextMessage(MSG.reportError, { source: 'Caught an error while collecting Profile Data',
            message: `Profile URL: ${profileUrl}` });
    });
};

/**
 * Inserts candidate's statuses if it's possible on search people page.
 * @param {string} linkedinUrl - linkedin url
 */
const insertCandidateStatusesIfPossible = (linkedinUrl) => {
    const peopleList = Dom.extension.getPeopleFromSearchResult();
    let stopResponseHandling = false;
    const miniProfileParamName = 'miniProfile';

    peopleList.forEach((personItem) => {
        const profileLink = personItem.querySelector('.t-roman a.app-aware-link');
        const linkedinProfileUrl = parseLinkedinProfileUrl(profileLink.href);
        if (!profileLink?.href || !linkedinProfileUrl || personItem.querySelector('.sb-status-info')) {
            return;
        }
        const statusInfo = Dom.extension.createEl('div', 'sb-status-info button-text');
        personItem.style.position = 'relative';
        statusInfo.innerHTML = `
            <div class='text'>Loading...</div>
            <div class='loader'></div>`;
        personItem.appendChild(statusInfo);
        const data = { linkedinUrl: linkedinProfileUrl };
        if (profileLink.href.includes(miniProfileParamName)) {
            data.linkedinId = decodeURIComponent(profileLink.href).split(`${miniProfileParamName}:`).pop();
        }
        sendContextMessage(MSG.searchCandidates, data,
            (response) => {
                if (response?.errorMessage) {
                    handleFindCandidatesError(response, false);
                }
                const perfectMatch = response?.result?.[0]?.isPerfectMatch ? response.result[0] : null;
                if(isLinkedinPageCurrentlyOpened(linkedinUrl) && !stopResponseHandling) {
                    if (!document.body.contains(personItem)) {
                        // There might be cases when app(LI) dynamically changed previously selected elements in the list
                        // In this case: stop handling all the rest responses and perform person item elements handling again
                        stopResponseHandling = true;
                        insertCandidateStatusesIfPossible(linkedinUrl);
                    }
                    if (perfectMatch) {
                        const isEmployee = perfectMatch.status === candidateStatuses.employee;
                        const poolCategoryInfo = perfectMatch.lastActivityPoolCategory ? `\u00A0(${perfectMatch.lastActivityPoolCategory})` : '';
                        const lastActivityInfo = isEmployee ? '' : `, last activity ${formatDateRelatively(perfectMatch.lastActivityDate)}`;
                        const exEmployeeInfo = perfectMatch.isFormerEmployee ? ', Ex-Employee' : '';
                        statusInfo.innerHTML = `
                            <b>${perfectMatch.status}</b>
                            ${poolCategoryInfo}${lastActivityInfo}${exEmployeeInfo}`;
                    } else {
                        statusInfo.innerHTML = '';
                    }
                }
                if (perfectMatch?.linkedinInfoUpdateRequired) {
                    getCandidateInfoByProfileUrl(data[profileFieldNames.linkedinUrl]).then((profileInfoResponse) => {
                        sendContextMessage(MSG.enrichCandidate, { ...data, ...perfectMatch, ...profileInfoResponse });
                    });
                }
            }
        );
    });
}

/**
 * Clear previous profile
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const clearProfile = (linkedinUrl) => {
    if (linkedinUrl) {
        const isRequestPending = profiles[linkedinUrl] && profiles[linkedinUrl].isRequestPending;
        const panelLoadingText = profiles[linkedinUrl] && profiles[linkedinUrl].panelLoadingText;
        // clear profile by linkedinUrl after get on different profile page. But keep necessary fields
        profiles[linkedinUrl] = Object.assign({}, { isRequestPending, panelLoadingText });
    }
};

/**
 * Check if should process current profile page url
 * @param {Object} request - request
 * @returns {boolean} boolean
 */
const checkIfAllowedToProcessProfilePage = (request) => {
    const isLinkedInApiLoading = profiles[request.profileUrl] && profiles[request.profileUrl].isLinkedInApiLoading || null;
    let result = false;

    if (request.profileUrl && !isLinkedInApiLoading) {
        if (request.linkedinUrl !== request.prevLinkedinUrl) {
            clearProfile(request.prevLinkedinUrl);
        }

        if (profiles[request.profileUrl] && profiles[request.profileUrl].linkedinUrl) {
            result = !Dom.extension.getPanelEl();
        } else {
            result = true;
        }
    }

    return result;
};

/**
 * Checks if user is logged in and performs some actions according to the page.
 * @param {Function} actionsHandler - function which
 * @param {Function} sendResponse - send response callback
 * @returns {void}
 */
const checkLinkedinLoginAndPerformActions = (actionsHandler, sendResponse) => {
    checkLiLogin().then(isLogged => {
        if (isLogged) {
            actionsHandler();
        } else {
            sendResponse({ actionName: MSG.notLoggedIn });
        }
    });
}

/**
 * Inserts main SB panel on the profile page
 * @param {Object} event - event message information
 * @param {Function} sendResponse - send response callback
 * @returns {void}
 */
const insertSbPanel = (event, sendResponse) => {
    if (checkIfAllowedToProcessProfilePage(event)) {
        checkLinkedinLoginAndPerformActions(() => {
            hideDisclaimerEl();
            insertLoadingEl();
            // start collecting data after necessary DOM elements are available
            insertPopover();
            insertPanelEl(event.isRecruiterPage)
                .then(() => {
                    if (getCookie(noAccessModeCookieName)) {
                        renderPanelError(noAccessErrorMessage);
                    } else {
                        collectProfileData(parseLinkedinProfileUrl(event.profileUrl), event.linkedinUrl);
                    }
                });
        }, sendResponse);
    }
}

/**
 * Listen to runtime events for messaging
 */
chrome.runtime.onMessage.addListener((event, _sender, sendResponse) => {
    switch (event.actionName) {
        case MSG.profileFound: {
            if (event.isRecruiterPage) {
                // for recruiter profile page we need to get public profile url
                Dom.linkedin.getRecruiterPagePublicProfileEl().then((publicProfileEl) => {
                    if (publicProfileEl) {
                        const profileUrl = decodeURI(ENVIRONMENT.linkedin + publicProfileEl.href.split('linkedin.com')[1] + '/');
                        insertSbPanel({ ...event, profileUrl }, sendResponse);
                    }
                })
            } else {
                insertSbPanel(event, sendResponse);
            }
            break;
        }
        case MSG.searchPeoplePageFound: {
            if (getCookie(noAccessModeCookieName)) {
                return;
            }
            checkLinkedinLoginAndPerformActions(() => {
                // in some cases when search results page are cached -
                // DOM is updated dynamically and we need to wait a little bit for preventing using not mounted elements.
                setTimeout(() => {
                    insertCandidateStatusesIfPossible(event.linkedinUrl);
                }, 500);
            }, sendResponse);
            break;
        }
        case MSG.navigateAway: {
            // remove extension's DOM elements
            Dom.extension.removePanelEl();
            Dom.extension.removePopoverEl();
            break;
        }
        default:
            break;
    }
});

/**
 * Listen to browser's 'back' and 'forward' button click
 */
window.addEventListener('popstate', () => {
    // close popover when navigating between profiles
    onPopoverClose();
});
