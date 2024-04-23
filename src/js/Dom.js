'use strict';

/* global ENVIRONMENT:true */
/* global MSG:true */
/* global sendContextMessage:true */
/* global onPopoverClose:true */

/* exported Dom */
// Service which provides methods to work with DOM
const Dom = (() => {
    // number of tries to get element on the page
    const WAIT_FOR_ELEMENT_MAX_COUNT = 20;
    // timeout for waiting if element is present on the page
    const WAIT_FOR_ELEMENT_INTERVAL = 500;

    /**
     * Waits if node exists and returns it, otherwise sends error
     * @param {String|Array} selector - element or array of selectors
     * @param {String} elementName - element name
     * @param {Boolean} sendError - to log error or not in case when element is not found on the page
     * @returns {Object} Promise with node or report an error
     */
    const waitForElement = (selector, elementName, sendError = false) => {
        // save current location to clear check interval if location was changed.
        const currentLocation = window.location.href;

        return new Promise(resolve => {
            if (!selector || !elementName) {
                return resolve();
            }
            let checkCount = 0;
            const selectorsList = Array.isArray(selector) ? selector : [selector];
            // this DOM block is loaded dynamically after awhile when all DOM is loaded.
            // Therefore check when Element has appeared every time interval.
            const intervalId = setInterval(() => {
                let node;

                selectorsList.some(s => {
                    node = document.querySelector(s);
                    console.log('Try to get selector: ' + s);
                    return node !== null;
                });
                checkCount++;
                if (node && node.innerHTML) {
                    resolve(node);
                    clearInterval(intervalId);
                } else if (checkCount === WAIT_FOR_ELEMENT_MAX_COUNT || window.location.href !== currentLocation) {
                    if (checkCount === WAIT_FOR_ELEMENT_MAX_COUNT && sendError) {
                        sendContextMessage(MSG.reportError, { source: 'Dom.js, resolve LinkedIn Node', message: `Failed to get "${elementName}" element` });
                    }
                    resolve();
                    clearInterval(intervalId);
                }
            }, WAIT_FOR_ELEMENT_INTERVAL);
        });
    };

    let panelEl = null;
    let popoverEl = null;

    const createPanelEl = () => {
        let el = document.createElement('div');
        let activitiesEl = document.createElement('div');
        let actionsEl = document.createElement('div');
        let alertEl = Dom.extension.createEl('div', 'alert-info');
        let additionalInfoEl = Dom.extension.createEl('div', 'additional-info');
        let collectionsInfoEl = Dom.extension.createEl('div', 'collections-info');
        let applicationsInfoEl = Dom.extension.createEl('div', 'applications-info');
        let disclaimerEl = document.createElement('div');

        el.id = 'sb-panel';
        activitiesEl.className = 'activities-block';
        actionsEl.className = 'actions-block';
        // show only for develop / test environments
        if (ENVIRONMENT.name) {
            let envEl = document.createElement('div');
            envEl.style.position = 'absolute';
            envEl.style.top = '0';
            envEl.style.left = '8px';
            envEl.style.height = '10px';
            envEl.style.lineHeight = '10px';
            envEl.style.fontSize = '10px';
            envEl.style.padding = '0 20px';
            envEl.style.backgroundColor = 'lawngreen';
            envEl.textContent = ENVIRONMENT.name;

            el.appendChild(envEl);
        }

        el.appendChild(alertEl);
        el.appendChild(activitiesEl);
        el.appendChild(actionsEl);
        additionalInfoEl.appendChild(collectionsInfoEl);
        additionalInfoEl.appendChild(applicationsInfoEl);
        el.appendChild(additionalInfoEl);
        el.appendChild(disclaimerEl);

        el.activitiesEl = activitiesEl;
        el.actionsEl = actionsEl;
        el.alertEl = alertEl;
        el.collectionsInfoEl = collectionsInfoEl;
        el.applicationsInfoEl = applicationsInfoEl;
        el.disclaimerEl = disclaimerEl;

        return panelEl = el;
    };

    const clearPanelContent = () => {
        if (panelEl) {
            panelEl.activitiesEl.innerHTML = '';
            panelEl.alertEl.innerHTML = '';
            panelEl.actionsEl.innerHTML = '';
            panelEl.applicationsInfoEl.innerHTML = '';
            panelEl.collectionsInfoEl.innerHTML = '';
        }
    }

    const createPopoverEl = () => {
        let el = document.createElement('div');
        el.id = 'sb-popover';
        el.className = 'hide';

        if (ENVIRONMENT.name) {
            let envEl = document.createElement('div');
            envEl.style.position = 'absolute';
            envEl.style.width = '100%';
            envEl.style.top = '0';
            envEl.style.textAlign = 'center';
            envEl.style.padding = '10px';
            envEl.style.backgroundColor = 'lawngreen';
            envEl.textContent = ENVIRONMENT.name;

            el.appendChild(envEl);
        }

        let popoverOutsideEl = document.createElement('div');
        popoverOutsideEl.className = 'popover-outside';
        popoverOutsideEl.onclick = onPopoverClose;

        let popoverInsideEl = document.createElement('div');
        popoverInsideEl.className = 'popover-inside';

        el.appendChild(popoverOutsideEl);
        el.appendChild(popoverInsideEl);

        el.popoverInsideEl = popoverInsideEl;

        return popoverEl = el;
    };

    /**
     * Get DOM element after which Panel should be inserted
     * @param {boolean} isRecruiterPage - is linkedin recruiter page or public profile
     * @return {Object} - promise for Node element
     */
    const getPanelInsertionEl = (isRecruiterPage) => {
        let selectorForInsertion;
        if (isRecruiterPage) {
            selectorForInsertion = ['#profile-container .profile__topcard-wrapper',
                                    '#profile-container > *:first-child > *:first-child'];
        } else {
            selectorForInsertion = ['#profile-content .artdeco-card .ph5 > *:last-child',
                '#profile-content .pv-profile-section.pv-top-card-section .mt4.display-flex.ember-view',
                '#profile-content > *:first-child > *:first-child'];
        }
        return waitForElement(selectorForInsertion, 'Panel for Insertion Plugin', true);
    };

    /**
     * Get connection degree element
     * @return {Node} Node element
     */
    const getConnectionDegreeEl = () => {
        return waitForElement(
            ['#profile-content .distance-badge .dist-value',
            '#profile-container .artdeco-entity-lockup__degree',
            '#profile-content .pv-profile-section.pv-top-card-section .pv-top-card-section__distance-badge .dist-value'],
            'Connection Degree');
    };

    /**
     * Get public profile link element on recruiter page
     * @return {Node} Node element
     */
    const getRecruiterPagePublicProfileEl = () => {
        return waitForElement('.personal-info a', 'Profile link on recruiter page');
    };

    /**
     * Get navigation bar element
     * @return {Object} Promise to be resolved by node element
     */
    const getNavigationBarEl = () => {
        return waitForElement('.global-nav', 'Global navigation panel', true);
    };

    /**
     * Create div element
     * @param {String} tag - html tag
     * @param {String} cssClassName - css class name
     * @return {HTMLElement} Node element
     */
    const createEl = (tag, cssClassName) => {
        let el = document.createElement(tag);
        el.className = cssClassName ? cssClassName : '';
        return el;
    };

    /**
     * Remove panel disclaimer element
     * @return {*} Node element
     */
    const removePanelDisclaimerEl = () => {
        if (panelEl?.disclaimerEl) {
            panelEl.removeChild(panelEl.disclaimerEl);
            panelEl.disclaimerEl = null;
        }
    };

    return {
        linkedin: {
            getNavigationEl: getNavigationBarEl,
            getPanelInsertionEl: getPanelInsertionEl,
            getConnectionDegreeEl: getConnectionDegreeEl,
            getRecruiterPagePublicProfileEl: getRecruiterPagePublicProfileEl
        },
        extension: {
            createPanelEl: () => createPanelEl(),
            removePanelEl: () => panelEl ? panelEl = null : null,
            createEl: (tag, cssClassName) => createEl(tag, cssClassName),
            getPanelEl: () => document.getElementById('sb-panel'),
            clearPanelContent,
            getPanelActivitiesEl: () => panelEl ? panelEl.activitiesEl : null,
            getAlertEl: () => panelEl ? panelEl.alertEl : null,
            getPanelActionsEl: () => panelEl ? panelEl.actionsEl : null,
            getCollectionsInfoEl: () => panelEl ? panelEl.collectionsInfoEl : null,
            getApplicationsInfoEl: () => panelEl ? panelEl.applicationsInfoEl : null,
            removePanelDisclaimerEl: () => removePanelDisclaimerEl(),
            createPopoverEl: () => createPopoverEl(),
            removePopoverEl: () => popoverEl ? popoverEl = null : null,
            getPopoverEl: () => popoverEl,
            getPopoverInsideEl: () => popoverEl.popoverInsideEl,
            getPopoverFormEl: () => popoverEl.popoverInsideEl.querySelectorAll('form')[0],
            getVacancyStatusBarEl: (vacancyId) => popoverEl.popoverInsideEl.querySelectorAll(`form .status-bar[data-vacancy="${vacancyId}"]`)[0],
            getPopoverSelectAllCheckbox: () => popoverEl.popoverInsideEl.querySelectorAll('.checkboxes-block .name input[type=checkbox]')[0],
            getPopoverFormSelectedCheckboxes: () => popoverEl.popoverInsideEl.querySelectorAll('form input[type=checkbox]:checked'),
            getPopoverFormEnabledCheckboxes: () => popoverEl.popoverInsideEl.querySelectorAll('form input[type=checkbox]:not(:disabled)'),
            getPopoverFormRadiobuttons: () => popoverEl.popoverInsideEl.querySelectorAll('form input[type=radio]'),
            getPopoverFormRadiobuttonById: (radioButtonId) => popoverEl.popoverInsideEl.querySelectorAll(`form input[id=${radioButtonId}]`)[0],
            getPopoverFormTextfields: () => popoverEl.popoverInsideEl.querySelectorAll('form input[type=text]'),
            getPopoverFormTextAndSelectFields: () => popoverEl.popoverInsideEl.querySelectorAll('form input[type=text], form select'),
            getPeopleFromSearchResult: () => document.querySelectorAll('[data-chameleon-result-urn^="urn:li:member"]'),
            getPopoverSubmitButton: () => popoverEl.popoverInsideEl.querySelectorAll('button.sb-button:not(.secondary)')[0]
        }
    };
})();
