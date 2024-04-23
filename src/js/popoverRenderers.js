'use strict';

/* global Dom:true */
/* global MSG:true */
/* global insertWarningEl:true */
/* global insertLoadingEl:true */
/* global sendContextMessage:true */
/* global resolveAddNewCandidate:true */
/* global insertAddNewCandidateButton:true */
/* global insertFoundMatchEl:true */
/* global comparisonTypes:true */
/* global formatDate:true */
/* global resolveCandidateUnlink:true */
/* global renderPanelError:true */
/* global profiles:true */
/* global getCorrectProfileLink:true */

const crossIcon = '&#10006;';

const englishNamePattern = "[a-zA-Z\\-' .\\(\\)]+";

/* exported insertPopover */
/**
 * Insert popover into DOM
 * @returns {void}
 */
const insertPopover = () => {
    // don't insert element if there is one already in the DOM for this tab
    if (!Dom.extension.getPopoverEl()) {
        // prepend popover in body
        document.body.prepend(Dom.extension.createPopoverEl());
    }
};

/**
 * Opens popover
 * @return {void}
 */
const openPopover = () => {
    Dom.extension.getPopoverEl().classList.remove('hide');
    document.body.style.overflow = 'hidden';
};

/**
 * Insert popover error block
 * @param {String} message - error message
 * @returns {void}
 */
const insertPopoverError = (message) => {
    let popoverEl = Dom.extension.getPopoverInsideEl();
    popoverEl.innerHTML = '';
    popoverEl.appendChild(insertWarningEl(message));
};

/* exported updateProfileLoadingInfo */
const updateProfileLoadingInfo = (profileUrl, isRequestPending, panelLoadingText = '') => {
    profiles[profileUrl] = Object.assign({}, profiles[profileUrl], { isRequestPending, panelLoadingText });
};

/**
 * Inserts into DOM a safe avatar block
 * @param {string} avatarSrc - url to image
 * @returns {HTMLDivElement} Node element
 */
const insertSafeAvatar = (avatarSrc) => {
    const onLoadImg = (event, dummyImgEl) => {
        dummyImgEl.className = 'hide';
        event.target.classList.remove('hide');
    };

    let safeImageBlock = document.createElement('div');
    safeImageBlock.className = 'photo-wrapper';
    safeImageBlock.title = 'User avatar';

    let dummyImgEl = document.createElement('img');
    dummyImgEl.src = chrome.runtime.getURL('../img/user.png');
    dummyImgEl.alt = 'Missing User avatar';

    let userAvatarEl = document.createElement('img');
    userAvatarEl.onload = (event) => onLoadImg(event, dummyImgEl);
    userAvatarEl.src = avatarSrc;
    userAvatarEl.alt = 'User avatar';
    userAvatarEl.className = 'hide';

    safeImageBlock.appendChild(dummyImgEl);
    safeImageBlock.appendChild(userAvatarEl);

    return safeImageBlock;
};

/**
 * Insert "loading" block with custom message
 * @param {String} message - loading message
 * @returns {void}
 */
const insertLoadingPopover = (message) => {
    Dom.extension.getPopoverInsideEl().innerHTML = `
        <div class='loading-block search'>
            <div class="loader">Loading...</div>
            <div class='message'>${message}</div>
        </div>`;
};

const onPopoverClose = () => {
    const popoverEl = Dom.extension.getPopoverEl();

    if (popoverEl) {
        popoverEl.classList.add('hide');

        let popoverInsideEl = Dom.extension.getPopoverInsideEl();
        // remove all previously assigned classes
        popoverInsideEl.className = 'popover-inside';
        // and remove all inner markup
        popoverInsideEl.innerHTML = '';
        document.body.style.overflow = 'visible';
    }
};

/**
 * Resolve match icon
 * @param {String|Object} profile - profile data
 * @param {String} candidateData - candidate data
 * @param {String} [type=null] - comparison type
 * @returns {String} Dom string
 */
const getMatchMark = (profile, candidateData, type) => {
    let profileDataChunk = profile ? profile.trim() : profile;
    let candidateDataChunk = candidateData ? candidateData.trim() : candidateData;
    let result = '';

    if (candidateDataChunk) {
        const doesMatch = '<i class="icon-right check" title="Match">&#10004;</i>';
        const notMatch = `<i class='icon-right cross' title='Does not match'>${crossIcon}</i>`;

        if (profileDataChunk) {
            result = notMatch;

            if (type === comparisonTypes.linkedin) {
                // extract only "profile" part from linkedin URLs
                // in format "john-lennon-123eb45" or "johnlennon"
                // regex to replace front part of url, everything which has "linkedin.com/in/"
                const linkedinUrl = /^(\S*linkedin\.com\/in\/)/;
                profileDataChunk = profileDataChunk.replace(linkedinUrl, '').replace('/', '');
                candidateDataChunk = candidateDataChunk.replace(linkedinUrl, '').replace('/', '');
            }

            if (type === comparisonTypes.phone) {
                // check if any of given phone strings is long enough and if longer ends with shorter
                if (profileDataChunk.length >= 7 && candidateDataChunk.length >= 7 &&
                    (profileDataChunk.endsWith(candidateDataChunk) || candidateDataChunk.endsWith(profileDataChunk))) {
                    result = doesMatch;
                }
            } else if (profileDataChunk === candidateDataChunk) {
                result = doesMatch;
            }
        }
    }

    return result;
};

/**
 * Insert "cross"-like button for closing popover
 * @returns {Element} Node element
 */
const insertButtonClosePopover = () => {
    let buttonCloseEl = Dom.extension.createEl('button', 'button-close');
    buttonCloseEl.innerHTML = `${crossIcon}`;
    buttonCloseEl.onclick = onPopoverClose.bind(this);

    return buttonCloseEl;
};

/**
 * Insert into popover info about current profile
 * @param {string} linkedinUrl - linkedin url
 * @param {boolean} isAddActionDisabled - add action button is disabled flag
 * @returns {Element} DOM element
 */
const insertProfileInfo = (linkedinUrl, isAddActionDisabled) => {
    const fullName = profiles[linkedinUrl].firstName + ' ' + profiles[linkedinUrl].lastName;
    const profilePictureUrl = profiles[linkedinUrl].profilePicture || chrome.runtime.getURL('../img/user.png');

    let profileEl = Dom.extension.createEl('div', 'candidate-block profile');
    profileEl.innerHTML = `
        <div class='photo-wrapper'>
            <img src='${profilePictureUrl}' alt='Profile picture' title='Profile picture'>
        </div>
        <div class='info'>
            <div class='name'>${fullName}</div>
            <div>${profiles[linkedinUrl].position || ''}</div>
            ${profiles[linkedinUrl].schoolName ? `<div>${profiles[linkedinUrl].schoolName}</div>` : ''}
            ${profiles[linkedinUrl].locationName ? `<div>${profiles[linkedinUrl].locationName}</div>` : ''}
            ${profiles[linkedinUrl].phones?.length ? `<div class='icon-info-block'>
                <img src='${chrome.runtime.getURL('../icons/phone.png')}' alt='phone' class='icon-left' />
                <div>${profiles[linkedinUrl].phones.join('; ')}</div>
            </div>` : ''}
            ${profiles[linkedinUrl].emails?.length ? `<div class='icon-info-block'>
                <img src='${chrome.runtime.getURL('../icons/email.png')}' alt='e-mail' class='icon-left' />
                <div>${profiles[linkedinUrl].emails.join('; ')}</div>
            </div>` : ''}
            ${profiles[linkedinUrl].twitters?.length ? `<div class='icon-info-block'>
                <img src='${chrome.runtime.getURL('../icons/twitter.png')}' alt='twitter' class='icon-left' />
                <div>${profiles[linkedinUrl].twitters.join('; ')}</div>
            </div>` : ''}
            ${profiles[linkedinUrl].skypes?.length ? `<div class='icon-info-block'>
                <img src='${chrome.runtime.getURL('../icons/skype.png')}' alt='skype' class='icon-left' />
                <div>${profiles[linkedinUrl].skypes.join('; ')}</div>
            </div>` : ''}
            <div class='icon-info-block'>
                <img src='${chrome.runtime.getURL('../icons/linkedin.png')}' alt='LinkedIn' class='icon-left' />
                <a href='${profiles[linkedinUrl].linkedinUrl}' target='_blank' >${profiles[linkedinUrl].linkedinUrl}</a>
            </div>
        </div>`;

    profileEl.appendChild(insertAddNewCandidateButton(linkedinUrl, isAddActionDisabled));
    return profileEl;
};

/**
 * Resolve candidate update
 * @param {Object} response - response
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const resolveCandidateUpdate = (response, linkedinUrl) => {
    updateProfileLoadingInfo(linkedinUrl, false, '');
    /* compare current window url to linkedinUrl, received in response in order to
       avoid overriding a panel with outdated data, received from long XmlHTTPRequest */
    if (profiles[linkedinUrl].linkedinUrl === linkedinUrl) {

        if (response.status === 200) {
            insertFoundMatchEl(response.result, linkedinUrl);
            onPopoverClose();
        } else {
            const errMessage = 'Error occurred while updating candidate in db';
            insertPopoverError(response.errorMessage || errMessage);
            renderPanelError(response.errorMessage || errMessage);
        }
    }
};

/**
 * Handle "Confirm" button click
 * @param {Object} candidate - selected candidate from db
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const onConfirmButton = (candidate, linkedinUrl) => {
    const newCandidate = Object.assign({}, profiles[linkedinUrl], { id: candidate.id });
    const loadingText = 'Updating candidate';
    insertLoadingPopover(loadingText);

    updateProfileLoadingInfo(linkedinUrl, true, loadingText);
    updateMostOutdatedCandidateProfiles();
    sendContextMessage(MSG.enrichCandidate, newCandidate,
        resolve => resolveCandidateUpdate(resolve, linkedinUrl));
};

/**
 * Insert candidate info block
 * @param {Object} candidate - candidate's properties
 * @param {string} linkedinUrl - linkedin url
 * @returns {HTMLDivElement} DOM element
 */
const insertCandidateBlock = (candidate, linkedinUrl) => {
    const fullName = candidate.firstName + ' ' + candidate.lastName;
    const correctCandidateLinkedinUrl = getCorrectProfileLink(candidate.linkedinUrl);
    const candidateLinkedinUrl = correctCandidateLinkedinUrl ?
        `<a href='${correctCandidateLinkedinUrl}' target='_blank'>${correctCandidateLinkedinUrl}</a>` : '<div>-</div>';
    let candidateBlockEl = Dom.extension.createEl('div', 'candidate-block');

    const candidateStatus = candidate.status ? `<span class='status' title='Candidate status: ${candidate.status}'>(${candidate.status})</span>` : '';
    let infoBlockEl = Dom.extension.createEl('div', 'info');
    infoBlockEl.innerHTML = `
            <div class='primary-info'>
                <a href='${candidate.profileUrl}' target='_blank' class='name' title='Open candidate in Staffing Board'>
                    ${fullName}
                </a>
                ${candidateStatus}
            </div>
            <div title='Position'>${candidate.position || '-'}</div>
            <div class='columns'>
                <div class='column'>
                    <div class='icon-info-block'>
                        <img src='${chrome.runtime.getURL('../icons/email.png')}' alt='e-mail' class='icon-left' />
                        <div>${candidate.email || '-'}</div>
                        ${getMatchMark(profiles[linkedinUrl].emails?.[0], candidate.email)}
                    </div>
                    <div class='icon-info-block'>
                        <img src='${chrome.runtime.getURL('../icons/phone.png')}' alt='Phone' class='icon-left' />
                        <div>${candidate.phone || '-'}</div>
                        ${getMatchMark(profiles[linkedinUrl].phones?.[0], candidate.phone, comparisonTypes.phone)}
                    </div>
                    <div class='icon-info-block'>
                        <img src='${chrome.runtime.getURL('../icons/map-pin.png')}' alt='Location' class='icon-left' />
                        <div>${candidate.location || '-'}</div>
                    </div>
                </div>
                <div class='column'>
                    <div class='icon-info-block'>
                        <img src='${chrome.runtime.getURL('../icons/skype.png')}' alt='Skype' class='icon-left' />
                        <div>${candidate.skype || '-'}</div>
                        ${getMatchMark(profiles[linkedinUrl].skypes?.[0], candidate.skype, comparisonTypes.skype)}
                    </div>
                    <div class='icon-info-block' title='Recruiter'>
                        <img src='${chrome.runtime.getURL('../icons/user-avatar.png')}' alt='Recruiter' class='icon-left' />
                        <div>${candidate.recruiterName || '-'}</div>
                    </div>
                    <div class='icon-info-block' title='Competence Group'>
                        <img src='${chrome.runtime.getURL('../icons/tools.png')}' alt='Competence Group' class='icon-left' />
                        <div>${candidate.cg || '-'}</div>
                    </div>
                </div>
            </div>
            <div class='icon-info-block'>
                <img src='${chrome.runtime.getURL('../icons/linkedin.png')}' alt='LinkedIn' class='icon-left' />
                <div>${candidateLinkedinUrl}</div>
                ${getMatchMark(profiles[linkedinUrl].linkedinUrl, correctCandidateLinkedinUrl, comparisonTypes.linkedin)}
            </div>`;

    let lastActivityEl = Dom.extension.createEl('div', 'last-activity');
    const isConfirmDisabled = candidate.linkedinUrl && candidate.linkedinUrl !== profiles[linkedinUrl].linkedinUrl;
    let confirmButton = getActionButton({
        name: 'CONFIRM',
        className: 'button-confirm',
        disabled: isConfirmDisabled,
        title: isConfirmDisabled ? 'This candidate is associated with another LinkedIn Profile' : null,
        onClick: () => onConfirmButton(candidate, linkedinUrl)
    });

    lastActivityEl.innerHTML = formatLastActivities(candidate);
    infoBlockEl.appendChild(lastActivityEl);
    candidateBlockEl.appendChild(insertSafeAvatar(candidate.photoUrl));
    candidateBlockEl.appendChild(infoBlockEl);
    candidateBlockEl.appendChild(confirmButton);

    return candidateBlockEl;
};

/* exported populateMatchesPopover */
/**
 * Populate popover with candidates results
 * @param {Array} candidates - candidates
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const populateMatchesPopover = (candidates, linkedinUrl) => {
    let popoverInsideEl = Dom.extension.getPopoverInsideEl();
    popoverInsideEl.innerHTML = '';
    const profileInfoEl = insertProfileInfo(linkedinUrl, candidates[0].isPerfectMatch);
    const numberOfMatches = candidates.length === 1 ? candidates.length + ' possible match' : candidates.length + ' possible matches';
    let popoverWrapperEl = Dom.extension.createEl('div', 'popover-wrapper');

    popoverWrapperEl.innerHTML = `<div class='results-header'>Showing ${numberOfMatches} from database</div>`;
    candidates.forEach(candidate => popoverWrapperEl.appendChild(insertCandidateBlock(candidate, linkedinUrl)));
    popoverInsideEl.appendChild(insertButtonClosePopover());
    popoverInsideEl.appendChild(profileInfoEl);
    popoverInsideEl.appendChild(popoverWrapperEl);
};

/**
 * Close popover when pressed Cancel button
 * @returns {void}
 */
const onCancelButton = () => {
    onPopoverClose();
};

/**
 * Insert "Cancel" button to close popover
 * @param {String} name - button name
 * @returns {HTMLButtonElement} DOM element
 */
const getCancelPopoverButton = (name = 'CANCEL') => {
    return getActionButton({ name, onClick: onCancelButton }, false)
};

/**
 * Get actions block for popover
 * @param {Array<Node>} actionsList - list of action elements
 * @return {HTMLElement} - actions block element
 */
const getPopoverActionsBlock = (actionsList) => {
    const actionsEl = Dom.extension.createEl('div', 'actions');

    if (actionsList.length) {
        actionsList.forEach(actionEl => actionsEl.appendChild(actionEl));
    }

    return actionsEl;
}

/**
 * Handle checkbox click on vacancy
 * and modify "Apply" button.
 * @param {String} buttonName - button name
 * @returns {void}
 */
const onPopoverCheckboxClick = (buttonName) => {
    const selectAllCheckbox = Dom.extension.getPopoverSelectAllCheckbox();
    const formCheckboxesList = Dom.extension.getPopoverFormEnabledCheckboxes();
    const selectedCheckboxesList = Dom.extension.getPopoverFormSelectedCheckboxes();
    let assignButton = Dom.extension.getPopoverSubmitButton();
    // "Select All" might be present in form or not
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }

    if (selectedCheckboxesList.length > 0) {
        // if all checkboxes are selected - enable "Select All" too
        if (selectAllCheckbox && formCheckboxesList.length === selectedCheckboxesList.length) {
            selectAllCheckbox.checked = true;
        }

        toggleElementDisabledState(assignButton, false, buttonName + ' (' + selectedCheckboxesList.length + ')');
    } else {
        toggleElementDisabledState(assignButton, true, buttonName);
    }
};

/**
 * Handle assigning to vacancy response
 * @param {Object} response - response
 * @param {Element} inputEl - input element
 * @param {Element} statusBarEl - DOM element
 * @returns {Promise} Promise
 */
const resolveAssignToVacancy = (response, inputEl, statusBarEl) => {
    let result;

    if (response.status === 201) {
        inputEl.checked = false;
        inputEl.disabled = true;
        statusBarEl.classList.remove('error');
        statusBarEl.textContent = 'Success';

        result = Promise.resolve();
    } else {
        const errorMessage = response.errorMessage || 'Error occurred while assigning to vacancy';
        // if session expired while assigning candidate to vacancy - show single error message
        if (response.status === 440) {
            insertPopoverError(errorMessage);
            renderPanelError(errorMessage);
        } else {
            statusBarEl.classList.add('error');
            statusBarEl.innerHTML = errorMessage;
        }

        result = Promise.reject(errorMessage);
    }

    return result;
};

/**
 * Assign candidate to selected vacancies
 * @param {Object} event - click event
 * @param {Object} candidate - candidate information
 * @param {Array} vacancies - vacancies
 * @returns {void}
 */
const onAssignCandidateToVacancies = (event, candidate, vacancies) => {
    const candidateId = candidate.id;
    const buttonEl = event.target;
    // iterate through all inputs in form
    let formEl = Dom.extension.getPopoverFormEl();
    const newApplicationsInfo = [];
    let selectedVacanciesList = [];
    let promises = [];

    for (let i = 0; i < formEl.elements.length; i++) {
        const vacancyEl = formEl.elements[i];
        // get only "vacancy" elements from form
        const isVacancyEl = vacancyEl.id.indexOf('vacancy') === 0;
        if (isVacancyEl && vacancyEl.checked) {
            // collect all selected vacancies ids
            selectedVacanciesList.push({ vacancyId: vacancyEl.value, inputEl: vacancyEl });
            newApplicationsInfo.push({
                vacancyRole: vacancies[i].role,
                jobFamilyName: vacancies[i].jobFamily,
                stageName: applicationStages.potentialCandidate,
                stageUpdatedOn: new Date().toISOString()
            });
        }
    }

    toggleElementDisabledState(buttonEl, true, 'ASSIGN');
    selectedVacanciesList.forEach(vacancy => {
        const { vacancyId, inputEl } = vacancy;
        let statusBarEl = Dom.extension.getVacancyStatusBarEl(vacancyId);
        statusBarEl.innerHTML = `
            <div class='loading-block loading-small'>
                <div class="loader">Loading...</div>
                <div class='message'>Assigning to vacancy...</div>
            </div>`;
        promises.push(new Promise(resolve => {
            sendContextMessage(MSG.assignToVacancy, { vacancyId, candidateId },
                response => resolve(resolveAssignToVacancy(response, inputEl, statusBarEl)));
        }));
    });

    Promise.all(promises).then(() => {
        onPopoverClose();

        if (candidate.applications?.length) {
            candidate.applications = newApplicationsInfo.concat(candidate.applications);
            renderApplicationsInfo(candidate.applications);
        } else {
            candidate.applications = newApplicationsInfo;
            renderApplicationsInfo(candidate.applications);
        }
    }).catch(() => {
        buttonEl.disabled = false;
    });
};

/**
 * Insert vacancy block element
 * @param {Object} vacancy - vacancy object
 * @param {String} candidateId - selected candidate's id
 * @param {Boolean} someHasStatus - if some vacancies have this status or none
 * @returns {Element} Node element
 */
const insertVacancyBlock = (vacancy, candidateId, someHasStatus) => {
    const vacancyId = vacancy.id;
    const isAssigned = vacancy.candidatesIds.some(id => id === candidateId);

    let vacancyBlockEl = Dom.extension.createEl('div', 'vacancy-block');
    // add css class "filtered" to vacancy element if "someHasStatus" param is true
    if (someHasStatus) {
        vacancyBlockEl.className += vacancy.isOnExternalSearch ? ' filtered' : ' hide';
    }

    let primaryInfoEl = Dom.extension.createEl('div', 'primary-info');

    let inputEl = document.createElement('input');
    inputEl.id = 'vacancy-' + vacancyId;
    inputEl.value = vacancyId;
    inputEl.type = 'checkbox';
    inputEl.onchange = () => onPopoverCheckboxClick('ASSIGN');
    inputEl.disabled = isAssigned;

    const title = (vacancy.id ? vacancy.id + ': ' : '') + vacancy.role;
    let labelEl = Dom.extension.createEl('label', 'name');
    labelEl.htmlFor = 'vacancy-' + vacancyId;
    labelEl.innerHTML = `<span>${title}</span>`;
    labelEl.title = title;

    let secondaryInfoEl = Dom.extension.createEl('div', 'secondary-info');
    const jobFamily = vacancy.jobFamily || '-';
    const accountName = vacancy.accountName || '-';
    const location = vacancy.location || '-';
    const hiringManager = vacancy.hiringManager || '-';
    secondaryInfoEl.innerHTML += `
        <div class='icon-info-block' title='Job Family'>
            <img src='${chrome.runtime.getURL('../icons/tools.png')}' alt='Job Family' title='Job Family' class='icon-left' />
            <div title='${jobFamily}'>${jobFamily}</div>
        </div>
        <div class='icon-info-block' title='Account'>
            <img src='${chrome.runtime.getURL('../icons/building.png')}' alt='Account' title='Account' class='icon-left' />
            <div title='${accountName}'>${accountName}</div>
        </div>
        <div class='icon-info-block' title='Location'>
            <img src='${chrome.runtime.getURL('../icons/map-pin.png')}' alt='Location' title='Location' class='icon-left' />
            <div title='${location}'>${location}</div>
        </div>
        <div class='icon-info-block' title='Hiring Manager'>
            <img src='${chrome.runtime.getURL('../icons/user-avatar.png')}' alt='Hiring Manager' title='Hiring Manager' class='icon-left' />
            <div title='${hiringManager}'>${hiringManager}</div>
        </div>`;
    let statusBarEl = Dom.extension.createEl('div', 'status-bar');
    statusBarEl.textContent = isAssigned ? `This candidate is already assigned to vacancy "${vacancy.role}"` : '';
    statusBarEl.setAttribute('data-vacancy', inputEl.value);

    primaryInfoEl.appendChild(inputEl);
    primaryInfoEl.appendChild(labelEl);

    if (vacancy.status) {
        const status = vacancy.status;
        let statusEl = Dom.extension.createEl('span', 'status');
        statusEl.title = 'Status: ' + status;
        statusEl.textContent = '(' + status + ')';
        primaryInfoEl.appendChild(statusEl);
    }

    vacancyBlockEl.appendChild(primaryInfoEl);
    vacancyBlockEl.appendChild(secondaryInfoEl);
    vacancyBlockEl.appendChild(statusBarEl);

    return vacancyBlockEl;
};

/**
 * Apply switch on vacancies
 * @param {Array} childrenElements - children elements
 * @returns {void}
 */
const applySwitchOnVacancies = (childrenElements) => {
    // iterate over HTMLCollection
    for (let el of childrenElements) {
        if (el.className.indexOf('vacancy-block') !== -1) {
            if (el.className.indexOf('hide') !== -1) {
                el.classList.remove('hide');
            } else if (el.className.indexOf('filtered') === -1) {
                el.classList.add('hide');
                // set element to off state when switching toggle off
                el.children[0].children[0].checked = false;

                const buttonName = 'ASSIGN';
                let assignButton = Dom.extension.getPopoverSubmitButton();
                let selectedCheckboxesList = Dom.extension.getPopoverFormSelectedCheckboxes();
                // almost the same as in onPopoverCheckboxClick
                if (selectedCheckboxesList.length > 0) {
                    toggleElementDisabledState(assignButton, false, buttonName + ' (' + selectedCheckboxesList.length + ')');
                } else {
                    toggleElementDisabledState(assignButton, true, buttonName);
                }
            }
        }
    }
};

/**
 * Handle toggle switch
 * @param {Event} event - browser event
 * @param {Element} switchTextBlock - DOM element
 * @param {Element} labelEl - label element
 * @returns {Boolean} switch true or false
 */
const onVacanciesToggleSwitch = (event, switchTextBlock, labelEl) => {
    const isChecked = event.target.checked;
    const form = Dom.extension.getPopoverFormEl();
    // first and third children are options while second is separator element
    let firstOption = switchTextBlock.children[0];
    let secondOption = switchTextBlock.children[2];
    applySwitchOnVacancies(form.children);

    if (isChecked) {
        firstOption.className = '';
        secondOption.className = 'selected';
        labelEl.title = 'Switch to view all vacancies';
    } else {
        firstOption.className = 'selected';
        secondOption.className = '';
        labelEl.title = 'Switch to view HR Search vacancies only';
    }

    return !isChecked;
};

/**
 * Populate header part with toggle switch
 * @param {Boolean} hasStatus - check if has status or not
 * @returns {Element} DOM element
 */
const populateResultsHeader = (hasStatus) => {
    let resultsWrapperEl = Dom.extension.createEl('div', 'results-wrapper');

    let resultsHeaderEl = Dom.extension.createEl('div', 'results-header');
    resultsHeaderEl.textContent = 'Your Active Vacancies';

    resultsWrapperEl.appendChild(resultsHeaderEl);

    if (hasStatus) {
        let switchBlockEl = Dom.extension.createEl('div', 'switch-block');

        let switchTextBlock = Dom.extension.createEl('div', 'switch-text-block');
        // "selected" value by default
        switchTextBlock.innerHTML = `<span>Show All Vacancies</span><i></i>
            <span class='selected'>Show HR Search Only</span>`;

        let labelEl = Dom.extension.createEl('label', 'switch');
        labelEl.title = 'Switch to view all vacancies';

        let inputEl = document.createElement('input');
        inputEl.type = 'checkbox';
        // should be switched on by default
        inputEl.checked = true;
        inputEl.onchange = (e) => onVacanciesToggleSwitch(e, switchTextBlock, labelEl);

        let switchRoundEl = Dom.extension.createEl('span', 'slider round');

        labelEl.appendChild(inputEl);
        labelEl.appendChild(switchRoundEl);
        switchBlockEl.appendChild(labelEl);
        switchBlockEl.appendChild(switchTextBlock);
        resultsWrapperEl.appendChild(switchBlockEl);
    }

    return resultsWrapperEl;
};

/* exported populateVacanciesPopover */
/**
 * Populate popover with received vacancies
 * @param {Array} vacancies - vacancies
 * @param {Object} candidate - candidate information
 * @returns {void}
 */
const populateVacanciesPopover = (vacancies, candidate) => {
    let popoverInsideEl = Dom.extension.getPopoverInsideEl();
    const candidateId = candidate.id;
    popoverInsideEl.innerHTML = '';
    popoverInsideEl.classList.add('vacancies-popover');

    let popoverWrapperEl = Dom.extension.createEl('div', 'popover-wrapper');
    popoverWrapperEl.innerHTML = '<div class=\'results-wrapper info-message\'><div class=\'results-header\'>You have no open vacancies</div></div>';
    const actionsEl = getPopoverActionsBlock([
        getCancelPopoverButton(),
        getActionButton({
            name: 'ASSIGN',
            className: 'button-assign',
            disabled: true,
            onClick: (event) => onAssignCandidateToVacancies(event, candidate, vacancies)
        })
    ]);

    if (vacancies.length > 0) {
        // check if any vacancies have property "isOnExternalSearch" set to "true"
        const hasStatus = vacancies.some(v => v.isOnExternalSearch);
        popoverWrapperEl.innerHTML = '';
        popoverWrapperEl.appendChild(populateResultsHeader(hasStatus));

        let formEl = Dom.extension.createEl('form', 'popover-form');

        vacancies.forEach(vacancy => formEl.appendChild(insertVacancyBlock(vacancy, candidateId, hasStatus)));
        popoverWrapperEl.appendChild(formEl);
    } else {
        /* insert "OK" button which works exactly the same as "Cancel" */
        actionsEl.appendChild(getCancelPopoverButton('OK'));
    }

    popoverInsideEl.appendChild(insertButtonClosePopover());
    popoverInsideEl.appendChild(popoverWrapperEl);
    popoverInsideEl.appendChild(actionsEl);
};

/**
 * Handle click on confirm button on confirm dialog
 * @param {Object} candidate - candidate
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const onConfirmUnlinkButtonClick = (candidate, profileUrl) => {
    insertLoadingEl('Unlinking candidate');
    sendContextMessage(MSG.unlink, { id: candidate.id, linkedinUrl: profileUrl }, resolveCandidateUnlink);
    onPopoverClose();
};

/* exported populateConfirmUnlinkPopover */
/**
 * Populate popover with confirm message
 * @param {Object} candidate - candidate
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const populateConfirmUnlinkPopover = (candidate, profileUrl) => {
    let popoverInsideEl = Dom.extension.getPopoverInsideEl();
    popoverInsideEl.classList.add('confirm-popover');
    popoverInsideEl.innerHTML = `
        <h3>Unlink candidate</h3>
        <div class='popover-message'>This operation will remove association with candidate. After that you will be able to match the candidate correctly.</div>`;

    const actionsEl = getPopoverActionsBlock([
        getCancelPopoverButton(),
        getActionButton({
            name: 'UNLINK',
            onClick: () => onConfirmUnlinkButtonClick(candidate, profileUrl)
        })
    ]);

    popoverInsideEl.appendChild(insertButtonClosePopover());
    popoverInsideEl.appendChild(actionsEl);
};

/**
 * Handle change for radio button for "move to" radio group
 * @param {Object} event - click event
 * @returns {void}
 */
const onMoveToRadioGroupChange = (event) => {
    Dom.extension.getPopoverFormRadiobuttonById(event.target.for).checked = true;
};

/**
 * Insert radio group block for "move to"
 * @returns {*} DOM element
 */
const insertRadioGroupEl = () => {
    const moveToOptions = [
        {
            id: 'moveToPool',
            name: 'Pool'
        },
        {
            id: 'moveToRecruiting',
            name: 'Recruiting'
        }
    ];
    let radioGroupEl = Dom.extension.createEl('div', 'input-block move-to-block');
    let radioGroupBlockEl = Dom.extension.createEl('div', 'radio-group');

    const title = 'Move Candidate to';
    let nameEl = Dom.extension.createEl('span', 'input-label required');
    nameEl.textContent = title;
    nameEl.title = title;

    moveToOptions.forEach(option => {
        let inputEl = document.createElement('input');
        inputEl.type = 'radio';
        inputEl.name = 'moveTo';
        inputEl.value = option.id;
        inputEl.id = option.id;
        // selected recruiting by default
        if (option.id === moveToOptions[1].id) {
            inputEl.defaultChecked = true;
        }

        let labelEl = Dom.extension.createEl('label', 'radio-label');
        labelEl.for = option.id;
        labelEl.innerHTML = option.name;
        labelEl.onclick = onMoveToRadioGroupChange;

        radioGroupBlockEl.appendChild(inputEl);
        radioGroupBlockEl.appendChild(labelEl);
    });


    radioGroupEl.appendChild(nameEl);
    radioGroupEl.appendChild(radioGroupBlockEl);

    return radioGroupEl;
};

/**
 * Resolves received options promise
 * @param {*} options - options list if exist
 * @param {Function} resolve - promise resolve function
 * @param {Function} reject - promise reject function
 * @return {void}
 */
const resolveReceivedOptions = (options, resolve, reject) => {
    if (options?.length >= 0) {
        resolve(options);
    } else {
        reject();
    }
}

/**
 * Get recruitment candidate info sources
 * @return {Promise<Array>} - promise
 */
const getRecruitmentInfoSources = () => {
    return new Promise((resolve, reject) => {
        sendContextMessage(MSG.getInfoSources, null,
            (result) => {
                const recruitmentInfoSources = result?.filter(el => el.type === infoSourceCategoryNames.recruitment);
                resolveReceivedOptions(recruitmentInfoSources, resolve, reject);
            });
    });
};

/**
 * Get job family groups
 * @return {Promise<Array>} - promise
 */
const getJobFamilyGroups = () => {
    return new Promise((resolve, reject) => {
        sendContextMessage(MSG.getJobFamilyGroups, null,
            (result) => {
                resolveReceivedOptions(result, resolve, reject);
            });
    });
};

/**
 * Get job families
 * @param {number|null} jobFamilyGroupId - job family group id
 * @return {Promise<Array>} - promise
 */
const getJobFamilies = (jobFamilyGroupId = null) => {
    return new Promise((resolve, reject) => {
        sendContextMessage(MSG.getJobFamilies, { jobFamilyGroupId },
            (result) => {
                resolveReceivedOptions(result, resolve, reject);
            });
    });
};

/**
 * Get job families
 * @param {number} jobFamilyGroupId - job family group id
 * @param {number} jobFamilyId - job family id
 * @return {Promise<Array>} - promise
 */
const getJobProfiles = (jobFamilyGroupId, jobFamilyId) => {
    return new Promise((resolve, reject) => {
        sendContextMessage(MSG.getJobProfiles, { jobFamilyGroupId, jobFamilyId },
            (result) => {
                resolveReceivedOptions(result, resolve, reject);
            });
    });
};

/**
 * Job family group change handler
 * @param {string} name - field name
 * @param {*} value - value
 * @param {Object} formData - all form data
 * @param {Object} fieldElsMapByName - fields map by name
 * @return {void}
 */
const onJobFamilyGroupChange = (name, value, formData, fieldElsMapByName) => {
    const jobFamilyEl = fieldElsMapByName[profileFieldNames.jobFamily].inputEl;
    const jobProfileEl = fieldElsMapByName[profileFieldNames.jobProfile].inputEl;
    jobFamilyEl.renderAvailableOptions(getJobFamilies(value));
    // clear selected values
    jobProfileEl.value = '';
    jobFamilyEl.value = '';
    formData[profileFieldNames.jobProfile] = '';
    formData[profileFieldNames.jobFamily] = '';
    jobProfileEl.disabled = true;
};

/**
 * Job family change handler
 * @param {string} name - field name
 * @param {*} value - value
 * @param {Object} formData - all form data
 * @param {Object} fieldElsMapByName - fields map by name
 * @return {void}
 */
const onJobFamilyChange = (name, value, formData, fieldElsMapByName) => {
    const isJobProfileEnabled = Boolean(value);
    const jobFamilyEl = fieldElsMapByName[profileFieldNames.jobFamily].inputEl;
    const jobProfileEl = fieldElsMapByName[profileFieldNames.jobProfile].inputEl;
    const jobFamilyGroupEl = fieldElsMapByName[profileFieldNames.jobFamilyGroup].inputEl;
    const jobFamilyGroupId = value ? jobFamilyEl.valuesMap[value].parent.id : null;

    if (jobFamilyGroupId) {
        if (formData[profileFieldNames.jobFamilyGroup] !== jobFamilyGroupId) {
            jobFamilyEl.renderAvailableOptions(getJobFamilies(jobFamilyGroupId), value);
            formData[profileFieldNames.jobFamilyGroup] = jobFamilyGroupId;
            jobFamilyGroupEl.value = jobFamilyGroupId;
        }
        jobProfileEl.renderAvailableOptions(getJobProfiles(jobFamilyGroupId, value));
    }
    // clear value
    jobProfileEl.value = '';
    formData[profileFieldNames.jobProfile] = '';
    jobProfileEl.disabled = !isJobProfileEnabled;
};

/**
 * Insert add candidate form
 * @param {string} linkedinUrl - linkedin url
 * @param {HTMLButtonElement} addCandidateButton - add candidate button
 * @returns {Element} DOM element
 */
const insertAddCandidateForm = (linkedinUrl, addCandidateButton) => {
    const jobFamilyId = profiles[linkedinUrl][profileFieldNames.jobFamily];
    const jobFamilyGroupId = profiles[linkedinUrl][profileFieldNames.jobFamilyGroup];
    const jobProfileId = profiles[linkedinUrl][profileFieldNames.jobProfile];
    const fieldsList = [{
            name: profileFieldNames.firstName,
            label: 'English First Name',
            pattern: englishNamePattern,
            type: formComponentTypes.textInput,
            isRequired: true,
            errorMessage: 'First Name should be in English'
        }, {
            name: profileFieldNames.lastName,
            label: 'English Last Name',
            pattern: englishNamePattern,
            isRequired: true,
            type: formComponentTypes.textInput,
            className: 'last-name',
            errorMessage: 'Last Name should be in English'
        }, {
            name: profileFieldNames.firstNameNative,
            label: 'Native First Name',
            type: formComponentTypes.textInput,
            isRequired: true
        }, {
            name: profileFieldNames.lastNameNative,
            label: 'Native Last Name',
            type: formComponentTypes.textInput,
            isRequired: true
        }, {
            name: profileFieldNames.candidateInfoSource,
            label: 'Info Source',
            type: formComponentTypes.select,
            getOptions: getRecruitmentInfoSources(),
            showGroups: true,
            isRequired: true
        }, {
            name: profileFieldNames.jobFamilyGroup,
            label: 'Job Family Group',
            type: formComponentTypes.select,
            getOptions: getJobFamilyGroups(),
            value: jobFamilyGroupId,
            onChange: onJobFamilyGroupChange,
            isRequired: true
        }, {
            name: profileFieldNames.jobFamily,
            label: 'Job Family',
            type: formComponentTypes.select,
            getOptions: getJobFamilies(),
            value: jobFamilyId,
            onChange: onJobFamilyChange,
            isRequired: true
        }, {
            name: profileFieldNames.jobProfile,
            label: 'Job Profile',
            type: formComponentTypes.select,
            isRequired: true,
            value: jobProfileId,
            getOptions: jobFamilyId ? getJobProfiles(jobFamilyGroupId, jobFamilyId) : null,
            isDisabled: !jobFamilyId
        }
    ];
    const filedElsMapByName = {};
    let formEl = document.createElement('form');
    profiles[linkedinUrl][profileFieldNames.candidateInfoSource] = infoSourceNames.searchOnLinkedIn;

    fieldsList.forEach((field) =>  {
        const formComponentEl =  renderFormInputBlock(field.name, {
            ...field,
            value: field.value || profiles[linkedinUrl][field.name],
            onChange: (name, value) => {
                if (field.onChange) {
                    field.onChange(name, value, profiles[linkedinUrl], filedElsMapByName);
                }
                onFormInputChange(name, value, profiles[linkedinUrl], fieldsList, addCandidateButton, filedElsMapByName);
            }
        });
        filedElsMapByName[field.name] = formComponentEl;
        formEl.appendChild(formComponentEl);
    });
    formEl.appendChild(insertRadioGroupEl());
    formEl.fieldsList = Object.values(filedElsMapByName);
    validateForm(profiles[linkedinUrl], fieldsList, filedElsMapByName, addCandidateButton);

    return formEl;
};

/**
 * Handle "Add" (new candidate to db) button click
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const onAddNewClick = (profileUrl) => {
    const fieldsList = Dom.extension.getPopoverFormEl().fieldsList;
    const formRadioGroup = Dom.extension.getPopoverFormRadiobuttons();
    const loadingText = 'Adding Candidate to the database...';
    let newCandidate = Object.assign({}, profiles[profileUrl]);
    fieldsList.forEach(field => {
        const input = field.inputEl;
        if (input.value) {
            const value = input.valuesMap ? input.valuesMap[input.value] : input.value;
            newCandidate[input.name] = value;
        }
    });

    let submitData = Object.assign({}, { profileData: newCandidate });
    // set only checked radiobutton to true into corresponding profile
    formRadioGroup.forEach(radioButton => radioButton.checked ? submitData[radioButton.value] = true : null);

    onPopoverClose();
    insertLoadingEl(loadingText);
    updateProfileLoadingInfo(profileUrl, true, loadingText);
    sendContextMessage(MSG.addNewCandidate, submitData, response => resolveAddNewCandidate(response, profileUrl));
};

/* exported populateCandidateData */
/**
 * Populate popover and fill in candidate's data
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const populateCandidateData = (profileUrl) => {
    let popoverInsideEl = Dom.extension.getPopoverInsideEl();
    popoverInsideEl.innerHTML = `<div class='results-header'>Adding Candidate to the database:</div>`;

    let popoverWrapperEl = document.createElement('div');
    popoverWrapperEl.className = 'popover-wrapper add-candidate-popover';
    const addCandidateButton = getActionButton({
        name: 'ADD NEW CANDIDATE',
        className: 'button-assign',
        disabled: true,
        onClick: () => onAddNewClick(profileUrl)
    });

    const actionsEl = getPopoverActionsBlock([
        getCancelPopoverButton(),
        addCandidateButton
    ]);

    popoverWrapperEl.appendChild(insertAddCandidateForm(profileUrl, addCandidateButton));
    popoverInsideEl.appendChild(insertButtonClosePopover());
    popoverInsideEl.appendChild(popoverWrapperEl);
    popoverInsideEl.appendChild(actionsEl);
};
