const emptyOptionLabel = 'Please select';

const placeholderClassName = 'placeholder-text';

const selectedOptionClassName = 'selected';

const disabledClassName = 'disabled';

const showClassName = 'show';

class SelectboxInput {
    // main element
    element
    // drop button
    dropButtonEl
    // main select container
    selectContentEl
    // options container
    optionsContentEl
    // search options input
    searchInputEl
    // empty text element
    emptyTextEl
    // element with selected value
    selectedValueEl
    // currently selected option
    selectedOptionEl
    // input name
    name
    // values map by id
    valuesMap = {}
    // all available options list
    availableOptions = null
    // component props (name, isRequired, isDisabled, value)
    props

    _value

    _disabled

    constructor(name, props) {
        this.name = name;
        this.props = props;
        this.render(props);
        this.initListeners();
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this._value = value || '';
        this.selectedValueEl.innerText = value && this.valuesMap[value]?.name || emptyOptionLabel;

        if (value) {
            if (this.selectedValueEl.classList.contains(placeholderClassName)) {
                this.selectedValueEl.classList.remove(placeholderClassName);
            }
        } else {
            this.selectedValueEl.classList.add(placeholderClassName);
        }
    }

    get disabled() {
        return this._disabled;
    }

    set disabled(value) {
        this._disabled = value;
        if (value) {
            this.element.classList.add(disabledClassName);
        } else {
            this.element.classList.remove(disabledClassName);
        }
    }

    selectOption(option, optionEl) {
        if (option.id === this.value) {
            return;
        }
        this.value = option.id;

        this.markOptionSelected(option, optionEl);
        if (this.props.onChange) {
            this.props.onChange(this.props.name, option.id);
        }
    }

    markOptionSelected(option, optionEl) {
        if (this.selectedOptionEl) {
            this.selectedOptionEl.classList.remove(selectedOptionClassName);
        }
        this.selectedOptionEl = optionEl;
        if (option.id) {
            optionEl.classList.add(selectedOptionClassName);
        }
    }

    closeOptionsListPopup = () => {
        this.selectContentEl.classList.remove(showClassName);
        if (this.searchInputEl.value.trim()) {
            this.searchInputEl.value = '';
            this.renderOptions(this.availableOptions);
        }
    }

    showOptionsListPopup = () => {
        this.selectContentEl.classList.add(showClassName);
        // focus search input element and scroll options list to the top
        this.searchInputEl.focus();
        this.optionsContentEl.scrollTop = 0;
    }

    onSearchHandler = () => {
        const formattedInputText = this.searchInputEl.value.trim().toLowerCase();
        const filteredOptions = this.availableOptions.filter((option) => {
            return option.name.toLowerCase().indexOf(formattedInputText) !== -1;
        });

        this.renderOptions(filteredOptions);
    }

    onSearchInputBlur = () => {
        setTimeout(() => {
            if (document.activeElement !== this.dropButtonEl) {
                this.closeOptionsListPopup();
            }
        }, 0);
    }

    initListeners() {
        this.dropButtonEl.addEventListener('click', this.onButtonClick);
        this.searchInputEl.addEventListener('input', this.onSearchHandler);
        this.searchInputEl.addEventListener('blur', this.onSearchInputBlur);
    }

    onButtonClick = (event) => {
        event.preventDefault();
        if (this.selectContentEl.classList.contains(showClassName)) {
            this.closeOptionsListPopup();
        } else {
            this.showOptionsListPopup()
        }
    }

    showEmptyOptionsText = (isSearching) => {
        this.emptyTextEl.classList.add(showClassName);
        this.emptyTextEl.textContent = `No options${isSearching  ? ' found' : ''}`;
    }

    renderOptions = (options) => {
        const _this = this;
        const value = this.value;
        const showGroups = this.props.showGroups;
        const optionsToRender = [{ id: '', name: infoFormatting.empty }].concat(options);
        let optionGroup;

        this.optionsContentEl.innerHTML = '';
        // show/hide options empty text if needed
        if (!options.length) {
            this.showEmptyOptionsText(options !== this.availableOptions);
            return;
        } else {
            this.emptyTextEl.classList.remove(showClassName);
        }

        optionsToRender.forEach((option, i) => {
            // option group by 'type' property
            if (showGroups && option.type && option.type !== optionsToRender[i - 1].type) {
                if (optionGroup) {
                    this.optionsContentEl.appendChild(optionGroup);
                }
                optionGroup = Dom.extension.createEl('div', 'group');
                optionGroup.innerHTML = `<div class='group-label'>${option.type}</div>`;
            }
            const optionEl = Dom.extension.createEl('div', 'option');
            optionEl.addEventListener('mousedown', function () {
                _this.selectOption(option, optionEl);
            });
            optionEl.textContent = option.name;
            this.valuesMap[option.id] = option;
            if (value === option.name || value === option.id) {
                this.selectOption(option, optionEl);
            }
            (optionGroup || this.optionsContentEl).append(optionEl);
            // append the last group
            if (optionGroup && i === optionsToRender.length - 1) {
                this.optionsContentEl.appendChild(optionGroup);
            }
        });
    }

    renderAvailableOptions = (getOptions) => {
        this.selectContentEl.classList.remove(showClassName);
        this.element.classList.add(loadingClassName);
        return getOptions.then((options) => {
            // clear previous options
            this.valuesMap = {};
            this.availableOptions = options;
            this.renderOptions(options);
        }).catch(() => {
            this.showEmptyOptionsText(false);
        }).finally(() => {
            this.element.classList.remove(loadingClassName);
        });
    };

    render(props) {
        this.element = Dom.extension.createEl('div', 'sb-select');
        this.selectContentEl = Dom.extension.createEl('div', 'select-content');
        this.optionsContentEl = Dom.extension.createEl('div', 'options-content');
        this.emptyTextEl = Dom.extension.createEl('div', 'empty-text');
        // search input
        this.searchInputEl = Dom.extension.createEl('input', 'search-input');
        this.searchInputEl.placeholder = 'Type to search...';
        // drop button
        this.dropButtonEl = Dom.extension.createEl('button', 'drop-button');
        this.selectedValueEl = Dom.extension.createEl('div', 'selected-value');
        const iconEl = Dom.extension.createEl('div', 'select-icon');
        iconEl.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' data-supported-dps='16x16' width='16' height='16' focusable='false'>
                <path d='M8 11L3 6h10z' fill-rule='evenodd'></path>
            </svg>`;
        this.dropButtonEl.appendChild(this.selectedValueEl);
        this.dropButtonEl.appendChild(iconEl);
        this.element.appendChild(this.dropButtonEl);
        this.selectContentEl.appendChild(this.searchInputEl);
        this.selectContentEl.appendChild(this.optionsContentEl);
        this.selectContentEl.appendChild(this.emptyTextEl);
        this.element.appendChild(this.selectContentEl);
        if (props.getOptions) {
            this.renderAvailableOptions(props.getOptions, props.value).then(() => {
                if (props.value && !this.value) {
                    sendContextMessage(MSG.reportError, { source: `Failed to set default value '${props.value}' to '${props.label}' field` });
                }
            });
            addLoadingBlock(this.element, true);
        }
        this.disabled = props.isDisabled;
        this.value = props.value;

        return this;
    }
}