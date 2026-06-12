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
    },
    CFNET: {
        device: 'CFNET',
        displayName: 'CFNET Field I/O',
        metadataMode: 'commentOnly',
        areas: [
            { prefix: 'DI.0.', size: 16, type: 'Bit', labelKo: 'DI ADR 0', labelEn: 'DI ADR 0' },
            { prefix: 'DI.1.', size: 16, type: 'Bit', labelKo: 'DI ADR 1', labelEn: 'DI ADR 1' },
            { prefix: 'DI.2.', size: 16, type: 'Bit', labelKo: 'DI ADR 2', labelEn: 'DI ADR 2' },
            { prefix: 'DI.3.', size: 16, type: 'Bit', labelKo: 'DI ADR 3', labelEn: 'DI ADR 3' },
            { prefix: 'DI.4.', size: 16, type: 'Bit', labelKo: 'DI ADR 4', labelEn: 'DI ADR 4' },
            { prefix: 'DI.5.', size: 16, type: 'Bit', labelKo: 'DI ADR 5', labelEn: 'DI ADR 5' },
            { prefix: 'DI.6.', size: 16, type: 'Bit', labelKo: 'DI ADR 6', labelEn: 'DI ADR 6' },
            { prefix: 'DI.7.', size: 16, type: 'Bit', labelKo: 'DI ADR 7', labelEn: 'DI ADR 7' },
            { prefix: 'DO.0.', size: 16, type: 'Bit', labelKo: 'DO ADR 0', labelEn: 'DO ADR 0' },
            { prefix: 'DO.1.', size: 16, type: 'Bit', labelKo: 'DO ADR 1', labelEn: 'DO ADR 1' },
            { prefix: 'DO.2.', size: 16, type: 'Bit', labelKo: 'DO ADR 2', labelEn: 'DO ADR 2' },
            { prefix: 'DO.3.', size: 16, type: 'Bit', labelKo: 'DO ADR 3', labelEn: 'DO ADR 3' },
            { prefix: 'DO.4.', size: 16, type: 'Bit', labelKo: 'DO ADR 4', labelEn: 'DO ADR 4' },
            { prefix: 'DO.5.', size: 16, type: 'Bit', labelKo: 'DO ADR 5', labelEn: 'DO ADR 5' },
            { prefix: 'DO.6.', size: 16, type: 'Bit', labelKo: 'DO ADR 6', labelEn: 'DO ADR 6' },
            { prefix: 'DO.7.', size: 16, type: 'Bit', labelKo: 'DO ADR 7', labelEn: 'DO ADR 7' },
            { prefix: 'ADC.0.', size: 4, type: 'Channel', labelKo: 'ADC ADR 0', labelEn: 'ADC ADR 0' },
            { prefix: 'ADC.1.', size: 4, type: 'Channel', labelKo: 'ADC ADR 1', labelEn: 'ADC ADR 1' },
            { prefix: 'ADC.2.', size: 4, type: 'Channel', labelKo: 'ADC ADR 2', labelEn: 'ADC ADR 2' },
            { prefix: 'ADC.3.', size: 4, type: 'Channel', labelKo: 'ADC ADR 3', labelEn: 'ADC ADR 3' },
            { prefix: 'DAC.0.', size: 2, type: 'Channel', labelKo: 'DAC ADR 0', labelEn: 'DAC ADR 0' },
            { prefix: 'DAC.1.', size: 2, type: 'Channel', labelKo: 'DAC ADR 1', labelEn: 'DAC ADR 1' },
            { prefix: 'DAC.2.', size: 2, type: 'Channel', labelKo: 'DAC ADR 2', labelEn: 'DAC ADR 2' },
            { prefix: 'DAC.3.', size: 2, type: 'Channel', labelKo: 'DAC ADR 3', labelEn: 'DAC ADR 3' },
            { prefix: 'DAC.4.', size: 2, type: 'Channel', labelKo: 'DAC ADR 4', labelEn: 'DAC ADR 4' },
            { prefix: 'DAC.5.', size: 2, type: 'Channel', labelKo: 'DAC ADR 5', labelEn: 'DAC ADR 5' },
            { prefix: 'DAC.6.', size: 2, type: 'Channel', labelKo: 'DAC ADR 6', labelEn: 'DAC ADR 6' },
            { prefix: 'DAC.7.', size: 2, type: 'Channel', labelKo: 'DAC ADR 7', labelEn: 'DAC ADR 7' }
        ],
        aliases: {}
    }
};

let importedAddressMetadata = new Map();
let importedAddressMetadataSourceFileName = '';
let cfnetAddressComments = new Map();

const cublocMonitorTypePrefixes = {
    1: 'I',
    2: 'Q',
    3: 'X',
    4: 'Y',
    5: 'M',
    6: 'S',
    7: 'D',
    8: 'T',
    9: 'C',
    10: 'DD',
    11: 'DF',
    12: 'R',
    13: 'RD',
    16: 'RDD',
    17: 'RDF',
    18: 'TS',
    19: 'CS',
    20: 'SD'
};

function getAddressFromMonitorInfo(monType, monIndex, fallbackText) {
    const prefix = cublocMonitorTypePrefixes[Number(monType)];
    if (prefix && Number.isFinite(Number(monIndex))) {
        return `${prefix}${Number(monIndex)}`;
    }

    return normalizeVisualizationAddressKey(fallbackText || '');
}

function getCfnetAddressComment(address) {
    const key = normalizeVisualizationAddressKey(address);
    return key ? String(cfnetAddressComments.get(key) || '') : '';
}

function setCfnetAddressComment(address, comment) {
    const key = normalizeVisualizationAddressKey(address);
    if (!key) {
        return;
    }

    const text = String(comment || '').trim();
    if (text) {
        cfnetAddressComments.set(key, text);
    } else {
        cfnetAddressComments.delete(key);
    }
}

function exportCfnetAddressComments() {
    return Array.from(cfnetAddressComments.entries())
        .map(([address, comment]) => ({ address, comment: String(comment || '') }))
        .filter(entry => entry.address && entry.comment);
}

function importSavedCfnetAddressComments(entries) {
    cfnetAddressComments = new Map();
    (entries || []).forEach(entry => {
        const key = normalizeVisualizationAddressKey(entry?.address || '');
        const comment = String(entry?.comment || '').trim();
        if (key && comment) {
            cfnetAddressComments.set(key, comment);
        }
    });
}

function setLdMonitorDocument(document, sourceFileName) {
    const model = window.visualizationDocumentModel;
    if (!model) {
        return;
    }

    model.ldMonitorDocument = document || null;
    model.ldMonitorSourceFileName = String(sourceFileName || '').trim();
}

function getSavedLdMonitorDocument() {
    const model = window.visualizationDocumentModel;
    return model && model.ldMonitorDocument ? model.ldMonitorDocument : null;
}

window.getVisualizationLdMonitorDocument = getSavedLdMonitorDocument;

function getAliasImportButtonText() {
    const baseText = useKoreanLanguage ? '주소/래더 가져오기' : 'Import Address/Ladder';
    if (importedAddressMetadataSourceFileName) {
        return useKoreanLanguage
            ? `${baseText} (현재: ${importedAddressMetadataSourceFileName})`
            : `${baseText} (current: ${importedAddressMetadataSourceFileName})`;
    }

    if (importedAddressMetadata.size > 0) {
        return useKoreanLanguage
            ? `${baseText} (현재: 저장된 Alias)`
            : `${baseText} (current: saved aliases)`;
    }

    return baseText;
}

function getImportedAddressMetadata(address) {
    const key = normalizeVisualizationAddressKey(address);
    if (!key) {
        return null;
    }

    if (importedAddressMetadata.has(key)) {
        return importedAddressMetadata.get(key);
    }

    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
        return null;
    }

    const prefix = match[1];
    const index = match[2];
    if (prefix === 'TS') {
        return importedAddressMetadata.get(`T${index}`) || null;
    }
    if (prefix === 'T') {
        return importedAddressMetadata.get(`TS${index}`) || null;
    }
    if (prefix === 'CS') {
        return importedAddressMetadata.get(`C${index}`) || null;
    }
    if (prefix === 'C') {
        return importedAddressMetadata.get(`CS${index}`) || null;
    }

    return null;
}

function setImportedAddressMetadata(entries, sourceFileName) {
    importedAddressMetadata = new Map();
    importedAddressMetadataSourceFileName = String(sourceFileName || '').trim();
    (entries || []).forEach(entry => {
        const key = normalizeVisualizationAddressKey(`${entry.prefix}${entry.index}`);
        const alias = String(entry.alias || '').trim();
        const comment = String(entry.comment || '').trim();
        if (key && (alias || comment)) {
            importedAddressMetadata.set(key, { alias, comment });
        }
    });
}

function exportImportedAddressMetadata() {
    return Array.from(importedAddressMetadata.entries()).map(([address, metadata]) => ({
        address,
        alias: String(metadata?.alias || ''),
        comment: String(metadata?.comment || '')
    }));
}

function exportImportedAddressMetadataSourceFileName() {
    return importedAddressMetadataSourceFileName;
}

function importSavedAddressMetadata(entries, sourceFileName) {
    importedAddressMetadata = new Map();
    importedAddressMetadataSourceFileName = String(sourceFileName || '').trim();
    (entries || []).forEach(entry => {
        const key = normalizeVisualizationAddressKey(entry?.address || `${entry?.prefix || ''}${entry?.index ?? ''}`);
        const alias = String(entry?.alias || '').trim();
        const comment = String(entry?.comment || '').trim();
        if (key && (alias || comment)) {
            importedAddressMetadata.set(key, { alias, comment });
        }
    });
}

function syncImportedAddressMetadataFromDocumentModel() {
    const model = window.visualizationDocumentModel;
    if (!model || !Array.isArray(model.addressMetadata)) {
        return;
    }

    const modelSourceFileName = String(model.addressMetadataSourceFileName || '').trim();
    if (model.addressMetadata.length === importedAddressMetadata.size && modelSourceFileName === importedAddressMetadataSourceFileName) {
        return;
    }

    importSavedAddressMetadata(model.addressMetadata, modelSourceFileName);
}

window.exportImportedAddressMetadata = exportImportedAddressMetadata;
window.exportImportedAddressMetadataSourceFileName = exportImportedAddressMetadataSourceFileName;
window.importSavedAddressMetadata = importSavedAddressMetadata;
window.getCfnetAddressComment = getCfnetAddressComment;
window.exportCfnetAddressComments = exportCfnetAddressComments;
window.importSavedCfnetAddressComments = importSavedCfnetAddressComments;

if (Array.isArray(window.visualizationDocumentModel?.addressMetadata)) {
    importSavedAddressMetadata(
        window.visualizationDocumentModel.addressMetadata,
        window.visualizationDocumentModel.addressMetadataSourceFileName
    );
}

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

function getAddressAreaEntries(provider, area, searchText, jumpStart) {
    if (!provider || !area) {
        return [];
    }

    const normalizedSearch = String(searchText || '').trim().toUpperCase();
    let start = Number.isFinite(Number(area.visibleStart)) ? Number(area.visibleStart) : 0;
    let end = Number.isFinite(Number(area.visibleEnd)) ? Number(area.visibleEnd) : Math.max(0, Number(area.size || 0) - 1);
    if (!normalizedSearch && Number.isFinite(Number(jumpStart))) {
        start = Math.max(start, Number(jumpStart));
        end = Math.min(end, start + 99);
    }
    const aliases = provider.aliases?.[area.prefix] || {};
    const result = [];
    const maxRows = normalizedSearch ? 500 : 300;

    for (let index = start; index <= end; index += 1) {
        const address = `${area.prefix}${index}`;
        const importedMetadata = provider.metadataMode === 'commentOnly'
            ? { alias: '', comment: getCfnetAddressComment(address) }
            : getImportedAddressMetadata(address);
        const alias = String(importedMetadata?.alias || aliases[index] || '');
        const comment = String(importedMetadata?.comment || '');
        if (normalizedSearch &&
            !address.toUpperCase().includes(normalizedSearch) &&
            !alias.toUpperCase().includes(normalizedSearch) &&
            !comment.toUpperCase().includes(normalizedSearch)) {
            continue;
        }

        result.push({ address, alias, type: area.type, comment });
        if (result.length >= maxRows) {
            break;
        }
    }

    return result;
}

function parseAddressEntry(provider, address) {
    const key = normalizeVisualizationAddressKey(address);
    if (!provider || !key) {
        return null;
    }

    const areas = Array.isArray(provider.areas)
        ? [...provider.areas].sort((left, right) => String(right.prefix || '').length - String(left.prefix || '').length)
        : [];
    for (const area of areas) {
        const prefix = String(area?.prefix || '').toUpperCase();
        if (!prefix || !key.startsWith(prefix)) {
            continue;
        }

        const indexText = key.slice(prefix.length);
        if (!/^\d+$/.test(indexText)) {
            continue;
        }

        const index = Number.parseInt(indexText, 10);
        const size = Number(area?.size || 0);
        if (!Number.isFinite(index) || index < 0 || (size > 0 && index >= size)) {
            continue;
        }

        const normalizedAddress = `${prefix}${index}`;
        const importedMetadata = provider.metadataMode === 'commentOnly'
            ? { alias: '', comment: getCfnetAddressComment(normalizedAddress) }
            : getImportedAddressMetadata(normalizedAddress);
        const alias = String(importedMetadata?.alias || provider.aliases?.[prefix]?.[index] || '');
        const comment = String(importedMetadata?.comment || '');
        return {
            address: normalizedAddress,
            alias,
            comment,
            type: String(area?.type || ''),
            prefix,
            index
        };
    }

    return null;
}

function getActiveAddressEntries(provider, usedAddressKeys, currentAddress, searchText) {
    const normalizedSearch = String(searchText || '').trim().toUpperCase();
    const collected = new Map();
    const append = address => {
        const entry = parseAddressEntry(provider, address);
        if (!entry) {
            return;
        }

        if (entry.prefix === 'S' || entry.prefix === 'SD') {
            return;
        }

        const key = normalizeVisualizationAddressKey(entry.address);
        if (!key || collected.has(key)) {
            return;
        }

        if (normalizedSearch &&
            !entry.address.toUpperCase().includes(normalizedSearch) &&
            !entry.alias.toUpperCase().includes(normalizedSearch) &&
            !entry.comment.toUpperCase().includes(normalizedSearch) &&
            !entry.type.toUpperCase().includes(normalizedSearch)) {
            return;
        }

        collected.set(key, entry);
    };

    if (usedAddressKeys instanceof Set) {
        usedAddressKeys.forEach(addressKey => append(addressKey));
    }
    append(currentAddress);

    importedAddressMetadata.forEach((metadata, address) => {
        const alias = String(metadata?.alias || '').trim();
        const comment = String(metadata?.comment || '').trim();
        if (alias || comment) {
            append(address);
        }
    });

    Object.entries(provider?.aliases || {}).forEach(([prefix, indexMap]) => {
        Object.keys(indexMap || {}).forEach(index => {
            append(`${prefix}${index}`);
        });
    });

    return Array.from(collected.values())
        .sort((left, right) => {
            if (left.prefix !== right.prefix) {
                return left.prefix.localeCompare(right.prefix);
            }
            return left.index - right.index;
        })
        .slice(0, 500)
        .map(({ address, alias, comment, type }) => ({ address, alias, comment, type }));
}

function openAddressPicker(widget, propertyKey, currentAddress) {
    if (!widget || runtimeRunning) {
        return;
    }

    syncImportedAddressMetadataFromDocumentModel();

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
        currentAddress: String(currentAddress || '').trim(),
        selectedAddress: String(currentAddress || '').trim(),
        usedAddressKeys: typeof collectUsedVisualizationAddressKeys === 'function' ? collectUsedVisualizationAddressKeys() : new Set(),
        jumpThousands: null,
        jumpHundreds: null,
        searchText: ''
    };
    initializeAddressJumpState(state);

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

    const normalizedAllowed = allowedAreas.map(area => String(area?.prefix || '').toUpperCase());
    const matched = normalizedAllowed
        .sort((left, right) => right.length - left.length)
        .find(prefix => key.startsWith(prefix));
    return matched || '';
}

function getAddressAreaRange(area) {
    const start = Number.isFinite(Number(area?.visibleStart)) ? Number(area.visibleStart) : 0;
    const end = Number.isFinite(Number(area?.visibleEnd)) ? Number(area.visibleEnd) : Math.max(0, Number(area?.size || 0) - 1);
    return { start, end, count: Math.max(0, end - start + 1) };
}

function getAddressIndexForArea(area, address) {
    const key = normalizeVisualizationAddressKey(address);
    const prefix = String(area?.prefix || '').toUpperCase();
    if (!key || !prefix || !key.startsWith(prefix)) {
        return null;
    }

    const suffix = key.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) {
        return null;
    }

    const value = Number.parseInt(suffix, 10);
    return Number.isFinite(value) ? value : null;
}

function initializeAddressJumpState(state) {
    const area = state.provider.areas.find(item => item.prefix === state.selectedAreaPrefix);
    const range = getAddressAreaRange(area);
    if (!area || range.count <= 100) {
        state.jumpThousands = null;
        state.jumpHundreds = null;
        return;
    }

    const currentIndex = getAddressIndexForArea(area, state.currentAddress);
    const baseIndex = currentIndex !== null && currentIndex >= range.start && currentIndex <= range.end
        ? currentIndex
        : range.start;
    if (range.end >= 1000) {
        state.jumpThousands = Math.floor(baseIndex / 1000);
        state.jumpHundreds = Math.floor((baseIndex % 1000) / 100);
    } else {
        state.jumpThousands = null;
        state.jumpHundreds = Math.floor(baseIndex / 100);
    }
}

function getAddressJumpStart(state) {
    const area = state.provider.areas.find(item => item.prefix === state.selectedAreaPrefix);
    const range = getAddressAreaRange(area);
    if (!area || range.count <= 100) {
        return null;
    }

    if (range.end >= 1000) {
        const thousands = Number.isFinite(Number(state.jumpThousands)) ? Number(state.jumpThousands) : Math.floor(range.start / 1000);
        const hundreds = Number.isFinite(Number(state.jumpHundreds)) ? Number(state.jumpHundreds) : 0;
        return Math.max(range.start, Math.min(range.end, (thousands * 1000) + (hundreds * 100)));
    }

    const hundreds = Number.isFinite(Number(state.jumpHundreds)) ? Number(state.jumpHundreds) : Math.floor(range.start / 100);
    return Math.max(range.start, Math.min(range.end, hundreds * 100));
}

function getAddressJumpMarkup(state) {
    const area = state.provider.areas.find(item => item.prefix === state.selectedAreaPrefix);
    const range = getAddressAreaRange(area);
    if (!area || range.count <= 100) {
        return '';
    }

    const renderButtons = (level, values, selectedValue) => values.map(value => `<button class="address-picker-jump-button${value === selectedValue ? ' is-selected' : ''}" type="button" data-address-jump-level="${level}" data-address-jump-value="${value}">${value}</button>`).join('');
    if (range.end >= 1000) {
        const firstThousand = Math.floor(range.start / 1000);
        const lastThousand = Math.floor(range.end / 1000);
        const thousands = [];
        for (let value = firstThousand; value <= lastThousand; value += 1) {
            thousands.push(value);
        }

        const selectedThousand = Number.isFinite(Number(state.jumpThousands)) ? Number(state.jumpThousands) : firstThousand;
        const hundredRangeStart = Math.max(range.start, selectedThousand * 1000);
        const hundredRangeEnd = Math.min(range.end, (selectedThousand * 1000) + 999);
        const firstHundred = Math.floor((hundredRangeStart - (selectedThousand * 1000)) / 100);
        const lastHundred = Math.floor((hundredRangeEnd - (selectedThousand * 1000)) / 100);
        const hundreds = [];
        for (let value = firstHundred; value <= lastHundred; value += 1) {
            hundreds.push(value);
        }
        const selectedHundred = Number.isFinite(Number(state.jumpHundreds)) ? Number(state.jumpHundreds) : firstHundred;

        return `<div class="address-picker-jump-panel">
            <div class="address-picker-jump-caption">${useKoreanLanguage ? '1000 단위' : 'Thousands'}</div>
            <div class="address-picker-jump-row">${renderButtons('thousand', thousands, selectedThousand)}</div>
            <div class="address-picker-jump-caption">${useKoreanLanguage ? '100 단위' : 'Hundreds'}</div>
            <div class="address-picker-jump-row">${renderButtons('hundred', hundreds, selectedHundred)}</div>
        </div>`;
    }

    const firstHundred = Math.floor(range.start / 100);
    const lastHundred = Math.floor(range.end / 100);
    const hundreds = [];
    for (let value = firstHundred; value <= lastHundred; value += 1) {
        hundreds.push(value);
    }
    const selectedHundred = Number.isFinite(Number(state.jumpHundreds)) ? Number(state.jumpHundreds) : firstHundred;
    return `<div class="address-picker-jump-panel">
        <div class="address-picker-jump-caption">${useKoreanLanguage ? '100 단위' : 'Hundreds'}</div>
        <div class="address-picker-jump-row">${renderButtons('hundred', hundreds, selectedHundred)}</div>
    </div>`;
}

function renderAddressJumpPanel(backdrop, state) {
    const panel = backdrop.querySelector('.address-picker-jump-host');
    if (panel) {
        panel.innerHTML = getAddressJumpMarkup(state);
    }
}

function getCfnetAreaModule(areaOrPrefix) {
    const prefix = typeof areaOrPrefix === 'string'
        ? areaOrPrefix
        : String(areaOrPrefix?.prefix || '');
    const match = String(prefix || '').toUpperCase().match(/^([A-Z]+)\./);
    return match ? match[1] : '';
}

function getCfnetAreaAdr(areaOrPrefix) {
    const prefix = typeof areaOrPrefix === 'string'
        ? areaOrPrefix
        : String(areaOrPrefix?.prefix || '');
    const match = String(prefix || '').toUpperCase().match(/^[A-Z]+\.(\d+)\./);
    return match ? match[1] : '';
}

function getCfnetSelectedModule(state, allowedAreas) {
    const selectedModule = getCfnetAreaModule(state.selectedAreaPrefix);
    if (selectedModule && allowedAreas.some(area => getCfnetAreaModule(area) === selectedModule)) {
        return selectedModule;
    }

    return getCfnetAreaModule(allowedAreas[0]) || '';
}

function renderAddressPickerSidebarMarkup(state, allowedAreas) {
    if (state.provider?.metadataMode === 'commentOnly') {
        const modules = Array.from(new Set(allowedAreas.map(area => getCfnetAreaModule(area)).filter(Boolean)));
        return modules.map(moduleName => {
            const moduleType = moduleName === 'DI' || moduleName === 'DO' ? 'Bit' : 'Channel';
            const moduleLabel = moduleName === 'DI'
                ? 'Digital Input'
                : (moduleName === 'DO' ? 'Digital Output' : moduleType);
            const adrButtons = allowedAreas
                .filter(area => getCfnetAreaModule(area) === moduleName)
                .map(area => `<button class="address-picker-area address-picker-area-child${area.prefix === state.selectedAreaPrefix ? ' is-selected' : ''}" type="button" data-address-area="${escapeHtml(area.prefix)}">
                        <span>${escapeHtml(`${getCfnetAreaModule(area)}.${getCfnetAreaAdr(area)}`)}</span>
                        <small>${escapeHtml(area.type)}</small>
                    </button>`)
                .join('');
            return `<div class="address-picker-area-group">
                    <div class="address-picker-area-group-label">
                        <span>${escapeHtml(moduleName)}</span>
                        <small>${escapeHtml(moduleLabel)}</small>
                    </div>
                    <div class="address-picker-area-children">${adrButtons}</div>
                </div>`;
        }).join('');
    }

    return `<button class="address-picker-area${state.selectedAreaPrefix === '__ACTIVE__' ? ' is-selected' : ''}" type="button" data-address-area="__ACTIVE__">
            <span>${useKoreanLanguage ? '활성주소' : 'Active'}</span>
            <small>${useKoreanLanguage ? '비트/데이터' : 'Bit/Data'}</small>
        </button>
        ${allowedAreas.map(area => `<button class="address-picker-area${area.prefix === state.selectedAreaPrefix ? ' is-selected' : ''}" type="button" data-address-area="${escapeHtml(area.prefix)}">
            <span>${escapeHtml(area.prefix)}</span>
            <small>${escapeHtml(useKoreanLanguage ? area.labelKo : (area.labelEn || area.type))}</small>
        </button>`).join('')}
        <div class="address-picker-jump-host"></div>`;
}

function renderAddressPickerSidebar(backdrop, state) {
    const sidebar = backdrop.querySelector('.address-picker-sidebar');
    if (!sidebar) {
        return;
    }

    const allowedAreas = state.provider.areas.filter(area => isAddressAreaAllowedForMode(area, state.mode));
    sidebar.innerHTML = renderAddressPickerSidebarMarkup(state, allowedAreas);
}

function renderAddressPickerMarkup(state, allowedAreas) {
    const resources = getVisualizationResources();
    const title = useKoreanLanguage ? '주소 테이블' : 'Address Table';
    const modeText = state.mode === 'BitOnly'
        ? (useKoreanLanguage ? '비트 주소' : 'Bit addresses')
        : (state.mode === 'DataOnly' ? (useKoreanLanguage ? '데이터 주소' : 'Data addresses') : (useKoreanLanguage ? '전체 주소' : 'All addresses'));
    const isCommentOnly = state.provider?.metadataMode === 'commentOnly';
    const searchPlaceholder = isCommentOnly
        ? (useKoreanLanguage ? '주소 또는 Comment 검색' : 'Search address or comment')
        : (useKoreanLanguage ? '주소 또는 별칭 검색' : 'Search address or alias');
    const tableHeader = isCommentOnly
        ? `<thead><tr><th class="address-picker-check-header"></th><th>${useKoreanLanguage ? '주소' : 'Address'}</th><th>Comment</th><th>Type</th></tr></thead>`
        : `<thead><tr><th class="address-picker-check-header"></th><th>${useKoreanLanguage ? '주소' : 'Address'}</th><th>Alias</th><th>Comment</th><th>Type</th></tr></thead>`;
    const aliasImportButton = isCommentOnly
        ? ''
        : `<button class="address-picker-alias-refresh" type="button">${escapeHtml(getAliasImportButtonText())}</button>`;
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
                ${renderAddressPickerSidebarMarkup(state, allowedAreas)}
            </div>
            <div class="address-picker-content">
                <div class="address-picker-toolbar">
                    <input class="address-picker-search" type="search" placeholder="${escapeHtml(searchPlaceholder)}" />
                    <span class="address-picker-current">${escapeHtml(state.selectedAddress || '-')}</span>
                </div>
                <div class="address-picker-table-wrap">
                    <table class="address-picker-table">
                        ${tableHeader}
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="address-picker-footer">
            ${aliasImportButton}
            <div class="address-picker-footer-actions">
                <button class="address-picker-cancel" type="button">${escapeHtml(resources.cancel || 'Cancel')}</button>
                <button class="address-picker-apply" type="button" disabled>${useKoreanLanguage ? '선택' : 'Select'}</button>
            </div>
        </div>
    </div>`;
}

function createCbprojReader(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const decoder = new TextDecoder('utf-8');
    let offset = 0;

    const ensure = length => {
        if (offset + length > view.byteLength) {
            throw new Error('Unexpected end of file.');
        }
    };

    return {
        get offset() {
            return offset;
        },
        byteLength: view.byteLength,
        readByte() {
            ensure(1);
            const value = view.getUint8(offset);
            offset += 1;
            return value;
        },
        readBoolean() {
            return this.readByte() !== 0;
        },
        readInt32() {
            ensure(4);
            const value = view.getInt32(offset, true);
            offset += 4;
            return value;
        },
        readUInt32() {
            ensure(4);
            const value = view.getUint32(offset, true);
            offset += 4;
            return value;
        },
        readUInt16() {
            ensure(2);
            const value = view.getUint16(offset, true);
            offset += 2;
            return value;
        },
        readAscii(length) {
            ensure(length);
            const bytes = new Uint8Array(arrayBuffer, offset, length);
            offset += length;
            return String.fromCharCode(...bytes);
        },
        readString8() {
            const length = this.readByte();
            if (length === 0) {
                return '';
            }
            ensure(length);
            const bytes = new Uint8Array(arrayBuffer, offset, length);
            offset += length;
            return decoder.decode(bytes);
        },
        readString32() {
            const length = this.readInt32();
            if (length < 0) {
                throw new Error('Invalid string length.');
            }
            if (length === 0) {
                return '';
            }
            ensure(length);
            const bytes = new Uint8Array(arrayBuffer, offset, length);
            offset += length;
            return decoder.decode(bytes);
        }
    };
}

function parseCbprojAddressMetadata(arrayBuffer) {
    const reader = createCbprojReader(arrayBuffer);
    const magic = reader.readAscii(5);
    if (magic !== 'CBPJ2') {
        throw new Error(useKoreanLanguage ? '지원하지 않는 프로젝트 파일 형식입니다.' : 'Unsupported project file format.');
    }

    const storedSize = reader.readUInt32();
    reader.readUInt32();
    if (storedSize !== reader.byteLength) {
        throw new Error(useKoreanLanguage ? '프로젝트 파일 크기가 올바르지 않습니다.' : 'Project file size is invalid.');
    }

    reader.readInt32();
    for (let index = 0; index < 4; index += 1) {
        reader.readByte();
    }

    const basicCount = reader.readInt32();
    if (basicCount < 0) {
        throw new Error('Invalid BASIC entry count.');
    }
    for (let index = 0; index < basicCount; index += 1) {
        reader.readByte();
        reader.readString8();
        reader.readString32();
    }

    const ldCount = reader.readInt32();
    if (ldCount < 0) {
        throw new Error('Invalid ladder entry count.');
    }

    const ldEntries = [];
    for (let entryIndex = 0; entryIndex < ldCount; entryIndex += 1) {
        const kind = reader.readByte();
        const name = reader.readString8();
        const columnCount = reader.readInt32();
        const lmax = reader.readInt32();
        if (columnCount < 0 || columnCount > 1000 || lmax < 0 || lmax > 100000) {
            throw new Error('Invalid ladder document size.');
        }

        const rows = [];
        const cells = [];
        for (let y = 0; y <= lmax; y += 1) {
            const disabled = reader.readBoolean();
            const rowComment = reader.readString8();
            if (disabled || rowComment) {
                rows.push({ y, disabled, comment: rowComment, rungLabel: '' });
            }
            for (let x = 0; x < columnCount; x += 1) {
                const sym = reader.readByte();
                const join = reader.readByte();
                const monIndex = reader.readUInt16();
                const monType = reader.readByte();
                const text = reader.readString8();
                if (sym !== 0 || join !== 0 || text) {
                    const runtimeAddress = getAddressFromMonitorInfo(monType, monIndex, text);
                    cells.push({
                        x,
                        y,
                        sym,
                        join,
                        text,
                        monType,
                        monIndex,
                        runtimeAddress,
                        alias: '',
                        comment: ''
                    });
                }
            }
        }

        ldEntries.push({
            kind,
            name,
            columnCount,
            rowCount: lmax + 1,
            rows,
            cells
        });
    }

    const entryCount = reader.readInt32();
    if (entryCount < 0 || entryCount > 100000) {
        throw new Error('Invalid address table entry count.');
    }

    const entries = [];
    for (let index = 0; index < entryCount; index += 1) {
        entries.push({
            prefix: reader.readString8(),
            index: reader.readInt32(),
            alias: reader.readString8(),
            comment: reader.readString8()
        });
    }

    const metadataByAddress = new Map();
    entries.forEach(entry => {
        const key = normalizeVisualizationAddressKey(`${entry.prefix}${entry.index}`);
        if (key) {
            metadataByAddress.set(key, {
                alias: String(entry.alias || '').trim(),
                comment: String(entry.comment || '').trim()
            });
        }
    });

    ldEntries.forEach(ldEntry => {
        ldEntry.cells.forEach(cell => {
            const key = normalizeVisualizationAddressKey(cell.runtimeAddress || cell.text || '');
            const metadata = key ? metadataByAddress.get(key) : null;
            if (metadata) {
                cell.alias = metadata.alias;
                cell.comment = metadata.comment;
            }
        });
    });

    const primaryLdEntry = ldEntries.find(entry => entry.cells.length > 0) || ldEntries[0] || null;
    const ldMonitorDocument = primaryLdEntry
        ? {
            success: true,
            name: primaryLdEntry.name,
            kind: primaryLdEntry.kind,
            columnCount: primaryLdEntry.columnCount,
            rowCount: primaryLdEntry.rowCount,
            rows: primaryLdEntry.rows,
            cells: primaryLdEntry.cells
        }
        : null;

    return { entries, ldMonitorDocument, ldEntries };
}

function importCublocSourceResult(result, sourceFileName) {
    const entries = Array.isArray(result) ? result : (result.entries || []);
    setImportedAddressMetadata(entries, sourceFileName);
    setLdMonitorDocument(result.ldMonitorDocument || null, sourceFileName);
    if (window.visualizationDocumentModel) {
        window.visualizationDocumentModel.addressMetadata = exportImportedAddressMetadata();
        window.visualizationDocumentModel.addressMetadataSourceFileName = importedAddressMetadataSourceFileName;
    }
    if (typeof notifyVisualizationDirty === 'function') {
        notifyVisualizationDirty();
    }

    return {
        entries,
        ldMonitorDocument: result.ldMonitorDocument || null,
        sourceFileName
    };
}

async function importCublocSourceFile(file) {
    if (!file) {
        return null;
    }

    if (!String(file.name || '').toLowerCase().endsWith('.cbproj')) {
        window.alert(useKoreanLanguage ? 'cbproj 파일만 선택할 수 있습니다.' : 'Only cbproj files can be selected.');
        return null;
    }

    try {
        const result = parseCbprojAddressMetadata(await file.arrayBuffer());
        const importResult = importCublocSourceResult(result, file.name);
        importResult.file = file;
        return importResult;
    } catch (error) {
        const message = error && error.message ? error.message : String(error);
        window.alert((useKoreanLanguage ? 'CUBLOC2 소스 파일 가져오기에 실패했습니다: ' : 'Failed to import CUBLOC2 source file: ') + message);
        return null;
    }
}

async function openCublocSourceFileHandlePicker() {
    if (typeof window.showOpenFilePicker !== 'function') {
        return null;
    }

    try {
        const handles = await window.showOpenFilePicker({
            multiple: false,
            types: [
                {
                    description: 'CUBLOC2 project file',
                    accept: {
                        'application/octet-stream': ['.cbproj'],
                        'application/json': ['.cbproj']
                    }
                }
            ]
        });

        const handle = handles && handles[0];
        if (!handle) {
            return null;
        }

        const file = await handle.getFile();
        const result = await importCublocSourceFile(file);
        if (result) {
            result.fileHandle = handle;
        }

        return result;
    } catch (error) {
        if (error && error.name === 'AbortError') {
            return null;
        }

        console.warn(error);
        return null;
    }
}

function openCublocSourceImportPicker() {
    return new Promise(resolve => {
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = '.cbproj';
        picker.style.display = 'none';
        picker.addEventListener('change', async () => {
            const file = picker.files && picker.files[0];
            picker.remove();
            if (!file) {
                resolve(null);
                return;
            }

            resolve(await importCublocSourceFile(file));
        }, { once: true });

        document.body.appendChild(picker);
        picker.click();
    });
}

window.importCublocSourceFile = importCublocSourceFile;
window.openCublocSourceFileHandlePicker = openCublocSourceFileHandlePicker;
window.openCublocSourceImportPicker = openCublocSourceImportPicker;

function openCbprojAliasImportPicker(backdrop, state, button) {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.cbproj';
    picker.style.display = 'none';
    picker.addEventListener('change', async () => {
        const file = picker.files && picker.files[0];
        picker.remove();
        if (!file) {
            return;
        }

        if (!String(file.name || '').toLowerCase().endsWith('.cbproj')) {
            window.alert(useKoreanLanguage ? 'cbproj 파일만 선택할 수 있습니다.' : 'Only cbproj files can be selected.');
            return;
        }

        try {
            const result = parseCbprojAddressMetadata(await file.arrayBuffer());
            const importResult = importCublocSourceResult(result, file.name);
            const entries = importResult.entries;
            renderAddressPickerRows(backdrop, state);
            if (button) {
                button.textContent = useKoreanLanguage ? `가져옴 ${entries.length}` : `Imported ${entries.length}`;
                window.setTimeout(() => {
                    if (document.body.contains(button)) {
                        button.textContent = getAliasImportButtonText();
                    }
                }, 1400);
            }
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            window.alert((useKoreanLanguage ? 'Alias 가져오기에 실패했습니다: ' : 'Failed to import aliases: ') + message);
        }
    }, { once: true });

    document.body.appendChild(picker);
    picker.click();
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
            initializeAddressJumpState(state);
            if (state.provider?.metadataMode === 'commentOnly') {
                renderAddressPickerSidebar(backdrop, state);
            } else {
                backdrop.querySelectorAll('.address-picker-area').forEach(button => button.classList.toggle('is-selected', button === areaButton));
                renderAddressJumpPanel(backdrop, state);
            }
            renderAddressPickerRows(backdrop, state);
            return;
        }

        const jumpButton = event.target.closest('.address-picker-jump-button');
        if (jumpButton) {
            const value = Number.parseInt(jumpButton.dataset.addressJumpValue || '0', 10);
            if (jumpButton.dataset.addressJumpLevel === 'thousand') {
                state.jumpThousands = value;
                const area = state.provider.areas.find(item => item.prefix === state.selectedAreaPrefix);
                const range = getAddressAreaRange(area);
                const firstHundred = Math.floor((Math.max(range.start, value * 1000) - (value * 1000)) / 100);
                state.jumpHundreds = firstHundred;
            } else {
                state.jumpHundreds = value;
            }
            renderAddressJumpPanel(backdrop, state);
            renderAddressPickerRows(backdrop, state);
            return;
        }

        const row = event.target.closest('.address-picker-row');
        if (row) {
            if (event.target.closest('.address-picker-comment-input')) {
                return;
            }

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
            return;
        }

        const aliasRefreshButton = event.target.closest('.address-picker-alias-refresh');
        if (aliasRefreshButton) {
            if (state.provider?.metadataMode === 'commentOnly') {
                return;
            }
            openCbprojAliasImportPicker(backdrop, state, aliasRefreshButton);
        }

    });

    const searchInput = backdrop.querySelector('.address-picker-search');
    searchInput?.addEventListener('input', () => {
        state.searchText = searchInput.value;
        renderAddressPickerRows(backdrop, state);
    });

    backdrop.addEventListener('change', event => {
        const input = event.target.closest('.address-picker-comment-input');
        if (!input) {
            return;
        }

        setCfnetAddressComment(input.dataset.addressComment || '', input.value || '');
        if (window.visualizationDocumentModel) {
            window.visualizationDocumentModel.cfnetAddressComments = exportCfnetAddressComments();
        }
        if (typeof notifyVisualizationDirty === 'function') {
            notifyVisualizationDirty();
        }
    });
}

function renderAddressPickerRows(backdrop, state) {
    let area = state.provider.areas.find(item => item.prefix === state.selectedAreaPrefix);
    if (!area && state.provider?.metadataMode === 'commentOnly') {
        const allowedAreas = state.provider.areas.filter(item => isAddressAreaAllowedForMode(item, state.mode));
        area = allowedAreas[0] || null;
        state.selectedAreaPrefix = area?.prefix || '';
        renderAddressPickerSidebar(backdrop, state);
    }
    renderAddressJumpPanel(backdrop, state);
    const rows = state.selectedAreaPrefix === '__ACTIVE__'
        ? getActiveAddressEntries(state.provider, state.usedAddressKeys, state.currentAddress, state.searchText)
        : getAddressAreaEntries(state.provider, area, state.searchText, getAddressJumpStart(state));
    const tbody = backdrop.querySelector('.address-picker-table tbody');
    const selectedKey = normalizeVisualizationAddressKey(state.selectedAddress);
    const currentKey = normalizeVisualizationAddressKey(state.currentAddress);
    const isCommentOnly = state.provider?.metadataMode === 'commentOnly';
    tbody.innerHTML = rows.length > 0
        ? rows.map(row => {
            const isSelected = normalizeVisualizationAddressKey(row.address) === selectedKey;
            const isCurrent = normalizeVisualizationAddressKey(row.address) === currentKey;
            const isUsed = state.usedAddressKeys instanceof Set && state.usedAddressKeys.has(normalizeVisualizationAddressKey(row.address));
            const displayAddress = row.address;
            const commentCell = isCommentOnly
                ? `<td><input class="address-picker-comment-input" type="text" value="${escapeHtml(row.comment)}" data-address-comment="${escapeHtml(row.address)}" /></td>`
                : `<td>${escapeHtml(row.comment)}</td>`;
            const dataCells = isCommentOnly
                ? `<td class="address-picker-check-cell" aria-label="${isCurrent ? (useKoreanLanguage ? '현재 적용된 주소' : 'Current address') : ''}">${isCurrent ? '✓' : ''}</td><td>${escapeHtml(displayAddress)}</td>${commentCell}<td>${escapeHtml(row.type)}</td>`
                : `<td class="address-picker-check-cell" aria-label="${isCurrent ? (useKoreanLanguage ? '현재 적용된 주소' : 'Current address') : ''}">${isCurrent ? '✓' : ''}</td><td>${escapeHtml(row.address)}</td><td>${escapeHtml(row.alias)}</td>${commentCell}<td>${escapeHtml(row.type)}</td>`;
            return `<tr class="address-picker-row${isSelected ? ' is-selected' : ''}${isUsed ? ' is-used' : ''}" data-address="${escapeHtml(row.address)}" aria-label="${isUsed ? (useKoreanLanguage ? '사용 중인 주소' : 'Used address') : ''}">
                ${dataCells}
            </tr>`;
        }).join('')
        : `<tr><td colspan="${isCommentOnly ? 4 : 5}" class="address-picker-empty">${useKoreanLanguage ? '표시할 주소가 없습니다.' : 'No addresses to display.'}</td></tr>`;
    updateAddressPickerSelection(backdrop, state);
}

function updateAddressPickerSelection(backdrop, state) {
    const selectedKey = normalizeVisualizationAddressKey(state.selectedAddress);
    const currentKey = normalizeVisualizationAddressKey(state.currentAddress);
    backdrop.querySelectorAll('.address-picker-row').forEach(row => {
        const isSelected = normalizeVisualizationAddressKey(row.dataset.address) === selectedKey;
        const isCurrent = normalizeVisualizationAddressKey(row.dataset.address) === currentKey;
        row.classList.toggle('is-selected', isSelected);
        const checkCell = row.querySelector('.address-picker-check-cell');
        if (checkCell) {
            checkCell.textContent = isCurrent ? '✓' : '';
            checkCell.setAttribute('aria-label', isCurrent ? (useKoreanLanguage ? '현재 적용된 주소' : 'Current address') : '');
        }
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
