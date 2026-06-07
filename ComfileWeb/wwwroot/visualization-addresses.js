const addressTableProviders = {
    CUBLOC2: {
        device: 'CUBLOC2',
        displayName: 'CUBLOC2',
        areas: [
            { prefix: 'I', size: 32, type: 'Bit', labelKo: '입력', visibleStart: 0, visibleEnd: 15 },
            { prefix: 'Q', size: 32, type: 'Bit', labelKo: '출력', visibleStart: 16, visibleEnd: 31 },
            { prefix: 'X', size: 732, type: 'Bit', labelKo: '확장 입력' },
            { prefix: 'Y', size: 732, type: 'Bit', labelKo: '확장 출력' },
            { prefix: 'M', size: 2048, type: 'Bit', labelKo: '내부 메모리' },
            { prefix: 'S', size: 128, type: 'Bit', labelKo: '특수 릴레이' },
            { prefix: 'TS', size: 1000, type: 'Bit', labelKo: '타이머 상태' },
            { prefix: 'CS', size: 1000, type: 'Bit', labelKo: '카운터 상태' },
            { prefix: 'T', size: 1000, type: 'DWord', labelKo: '타이머' },
            { prefix: 'C', size: 1000, type: 'DWord', labelKo: '카운터' },
            { prefix: 'D', size: 8000, type: 'Word', labelKo: '데이터 레지스터' },
            { prefix: 'DD', size: 8000, type: 'DWord', labelKo: '더블워드 데이터' },
            { prefix: 'DF', size: 8000, type: 'Float', labelKo: '실수 데이터' },
            { prefix: 'SD', size: 100, type: 'Word', labelKo: '시스템 데이터' },
            { prefix: 'R', size: 2048, type: 'Bit', labelKo: '유지 비트' },
            { prefix: 'RD', size: 100, type: 'Word', labelKo: '유지 워드' },
            { prefix: 'RDD', size: 100, type: 'DWord', labelKo: '유지 더블워드' },
            { prefix: 'RDF', size: 100, type: 'Float', labelKo: '유지 실수' }
        ],
        aliases: {
            S: {
                0: 'S_OFF', 1: 'S_ON', 2: 'S_INIT', 3: 'S_POR',
                8: 'S_10MS', 9: 'S_100MS', 10: 'S_1S', 11: 'S_2S',
                12: 'S_5S', 13: 'S_10S', 14: 'S_20S', 15: 'S_50S'
            },
            SD: {
                0: 'S_SCANTIME', 1: 'S_SCANTIME_MAX', 2: 'S_SCANTIME_MIN', 3: 'S_SCANTIME_AVG',
                4: 'S_SCANCOUNT_L', 5: 'S_SCANCOUNT_H', 6: 'S_RETAIN'
            }
        }
    }
};

function getCurrentAddressTableProvider() {
    const device = String(linkModelSelect?.value || documentModel.deviceConnection?.device || 'CUBLOC2').trim() || 'CUBLOC2';
    return addressTableProviders[device] || null;
}

function getAddressPickerMode(widget, propertyKey) {
    if (propertyKey === 'Display Address') {
        return 'Full';
    }

    if (propertyKey === 'Lamp Address') {
        return 'BitOnly';
    }

    if (!widget) {
        return 'Full';
    }

    if (widget.kind === 'Button' || widget.kind === 'Lamp' || widget.kind === 'Toggle') {
        return 'BitOnly';
    }

    if (widget.kind === 'Number' || widget.kind === 'Gauge' || widget.kind === 'ProgressBar' || widget.kind === 'Slider') {
        return 'DataOnly';
    }

    return 'Full';
}

function isAddressAreaAllowedForMode(area, mode) {
    if (!area) {
        return false;
    }

    if (mode === 'BitOnly') {
        return area.type === 'Bit';
    }

    if (mode === 'DataOnly') {
        return area.type !== 'Bit';
    }

    return true;
}

function getAddressAreaEntries(provider, area, searchText) {
    if (!provider || !area) {
        return [];
    }

    const normalizedSearch = String(searchText || '').trim().toUpperCase();
    const start = Number.isFinite(Number(area.visibleStart)) ? Number(area.visibleStart) : 0;
    const end = Number.isFinite(Number(area.visibleEnd)) ? Number(area.visibleEnd) : Math.max(0, Number(area.size || 0) - 1);
    const aliases = provider.aliases?.[area.prefix] || {};
    const result = [];
    const maxRows = normalizedSearch ? 500 : 300;

    for (let index = start; index <= end; index += 1) {
        const address = `${area.prefix}${index}`;
        const alias = String(aliases[index] || '');
        if (normalizedSearch && !address.toUpperCase().includes(normalizedSearch) && !alias.toUpperCase().includes(normalizedSearch)) {
            continue;
        }

        result.push({ address, alias, type: area.type, comment: '' });
        if (result.length >= maxRows) {
            break;
        }
    }

    return result;
}

function openAddressPicker(widget, propertyKey, currentAddress) {
    if (!widget || runtimeRunning) {
        return;
    }

    const provider = getCurrentAddressTableProvider();
    if (!provider) {
        window.alert(useKoreanLanguage ? '선택한 디바이스의 주소 테이블이 없습니다.' : 'No address table is available for the selected device.');
        return;
    }

    const mode = getAddressPickerMode(widget, propertyKey);
    const allowedAreas = provider.areas.filter(area => isAddressAreaAllowedForMode(area, mode));
    if (allowedAreas.length === 0) {
        window.alert(useKoreanLanguage ? '선택 가능한 주소 영역이 없습니다.' : 'No selectable address area is available.');
        return;
    }

    document.querySelectorAll('.address-picker-backdrop').forEach(element => element.remove());

    const state = {
        widgetId: widget.id,
        propertyKey,
        provider,
        mode,
        selectedAreaPrefix: findAddressAreaPrefix(provider, currentAddress, allowedAreas) || allowedAreas[0].prefix,
        selectedAddress: String(currentAddress || '').trim(),
        searchText: ''
    };

    const backdrop = document.createElement('div');
    backdrop.className = 'address-picker-backdrop';
    backdrop.innerHTML = renderAddressPickerMarkup(state, allowedAreas);
    document.body.appendChild(backdrop);
    bindAddressPickerEvents(backdrop, state);
    renderAddressPickerRows(backdrop, state);
}

function findAddressAreaPrefix(provider, address, allowedAreas) {
    const key = normalizeVisualizationAddressKey(address);
    if (!key) {
        return '';
    }

    const match = key.match(/^([A-Z]+)\d+$/);
    if (!match) {
        return '';
    }

    const prefix = match[1];
    return allowedAreas.some(area => area.prefix === prefix) ? prefix : '';
}

function renderAddressPickerMarkup(state, allowedAreas) {
    const resources = getVisualizationResources();
    const title = useKoreanLanguage ? '주소 테이블' : 'Address Table';
    const modeText = state.mode === 'BitOnly'
        ? (useKoreanLanguage ? '비트 주소' : 'Bit addresses')
        : (state.mode === 'DataOnly' ? (useKoreanLanguage ? '데이터 주소' : 'Data addresses') : (useKoreanLanguage ? '전체 주소' : 'All addresses'));
    return `<div class="address-picker-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="address-picker-header">
            <div>
                <div class="address-picker-title">${escapeHtml(title)}</div>
                <div class="address-picker-subtitle">${escapeHtml(state.provider.displayName)} · ${escapeHtml(modeText)}</div>
            </div>
            <button class="address-picker-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="address-picker-body">
            <div class="address-picker-sidebar">
                ${allowedAreas.map(area => `<button class="address-picker-area${area.prefix === state.selectedAreaPrefix ? ' is-selected' : ''}" type="button" data-address-area="${escapeHtml(area.prefix)}">
                    <span>${escapeHtml(area.prefix)}</span>
                    <small>${escapeHtml(useKoreanLanguage ? area.labelKo : area.type)}</small>
                </button>`).join('')}
            </div>
            <div class="address-picker-content">
                <div class="address-picker-toolbar">
                    <input class="address-picker-search" type="search" placeholder="${useKoreanLanguage ? '주소 또는 별칭 검색' : 'Search address or alias'}" />
                    <span class="address-picker-current">${escapeHtml(state.selectedAddress || '-')}</span>
                </div>
                <div class="address-picker-table-wrap">
                    <table class="address-picker-table">
                        <thead><tr><th>${useKoreanLanguage ? '주소' : 'Address'}</th><th>Alias</th><th>Comment</th><th>Type</th></tr></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="address-picker-footer">
            <button class="address-picker-cancel" type="button">${escapeHtml(resources.cancel || 'Cancel')}</button>
            <button class="address-picker-apply" type="button" disabled>${useKoreanLanguage ? '선택' : 'Select'}</button>
        </div>
    </div>`;
}

function bindAddressPickerEvents(backdrop, state) {
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop || event.target.closest('.address-picker-close') || event.target.closest('.address-picker-cancel')) {
            close();
            return;
        }

        const areaButton = event.target.closest('.address-picker-area');
        if (areaButton) {
            state.selectedAreaPrefix = areaButton.dataset.addressArea;
            state.selectedAddress = '';
            backdrop.querySelectorAll('.address-picker-area').forEach(button => button.classList.toggle('is-selected', button === areaButton));
            renderAddressPickerRows(backdrop, state);
            return;
        }

        const row = event.target.closest('.address-picker-row');
        if (row) {
            state.selectedAddress = row.dataset.address || '';
            updateAddressPickerSelection(backdrop, state);
            if (event.detail >= 2) {
                applyAddressPickerSelection(state);
                close();
            }
            return;
        }

        if (event.target.closest('.address-picker-apply')) {
            applyAddressPickerSelection(state);
            close();
        }
    });

    const searchInput = backdrop.querySelector('.address-picker-search');
    searchInput?.addEventListener('input', () => {
        state.searchText = searchInput.value;
        renderAddressPickerRows(backdrop, state);
    });
}

function renderAddressPickerRows(backdrop, state) {
    const area = state.provider.areas.find(item => item.prefix === state.selectedAreaPrefix);
    const rows = getAddressAreaEntries(state.provider, area, state.searchText);
    const tbody = backdrop.querySelector('.address-picker-table tbody');
    tbody.innerHTML = rows.length > 0
        ? rows.map(row => `<tr class="address-picker-row${normalizeVisualizationAddressKey(row.address) === normalizeVisualizationAddressKey(state.selectedAddress) ? ' is-selected' : ''}" data-address="${escapeHtml(row.address)}">
            <td>${escapeHtml(row.address)}</td><td>${escapeHtml(row.alias)}</td><td>${escapeHtml(row.comment)}</td><td>${escapeHtml(row.type)}</td>
        </tr>`).join('')
        : `<tr><td colspan="4" class="address-picker-empty">${useKoreanLanguage ? '표시할 주소가 없습니다.' : 'No addresses to display.'}</td></tr>`;
    updateAddressPickerSelection(backdrop, state);
}

function updateAddressPickerSelection(backdrop, state) {
    const selectedKey = normalizeVisualizationAddressKey(state.selectedAddress);
    backdrop.querySelectorAll('.address-picker-row').forEach(row => {
        row.classList.toggle('is-selected', normalizeVisualizationAddressKey(row.dataset.address) === selectedKey);
    });
    const current = backdrop.querySelector('.address-picker-current');
    if (current) {
        current.textContent = state.selectedAddress || '-';
    }
    const applyButton = backdrop.querySelector('.address-picker-apply');
    if (applyButton) {
        applyButton.disabled = !state.selectedAddress;
    }
}

function applyAddressPickerSelection(state) {
    applyVisualizationWidgetAddress(state.widgetId, state.selectedAddress, state.propertyKey);
}
