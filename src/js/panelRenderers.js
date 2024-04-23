'use strict';

/* global Dom:true */
/* global onPopoverClose:true */
/* global populateCandidateData:true */
/* global sendContextMessage:true */
/* global MSG:true */
/* global forbiddenStatuses:true */
/* global populateMatchesPopover:true */
/* global populateConfirmUnlinkPopover:true */
/* global insertLoadingPopover:true */
/* global populateVacanciesPopover:true */
/* global insertPopoverError:true */
/* global populateUpdateCandidatePopover:true */
/* global resolveReceivedLastActivity:true */
/* global profiles:true */
/* global updateProfileLoadingInfo:true */
/* global parseLinkedinUrl:true */

// cache for collections stage options
const stageOptionsByCollectionId = {};
// collections list element reference
let collectionsListEl;

const employeeDisabledActionTitle = 'Operation is disabled for candidates with "Employee" status.';

/**
 * Insert loading animation with message
 * @param {String} message - message to show on panel
 * @returns {void}
 */
const insertLoadingEl = (message = 'Loading...') => {
    Dom.extension.clearPanelContent();
    let activitiesEl = Dom.extension.getPanelActivitiesEl();

    if (activitiesEl) {
        activitiesEl.innerHTML = `
            <div class='loading-block search'>
                <div class='loader'>Loading...</div>
                <div class='message'>${message}</div>
            </div>`;
    }
};

/* exported insertPanelEl */
/**
 * Insert panel element when necessary linkedin element available
 * @param {boolean} isRecruiterPage - flag which determines whether it's recruiter page or public profile
 * @return {Object} Promise
 */
const insertPanelEl = (isRecruiterPage) => {
    return Dom.linkedin.getPanelInsertionEl(isRecruiterPage).then(insertionEl => {
        if (insertionEl) {
            if (!Dom.extension.getPanelEl()) {
                insertionEl.after(Dom.extension.createPanelEl());
            }
            insertLoadingEl('Searching candidate...');
        } else {
            throw 'Insertion panel was not found';
        }
    })
};

/**
 * Insert warning block
 * @param {String} message - warning message
 * @param {String} className - css class name
 * @returns {Element} Dom element
 */
const insertWarningEl = (message, className = '') => {
    let warningBlock = document.createElement('div');
    warningBlock.className = 'warning-message-block ' + className;
    warningBlock.innerHTML = `
        <img class="icon" src='${chrome.runtime.getURL('../icons/warning.png')}' />
        <div class='message'>${message}</div>`;

    return warningBlock;
};

/**
 * Handle "Add" (new candidate to db) button click
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const onAddNewDialogOpen = (profileUrl) => {
    onPopoverClose();
    populateCandidateData(profileUrl);
    openPopover();
};

/**
 * Insert "Add" (this LinkedIn profile to db) button
 * @param {string} profileUrl - linkedin profile url
 * @param {boolean} isDisabled - is disabled flag
 * @returns {Element} Dom element
 */
const insertAddNewCandidateButton = (profileUrl, isDisabled = false) => {
    return getActionButton({
        name: 'ADD',
        className: 'button-add',
        disabled: isDisabled,
        title: isDisabled ? null : 'Add new candidate to db',
        onClick: () => onAddNewDialogOpen(profileUrl)
    });
};

/* exported insertAddCandidateEl */
/**
 * Insert "Add Candidate" block
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const insertAddCandidateEl = (profileUrl) => {
    let activitiesEl = Dom.extension.getPanelActivitiesEl();
    let actionsEl = Dom.extension.getPanelActionsEl();

    if (actionsEl && activitiesEl) {
        Dom.extension.clearPanelContent();
        activitiesEl.appendChild(insertWarningEl('Candidate was not found. Click "Add" button and we will create it for you.', 'add'));
        actionsEl.appendChild(insertAddNewCandidateButton(profileUrl));
    }
};

/**
 * Open confirm dialog on confirm button click
 * @param {Object} candidate - candidate
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const confirmUnlinkDialog = (candidate, profileUrl) => {
    populateConfirmUnlinkPopover(candidate, profileUrl);
    openPopover();
};

/**
 * Renders error message inside main panel
 * @param {String} message - error text
 * @return {void}
 */
const renderPanelError = (message) => {
    const activitiesEl = Dom.extension.getPanelActivitiesEl();

    Dom.extension.clearPanelContent();
    activitiesEl.appendChild(insertWarningEl(message));
};

const onAddToVacancyClick = (candidate) => {
    insertLoadingPopover('Searching for vacancies...');
    openPopover();

    sendContextMessage(MSG.getVacancies, null, response => {
        if (response.result.length >= 0) {
            populateVacanciesPopover(response.result, candidate);
        } else {
            insertPopoverError(response.errorMessage);
            renderPanelError(response.errorMessage);
        }
    });
};

/**
 * Render DOM with button which opens unlink dialog
 * @param {Object} candidate - candidate props
 * @param {string} profileUrl - linkedin profile url
 * @returns {HTMLDivElement} DOM element
 */
const renderButtonUnlink = (candidate, profileUrl) => {
    let unlinkWrapperEl = Dom.extension.createEl('span', 'unlink-wrapper');
    let unlinkTextEl = Dom.extension.createEl('span');
    unlinkTextEl.textContent = 'Wrong match? ';

    let buttonUnlink = Dom.extension.createEl('a', 'button-unlink');
    buttonUnlink.textContent = 'Unlink';
    buttonUnlink.onclick = () => confirmUnlinkDialog(candidate, profileUrl);
    buttonUnlink.title = 'Unlink candidate';

    unlinkWrapperEl.appendChild(unlinkTextEl);
    unlinkWrapperEl.appendChild(buttonUnlink);

    return unlinkWrapperEl;
};

/**
 * Populating list for button menu (Add to Collection)
 * @param {Object} options - options list
 * @param {Object} menuListEl - menu list element
 * @param {Function} onClick - onclick action handler
 * @return {void}
 */
const populateButtonMenuList = (options, menuListEl, onClick) => {
    options.forEach((option) => {
        let item = document.createElement('li');
        item.className = 'menu-item';
        item.onmousedown = () => onClick(option);
        item.innerText = option.name;
        item.title = option.name;
        menuListEl.appendChild(item);
    });
}

/**
 * Get editable collections list
 * @return {Promise<>} - promise
 */
const getEditableCollections = () => {
    return new Promise((resolve, reject) => {
        sendContextMessage(MSG.getEditableCollections, null,
            response => {
                if (response.result.length >= 0) {
                    resolve(response.result);
                } else {
                    showPopoverError(response.errorMessage);
                    reject();
                }
            });
    });
};

/**
 * Add to collection action handler
 * @param {Object} candidate - candidate information
 * @param {Object} collection - collection
 * @param {Boolean} allowSameCards - flag for allowing add candidate again
 * @return {void}
 */
const addCandidateToCollection = (candidate, collection, allowSameCards) => {
    sendContextMessage(MSG.addCandidateToCollection, { candidate, collection, allowSameCards },response => {
        if (response.result !== false) {
            showNotification(`"${candidate.fullName}" was added to "${collection.name}" collection!`);

            // add a new item into collections info
            const newCollectionItem = { cardId: response.result.id, collectionId: collection.id, collectionName: collection.name, isEditAllowed: true };
            if (candidate.collections?.length) {
                candidate.collections.unshift(newCollectionItem);
                getCollectionRowItem(newCollectionItem, 0, candidate.collections).then(el => collectionsListEl.prepend(el));
            } else {
                candidate.collections = [newCollectionItem];
                renderCollectionsInfo(candidate.collections);
            }
        } else {
            if (response.status === 409) {
                showConfirmationBox(`<b>${candidate.fullName}</b> is already added to this collection. Do you really want to add this candidate one more time?`,
                    () => addCandidateToCollection(candidate, collection, true), 'Add to Collection');
            } else {
                insertPopoverError(response.errorMessage);
                openPopover();
            }
        }
    });
}

/**
 * Render DOM for 'Add to Collection' button menu
 * @param {Object} candidate - candidate information
 * @param {Boolean} isEmployee - is candidate employee
 * @return {HTMLDivElement}
 */
const renderAddToCollectionButtonMenu = (candidate, isEmployee) => {
    let addToCollectionBox = Dom.extension.createEl('div', 'add-to-collection-box');
    const buttonAddToCollection = getActionButton({
        name: 'ADD TO COLLECTION',
        onBlur: () => {
            setTimeout(() => menuList.classList.remove('show'), 200);
        },
        disabled: isEmployee,
        title: isEmployee ? employeeDisabledActionTitle : null,
        onClick: isEmployee ? null : () => {
            addToCollectionBox.classList.add(loadingClassName);
            getEditableCollections().then((collections) => {
                if (collections.length > 0) {
                    menuList.innerHTML = '';
                    populateButtonMenuList(collections, menuList, (collection) => {
                        addCandidateToCollection(candidate, collection);
                    });
                } else {
                    menuList.innerHTML = '<li class="empty-text">No Collections with edit rights</li>';
                }
                menuList.classList.add('show');
                buttonAddToCollection.focus();
                menuList.scrollTop = 0;
            }).finally(() => {
                addToCollectionBox.classList.remove(loadingClassName);
            });
        }
    })
    let loadingBlock = Dom.extension.createEl('div', 'loading-block');
    let menuList = Dom.extension.createEl('ul', 'menu-list');

    loadingBlock.innerHTML = '<div class="loader" />';
    addToCollectionBox.appendChild(buttonAddToCollection);
    addToCollectionBox.appendChild(loadingBlock);
    addToCollectionBox.appendChild(menuList);

    return addToCollectionBox;
}

/**
 * Insert Found Match set of buttons
 * @param {Object} candidate - candidate
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const insertFoundMatchActionsEl = (candidate, linkedinUrl) => {
    let actionsEl = Dom.extension.getPanelActionsEl();
    const isEmployee = candidate.status === candidateStatuses.employee;
    const buttonAddToVacancy = getActionButton({
        name: 'ADD TO VACANCY',
        className: 'button-add-to-vacancy',
        title: isEmployee ? employeeDisabledActionTitle : null,
        onClick: isEmployee ? null : () => onAddToVacancyClick(candidate),
        disabled: isEmployee
    })
    const buttonMenuAddToCollection = renderAddToCollectionButtonMenu(candidate, isEmployee);
    actionsEl.innerHTML = '';
    actionsEl.appendChild(insertAssignToMeActionEl(candidate, linkedinUrl, isEmployee));
    actionsEl.appendChild(buttonAddToVacancy);
    actionsEl.appendChild(buttonMenuAddToCollection);
};

/**
 * Resolve response, using url check
 * @param {Object} response - XmlHTTPResponse
 * @param {Boolean} isAddNewCandidate - true if it is a "Add new candidate" call
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const resolveResponseWithUrlCheck = (response, isAddNewCandidate, profileUrl) => {
    updateProfileLoadingInfo(profileUrl, false, '');
    /* compare previous profile's linkedinId with current profile's linkedinId to
       avoid overriding a panel with outdated data, in case if user switched to different page during XMLHTTPRequest */
    if (profiles[profileUrl] && profiles[profileUrl].linkedinUrl && isLinkedinPageCurrentlyOpened(profiles[profileUrl].pageUrl)) {
        const successStatusCode = isAddNewCandidate ? 201 : 200;

        if (response.status === successStatusCode) {
            insertFoundMatchEl(response.result, profileUrl);
        } else {
            const defaultErrorMessage = isAddNewCandidate ? 'Error occurred while creating new candidate' :
                'Error occurred while assigning candidate to user';
            renderPanelError(response.errorMessage || defaultErrorMessage);
        }
    }
};

/**
 * Resolve response to "Assign to me" request
 * @param {Object} response - request response
 * @param {string} requestLinkedinUrl - linkedinUrl, at the moment of request was set
 * @returns {void}
 */
const resolveAssignToMe = (response, requestLinkedinUrl) => {
    resolveResponseWithUrlCheck(response, false, requestLinkedinUrl);
};

/**
 * Handle "Assign to me" button click
 * @param {String} candidateId - candidate id
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const onAssignToMeClick = (candidateId, linkedinUrl) => {
    const requestLinkedinUrl = profiles[linkedinUrl].linkedinUrl;
    updateProfileLoadingInfo(linkedinUrl, true, 'Assigning Candidate...');
    sendContextMessage(MSG.assignToMe, candidateId, response => resolveAssignToMe(response, requestLinkedinUrl));
};

/**
 * Render action button for assigning candidate for current user
 * @param {Object} candidate - candidate information
 * @param {string} linkedinUrl - linkedin url
 * @param {Boolean} isEmployee - is candidate employee
 * @returns {Node} insertEl
 */
const insertAssignToMeActionEl = (candidate, linkedinUrl, isEmployee) => {
    const disabled = candidate.isMyCandidate || isEmployee;
    return getActionButton({
        name: 'ASSIGN TO ME',
        className: 'assign-to-me',
        title: isEmployee ? employeeDisabledActionTitle :
            `${candidate.isMyCandidate ? '' : 'Assign candidate to me and set "Recruiting" status'}`,
        disabled,
        onClick: disabled ? null : () => {
            onAssignToMeClick(candidate.id, linkedinUrl);
        }
    }, true, true);
};

/**
 * Render columns block for found match
 * @param {Object} candidate - candidate props
 * @returns {Element} Dom element
 */
const renderMatchColumnsEl = (candidate) => {
    let columnsEl = document.createElement('div');
    columnsEl.className = 'columns';

    let columnLeftEl = document.createElement('div');
    columnLeftEl.className = 'column';
    columnLeftEl.innerHTML = `
        <div class='icon-info-block'>
            <img src='${chrome.runtime.getURL('icons/email.png')}' alt='e-mail' class='icon-left' />
            <div>${candidate.email ? `<a href='mailto:${candidate.email}'}>${candidate.email}</a>` : '-'}</div>
        </div>
        <div class='icon-info-block'>
            <img src='${chrome.runtime.getURL('/icons/phone.png')}' alt='Phone' class='icon-left' />
            <div>${candidate.phone || '-'}</div>
        </div>
        <div class='icon-info-block'>
            <img src='${chrome.runtime.getURL('/icons/skype.png')}' alt='Skype' class='icon-left' />
            <div>${candidate.skype ? `<a href='skype:${candidate.skype}?chat'}>${candidate.skype}</a>` : '-'}</div>
        </div>`;

    let columnRightEl = Dom.extension.createEl('div', 'column');
    columnRightEl.innerHTML = `
        <div class='icon-info-block'>
           <img src='${chrome.runtime.getURL('/icons/tools.png')}' title='Job Family' alt='Job Family' class='icon-left' />
           <div>${candidate.cg || '-'}</div>
        </div>
        <div class='icon-info-block'>
            <img src='${chrome.runtime.getURL('icons/user-avatar.png')}' title='Recruiter' alt='Recruiter' class='icon-left' />
            <div>${candidate.recruiterName || '-'}</div>
        </div>
        <div class='icon-info-block last-activity' title=''>
            <img src='${chrome.runtime.getURL('icons/file-edit.png')}' title='Last Activity' alt='Last Activity' class='icon-left' />
            ${candidate.lastActivityDate ? formatLastActivities(candidate) : '<div>-</div>'}
        </div>
    `;

    columnsEl.appendChild(columnLeftEl);
    columnsEl.appendChild(columnRightEl);

    return columnsEl;
};

/**
 * Gets stage options in collection
 * @param {Object} collection - collection information
 * @return {Object} - promise
 */
const getCollectionStageOptions = (collection) => {
    if (stageOptionsByCollectionId[collection.collectionId]) {
        return Promise.resolve(stageOptionsByCollectionId[collection.collectionId]);
    }
    // create new request for retrieving collection's stages
    const stageOptionsPromise = new Promise((resolve, reject) => {
        sendContextMessage(MSG.getCollectionStages, collection, response => {
            if (response.result.length >= 0) {
                stageOptionsByCollectionId[collection.collectionId] = response.result;
                resolve(response.result);
            } else {
                showPopoverError(response.errorMessage);
                reject();
            }
        });
    });

    stageOptionsByCollectionId[collection.collectionId] = stageOptionsPromise;
    return stageOptionsPromise;
}

/**
 * Collection card stage change handler
 * @param {Node} selectEl - select input element
 * @param {Object} collection - collection information
 * @param {Array} stageOptions - collection all available options list
 * @return {void}
 */
const changeCardStageInCollection = (selectEl, collection, stageOptions) => {
    const stageIndex = parseInt(selectEl.value);
    const stageId = stageIndex > 0 ? stageOptions[stageIndex - 1].id : null;

    sendContextMessage(MSG.moveCollectionCardToStage, { collectionId: collection.collectionId, cardId: collection.cardId, stageId }, response => {
        if (response.result === false) {
            showPopoverError(response.errorMessage);
        }
    });
}

/**
 * Gets stage select input for collection.
 * @param {Object} collection - collection information
 * @param {Array} stageOptions - collection's available stages
 * @return {Element} - stage select element
 */
const getCollectionStageSelector = (collection, stageOptions) => {
    const selectEl = Dom.extension.createEl('select', `stage${collection.isEditAllowed ? '' : ' disabled'}`);
    selectEl.title = collection.isEditAllowed ? 'Select Stage' : noAccessTitle;
    selectEl.disabled = !collection.isEditAllowed;
    if (collection.cardStage?.name) {
        selectEl.value = 0;
    }
    [{ name: '--' }].concat(stageOptions).forEach((stage, index) => {
        const optionEl = Dom.extension.createEl('option');
        optionEl.value = index;
        optionEl.name = `stage_${index}`;
        optionEl.textContent = stage.name;
        optionEl.title = stage.name;
        if (collection.cardStage?.name === stage.name) {
            optionEl.selected = true;
        }
        selectEl.appendChild(optionEl);
    });
    selectEl.onchange = collection.isEditAllowed ? (e) => changeCardStageInCollection(e.target, collection, stageOptions) : null;

    return selectEl;
};

/**
 * Deletes card from collection with confirmation
 * @param{Object} collection - collection information
 * @param{Number} index - collection index in the list
 * @param{Array} collections - collections list info
 * @param{Node} itemEl - collection item DOM el
 * @return {void}
 */
const deleteCardFromCollection = (collection, index, collections, itemEl) => {
    showConfirmationBox(`Do you really want to delete candidate card from the <b>"${collection.collectionName}"</b>?`,
        () => {
            sendContextMessage(MSG.deleteCollectionCard, collection, response => {
                if (response.result === false) {
                    showPopoverError(response.errorMessage);
                } else {
                    collections.splice(index, 1);
                    // remove element in DOM
                    itemEl.parentElement.removeChild(itemEl);
                    if (!collections.length) {
                        // clear all information related collections in case when no rows
                        Dom.extension.getCollectionsInfoEl().innerHTML = '';
                    }
                }
            });
        }, 'Delete from Collection');
};

/**
 * Get collections item row where candidate is assigned in
 * @param {Object} collection - collection information where candidate assigned in
 * @param {Number} index - index in the list
 * @param {Array} collections - collections list
 * @returns {Object} - promise for row item
 */
const getCollectionRowItem = (collection, index, collections) => {
    return getCollectionStageOptions(collection).then((stageOptions) => {
        const itemEl = Dom.extension.createEl('div', 'item');
        itemEl.innerHTML = `
            <div class='name'>
                <a target='_blank' rel='noopener noreferrer' title='Open Collection "${collection.collectionName}"'
                 href='${ENVIRONMENT.url}/mySpace/collections/${collection.collectionId}'>${collection.collectionName}</a>
            </div>
        `;
        const stageEl = getCollectionStageSelector(collection, stageOptions);
        const actionEl = Dom.extension.createEl('div', `action${collection.isEditAllowed ? '' : ' disabled'}`);
        const actionImgEl = Dom.extension.createEl('img', 'remove');

        actionEl.onclick = collection.isEditAllowed ? () => deleteCardFromCollection(collection, index, collections, itemEl) : null;
        actionImgEl.src = chrome.runtime.getURL('../icons/delete.png');
        actionImgEl.alt = actionImgEl.title = collection.isEditAllowed ? 'Remove from Collection' : noAccessTitle;
        actionEl.appendChild(actionImgEl);
        itemEl.appendChild(stageEl);
        itemEl.appendChild(actionEl);

        return itemEl;
    });
};

/**
 * Get collections item rows where candidate is assigned in
 * @param {Array} collections - collections information
 * @returns {Element} Dom element
 */
const getCollectionRowItems = (collections) => {
    const itemsEl = Dom.extension.createEl('div', 'items');
    const promises = [];

    collections.forEach((collection, index) => {
        promises.push(getCollectionRowItem(collection, index, collections));
    });

    Promise.all(promises).then((els) => {
        // insert all records in correct order
        els.forEach(el => itemsEl.appendChild(el));
    });

    return itemsEl;
};

/**
 * Renders collections candidate is assigned in
 * @param {Array} candidateCollections - candidate collections information list
 * @returns {Element} Dom element
 */
const renderCollectionsInfo = (candidateCollections) => {
    const collectionsInfoEl = Dom.extension.getCollectionsInfoEl();
    const itemsEl = getCollectionRowItems(candidateCollections);

    collectionsInfoEl.innerHTML = `
        <div class='title'>Added to Collections</div>
        <div class='headers item'>
            <div class='name'>Name</div>
            <div class='stage'>Stage</div>
            <div class='action'>Actions</div>
        </div>
    `;
    collectionsInfoEl.appendChild(itemsEl);
    // save element reference
    collectionsListEl = itemsEl;

    return collectionsInfoEl;
};

/**
 * Custom renderer for application stage value in format - <stage name>, <date set on>
 * @param {string} stage - stage name
 * @param {Object} applicationInfo - application information
 * @return {Object} - rendered stage name
 */
const applicationStageRenderer = (stage, applicationInfo) => {
    const stageEl = Dom.extension.createEl('div', 'stage-info');
    let title = stage;
    let text = stage;
    if (applicationInfo.stageUpdatedOn) {
        text = text + `, ${formatDateRelatively(applicationInfo.stageUpdatedOn, false, true)}`;
        title = text + ` (${formatDate(applicationInfo.stageUpdatedOn, true)})`;
    }
    stageEl.title = title;
    stageEl.textContent = text;
    return stageEl;
}

/**
 * Renders candidate applications information
 * @param {Array} candidateCollections - candidate applications information list
 * @returns {void} Dom element
 */
const renderApplicationsInfo = (candidateApplications) => {
    const applicationsInfoEl = Dom.extension.getApplicationsInfoEl();
    const columns = [{
        fieldName: 'vacancyRole',
        title: 'Role'
    }, {
        fieldName: 'jobFamilyName',
        title: 'Job Family'
    }, {
        fieldName: 'stageName',
        title: 'Stage',
        valueRenderer: applicationStageRenderer
    }]
    const applicationsTableEl = renderInformationTable(candidateApplications, columns, 'Vacancies', 'applications-info');
    applicationsInfoEl.innerHTML = '';
    applicationsInfoEl.appendChild(applicationsTableEl);
};

const renderInformationTable = (data, columns, mainTitle, tableCssClass) => {
    const informationTableEl = Dom.extension.createEl('div', `table-info${tableCssClass ? ` ${tableCssClass}` : ''}`);
    const itemsEl = Dom.extension.createEl('div', 'items');
    let informationHeaderHTML = `
        <div class='title'>${mainTitle}</div>
        <div class='headers item'>
    `;
    columns.forEach((column, i) => informationHeaderHTML += `<div class="col-${i}">${column.title}</div>`);

    informationHeaderHTML += '</div>';
    informationTableEl.innerHTML = informationHeaderHTML;
    data.forEach((item, i) => {
        const itemEl = Dom.extension.createEl('div', `item`);
        columns.forEach((col, index) => {
            const cellEl = Dom.extension.createEl('div', `col-${index}`);
            if (col.valueRenderer) {
                cellEl.appendChild(col.valueRenderer(item[col.fieldName], item));
            } else {
                cellEl.textContent = cellEl.title = item[col.fieldName] || '';
            }
            itemEl.appendChild(cellEl);
        })
        itemsEl.appendChild(itemEl);
    });
    informationTableEl.appendChild(itemsEl);

    return informationTableEl;
};

/**
 * Render candidate in panel
 * @param {Object} candidate - candidate props
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const insertFoundMatchEl = (candidate, profileUrl) => {
    const fullName = candidate.firstName + ' ' + candidate.lastName;
    const activitiesEl = Dom.extension.getPanelActivitiesEl();
    Dom.extension.clearPanelContent();

    let foundBlockEl = document.createElement('div');
    foundBlockEl.className = 'found-block';

    let statusBlockEl = document.createElement('div');
    statusBlockEl.className = 'status-block';
    statusBlockEl.innerHTML = `
        <div class='name'>
            <span class='full-name' title='${fullName}'>${fullName}</span>
            <div title='Status' class='button-text'>
                ${candidate.status}
                ${candidate.isFormerEmployee ? ', Ex-Employee' : ''}
            </div>
            ${candidate.hasActiveHiringRestriction ? `
                <div class='button-text error hiring-restricted' title='Navigate to profile to see the details'>
                    <img src='${chrome.runtime.getURL('../icons/warning-small.png')}' class='icon' />
                    Hiring Restricted
                </div>
            ` : ''}
        </div>
    `;
    if (candidate.isEmployeeEligibleForRehire === false) {
        const alertEl = Dom.extension.getAlertEl();
        alertEl.innerHTML = renderWarningAlert(
            'Candidate is an ex-employee and is marked as not eligible for rehire.' +
            ' Before starting the staffing process, please make sure the candidate can be hired back to the company.'
        );
    }
    const sbInfoEl = Dom.extension.createEl('div', 'sb-info');

    sbInfoEl.innerHTML = `Is in the <a href='${candidate.profileUrl || '#'}' rel='noopener noreferrer' title='Open candidate in Staffing Board' target='_blank'>Database</a>.&nbsp;`
    sbInfoEl.appendChild(renderButtonUnlink(candidate, profileUrl))
    statusBlockEl.appendChild(sbInfoEl);
    foundBlockEl.appendChild(statusBlockEl);
    foundBlockEl.appendChild(renderMatchColumnsEl(candidate));
    if (candidate.collections?.length) {
        renderCollectionsInfo(candidate.collections);
    }
    if (candidate.applications?.length) {
        renderApplicationsInfo(candidate.applications);
    }
    activitiesEl.appendChild(foundBlockEl);
    insertFoundMatchActionsEl(candidate, profileUrl);
};

/**
 * Handle "Show" button click
 * @param {Array} candidates - candidates list
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const onMatchCandidatesButtonClick = (candidates, linkedinUrl) => {
    populateMatchesPopover(candidates, linkedinUrl);
    openPopover();
};

/**
 * Insert "Show" button into DOM
 * @param {Array} candidates - candidates list
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const insertMatchCandidatesButton = (candidates, linkedinUrl) => {
    const actionsEl = Dom.extension.getPanelActionsEl();
    const buttonShow = getActionButton({
        name: 'MATCH CANDIDATE...',
        onClick: () => onMatchCandidatesButtonClick(candidates, linkedinUrl)
    });

    actionsEl.innerHTML = '';
    actionsEl.appendChild(buttonShow);
};

/**
 * Gets "Find" button element
 * @param {string} profileUrl - linkedin profile url
 * @returns {Object} - button element
 */
const getFindCandidateButton = (profileUrl) => {
    return getActionButton({
        name: 'FIND',
        className: 'find-candidate',
        disabled: true,
        onClick: () => {
            insertLoadingEl();
            sendContextMessage(MSG.searchCandidates, profiles[profileUrl],response => resolveReceivedCandidates(response, profileUrl));
        }
    });
};

/* exported renderFindCandidatePanel */
/**
 * Renders find candidate panel with first name and last name inputs
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const renderFindCandidatePanel = (profileUrl) => {
    let activitiesEl = Dom.extension.getPanelActivitiesEl();
    let actionsEl = Dom.extension.getPanelActionsEl();
    const formFields = [{
        name: profileFieldNames.firstName,
        type: formComponentTypes.textInput,
        label: 'First Name',
        isRequired: true
    }, {
        name: profileFieldNames.lastName,
        type: formComponentTypes.textInput,
        label: 'Last Name',
        isRequired: true
    }];

    if (actionsEl && activitiesEl) {
        Dom.extension.clearPanelContent();
        let formEl = Dom.extension.createEl('form', 'find-form');
        const findCandidateButton = getFindCandidateButton(profileUrl);
        const filedElsMapByName = {};
        const onInputChange = (name, value) => {
            onFormInputChange(name, value, profiles[profileUrl], formFields, findCandidateButton, filedElsMapByName);
        }

        activitiesEl.appendChild(insertWarningEl('Cannot extract first/last name. Please enter them manually to search for the candidate.', 'add'));
        formFields.forEach((formField) => {
            const formComponentEl = renderFormInputBlock(formField.name, {
                ...formField,
                value: profiles[profileUrl][formField.name],
                onChange: onInputChange
            });
            formEl.appendChild(formComponentEl);
            filedElsMapByName[formField.name] = formComponentEl;
        });
        activitiesEl.appendChild(formEl);
        // add find button
        actionsEl.appendChild(findCandidateButton);
    }
};

/* exported insertFoundMultipleCandidatesEl */
/**
 * Render message with number of candidates found
 * @param {Array} candidates - search results with matched candidates
 * @param {string} linkedinUrl - linkedin url
 * @returns {void}
 */
const insertFoundMultipleCandidatesEl = (candidates, linkedinUrl) => {
    let activitiesEl = Dom.extension.getPanelActivitiesEl();
    if (activitiesEl) {
        const number = candidates.length;
        const numberOfMatches = number === 1 ? number + ' possible match' : number + ' possible matches';
        activitiesEl.innerHTML = `<div class='found-block'>${numberOfMatches} found.</div>`;

        insertMatchCandidatesButton(candidates, linkedinUrl);
    }
};

/* exported resolveAddNewCandidate */
/**
 * Resolve "Add" (new candidate to db) request
 * @param {Object} response - request response
 * @param {string} profileUrl - linkedin profile url
 * @returns {void}
 */
const resolveAddNewCandidate = (response, profileUrl) => {
    resolveResponseWithUrlCheck(response, true, profileUrl);
    updateMostOutdatedCandidateProfiles();
};

/* exported resolveCandidateUnlink */
/**
 * Resolve unlinking candidate request
 * @param {Object} response - response
 * @returns {void}
 */
const resolveCandidateUnlink = (response) => {
    if (response.status === 200) {
        let activitiesEl = Dom.extension.getPanelActivitiesEl();
        activitiesEl.innerHTML = '';
        activitiesEl.appendChild(insertWarningEl('Candidate was unlinked. Please refresh this page after awhile to see this took effect.', 'nowrap'));
    } else {
        renderPanelError(response.errorMessage || 'Error occurred while creating new candidate');
    }
};
