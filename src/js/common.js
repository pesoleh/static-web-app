'use strict';

const actionDisabledTitle = 'Operation is disabled';

const textInputMaxLengthDefault = 45;

const formComponentTypes = {
    textInput: 'textInput',
    select: 'select'
};

const errorClassName = 'error';

const requiredClassName = 'required';

const loadingClassName = 'loading';

/**
 * Renders form text input component
 * @param {string} fieldName - input name
 * @param {Object} props - input props
 * @return {HTMLInputElement} - text input element
 */
const renderFormTextInputComponent = (fieldName, props) => {
    let inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.name = fieldName;
    inputEl.placeholder = props.placeholder || props.label;
    inputEl.maxLength = props.maxLength || textInputMaxLengthDefault;
    inputEl.oninput = (event) => props.onChange(fieldName, event.target.value, event.target);
    if (props.pattern) {
        inputEl.setAttribute('data-pattern-error', props.errorMessage);
        inputEl.pattern = props.pattern;
    }
    if (props.value) {
        inputEl.value = props.value;
    }

    return inputEl;
}

/**
 * Renders form selectbox component
 * @param {string} fieldName - selectbox name
 * @param {Object} props - selectbox props
 * @return {Object} - selectbox component
 */
const renderFormSelectboxComponent = (fieldName, props) => {
    const selectComponent = new SelectboxInput(fieldName, props);

    return selectComponent;
};

const formInputRenderer = {
    [formComponentTypes.textInput]: renderFormTextInputComponent,
    [formComponentTypes.select]: renderFormSelectboxComponent
}

/**
 * Renders form input block
 * @param {string} fieldName - input name
 * @param {Object} props - input props
 * @returns {Node} - input block
 */
const renderFormInputBlock = (fieldName, props) => {
    if (!formInputRenderer[props.type]) {
        return null;
    }
    const inputBlockEl = Dom.extension.createEl('div', 'input-block');
    const inputLabelEl = Dom.extension.createEl('span', `input-label ${props.isRequired ? 'required' : ''}`);
    inputLabelEl.textContent = props.label;
    const inputEl = formInputRenderer[props.type](fieldName, props);
    inputEl.required = props.isRequired;

    const inputBoxEl = Dom.extension.createEl('div', 'input-box');
    const helpTextEl = Dom.extension.createEl('div', 'help-text');

    inputBlockEl.appendChild(inputLabelEl);
    inputBoxEl.appendChild(inputEl.element || inputEl);
    inputBoxEl.appendChild(helpTextEl);
    inputBlockEl.appendChild(inputBoxEl);
    inputBlockEl.inputEl = inputEl;

    return inputBlockEl;
}

/**
 * Renders warning alert
 * @param {string} message - warning message
 * @param {string} className - optional alert class name
 * @returns {string} - html for rendering
 */
const renderWarningAlert = (message, className) => {
    return renderAlert(
        message,
        `
            <div class='alert-icon'>
                <svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                    <path fill-rule='evenodd' clip-rule='evenodd' d='M19.5311 21C21.0718 21 22.0339 19.3312 21.262 17.9979L13.7309 4.98962C12.9605 3.65906 11.0395 3.65906 10.2692 4.98963L2.73805 17.9979C1.96612 19.3312 2.92824 21 4.4689 21H19.5311ZM13 18H11V16H13V18ZM13 14H11V9.99997H13V14Z' fill='#FF9800'/>
                </svg>
            </div>
        `,
        `warning${className ? ` ${className}` : ''}`
    );
};

/**
 * Renders alert
 * @param {string} message - alert message
 * @param {string} alertIcon - alert icon
 * @param {string} className - alert class name
 * @returns {string} - html for rendering
 */
const renderAlert = (message, alertIcon, className) => {
    return `
        <div class='sb-alert${className ? ` ${className}` : ''}'>
            ${alertIcon || ''}
            <div class='text'>
               ${message}
            </div>
        </div>
    `;
};

/**
 * Validates form inputs
 * @param {Object} formData - current form data
 * @param {Object} formFields - form fields configuration
 * @param {Object} filedElsMapByName - fields map by name
 * @param {Object} submitButtonEl - form submit button
 * @returns {void}
 */
const validateForm = (formData, formFields, filedElsMapByName, submitButtonEl) => {
    let isFormValid = true;
    // iterate through form fields in order to check if at least some input in form is not valid
    formFields.forEach((field) => {
        const formEl = filedElsMapByName[field.name].inputEl || filedElsMapByName[field.name];
        const inputValue = formEl.valuesMap ? formData[field.name] && formEl.valuesMap[formData[field.name]] :
            formData[field.name]?.trim();
        let isInputValid = formEl.checkValidity ? formEl.checkValidity() : true;
        if (field.isRequired && isInputValid) {
            isInputValid = !isEmpty(inputValue);
        }

        // rendering or removing error message if needed
        if (formEl.parentNode && formEl.nextSibling) {
            if (isInputValid || !inputValue) {
                if (formEl.parentNode.classList.contains(errorClassName)) {
                    formEl.classList.remove(requiredClassName);
                    formEl.parentNode.classList.remove(errorClassName);
                    formEl.nextSibling.textContent = '';
                }
            } else {
                formEl.classList.add(requiredClassName);
                formEl.parentNode.classList.add(errorClassName);
                formEl.nextSibling.textContent = formEl.validity.patternMismatch ? formEl.dataset.patternError : '';
            }
        }
        isFormValid = isFormValid ? isInputValid : isFormValid;
    });

    toggleElementDisabledState(submitButtonEl, !isFormValid);
}

/**
 * On form text input change handler
 * @param {string} name - field's name
 * @param {*} value - field's value
 * @param {Object} formData - current form data
 * @param {Object} formFields - form fields configuration
 * @param {HTMLButtonElement} submitButtonEl - form submit button
 * @param {Object} filedElsMapByName - field elements map by name
 * @returns {void}
 */
const onFormInputChange = (name, value, formData, formFields, submitButtonEl, filedElsMapByName) => {
    formData[name] = value;
    validateForm(formData, formFields, filedElsMapByName, submitButtonEl);
};

/**
 * Get action buttons for popover
 * @param {{ title: string, name: string, onBlur, onClick, className: string, disabled: boolean }} props - button properties
 * @param {Boolean} primary - is primary button
 * @param {Boolean} withLoadingOnClick - add loading icon when click is performed
 * @return {HTMLButtonElement} - action button
 */
const getActionButton = ({ name, onClick, onBlur, className, title, disabled }, primary = true, withLoadingOnClick) => {
    let actionButton = Dom.extension.createEl('button',
        `sb-button action-button${className ? ` ${className}` : ''}${!primary ? ' secondary' : ''}`);
    actionButton.textContent = name;
    actionButton.title = title || `${disabled ? actionDisabledTitle : name}`;
    actionButton.disabled = disabled;
    actionButton.onblur = onBlur;
    actionButton.onclick = (event) => {
        if (onClick) {
            onClick(event);
        }
    }
    if (withLoadingOnClick) {
        addLoadingBlock(actionButton);
    }

    return actionButton;
}

/**
 * Toggles disabled state for element(action button for ex.)
 * @param {Object} element - button element
 * @param {boolean} isDisabled - disabled state
 * @param {string} label - disabled label
 * @returns {void}
 */
const toggleElementDisabledState = (element, isDisabled, label = null) => {
    if (element) {
        element.disabled = isDisabled;
        element.title = isDisabled ? actionDisabledTitle : '';
        if (label) {
            element.textContent = label;
        }
    }
};

/**
 * Adds loading block to the specified element
 * @param {HTMLElement} element - element where loader to add
 * @param {boolean} isSmall - whether loader icon is small or not
 */
const addLoadingBlock = (element, isSmall = false) => {
    const loadingBlock = Dom.extension.createEl('div', `loading-block${isSmall ? ' loading-small' : ''}`);
    loadingBlock.innerHTML = '<div class="loader" />';
    element.appendChild(loadingBlock);
}

/**
 * Show confirmation box
 * @param {String} text - confirmation text
 * @param {Function} onConfirmHandler - action handler in case of confirm
 * @param {String} title - confirmation box title
 * @returns {void}
 */
const showConfirmationBox = (text, onConfirmHandler, title = 'Confirmation') => {
    const popoverInsideEl = Dom.extension.getPopoverInsideEl();
    const actionsEl = getPopoverActionsBlock([
        getCancelPopoverButton(),
        getActionButton({
            name: 'OK',
            onClick: () => {
                onConfirmHandler();
                onPopoverClose();
            }
        })
    ]);

    popoverInsideEl.innerHTML = `<h3>${title}</h3><div class='popover-message'>${text}</div>`;
    popoverInsideEl.appendChild(insertButtonClosePopover());
    popoverInsideEl.appendChild(actionsEl);
    openPopover();
}

/**
 * Show notification message
 * @param {String} text - notification text
 * @returns {void}
 */
const showNotification = (text) => {
    const toastId = 'sb-toast';
    const showClassName = 'show';
    let toast = document.getElementById(toastId);

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'sb-toast';
    }
    toast.classList.add(showClassName);
    toast.innerHTML = text;
    setTimeout(() => {
        toast.classList.remove(showClassName);
    }, 5000);
    document.body.appendChild(toast);
}

/**
 * Shows error message in popover
 * @param {String} errorMessage - error message
 * @return {void}
 */
const showPopoverError = (errorMessage) => {
    const popoverEl = Dom.extension.getPopoverInsideEl();
    popoverEl.innerHTML = '';
    popoverEl.appendChild(insertWarningEl(errorMessage));
    popoverEl.appendChild(getPopoverActionsBlock([getActionButton({ name: 'OK', onClick: onPopoverClose })]));
    openPopover();
}

/**
 * Format Candidate Last Activities
 * @param {Object} candidate - candidate information
 * @returns {string} formatted last activity
 */
const formatLastActivities = (candidate) => {
    let result = '<div class=\'last-activity\'>';

    if (candidate.lastActivityType) {
        if (candidate.lastActivitySubType) {
            result += `${lastActivitySubType} `;
        }

        result += candidate.lastActivityType;

        if (candidate.lastActivityCreatedBy) {
            result += ` by ${candidate.lastActivityCreatedBy}`;
        }

        if (candidate.lastActivityDate) {
            result += ` (${formatDate(candidate.lastActivityDate)})`;
        }

        if (candidate.lastActivitySubject) {
            result += `, ${candidate.lastActivitySubject}`;
        }
    } else {
        result += 'No Activities';
    }

    result += '</div>';
    return result;
};
