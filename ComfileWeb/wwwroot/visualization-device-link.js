function isCurrentVisualizationLanguageKorean() {
    if (typeof window.comfileWebUseKoreanLanguage === 'boolean') {
        return window.comfileWebUseKoreanLanguage;
    }

    if (typeof window.getVisualizationLanguageResources === 'function') {
        return !!window.getVisualizationLanguageResources().useKorean;
    }

    const documentLanguage = String(document.documentElement?.dataset?.languageMode || '').trim().toLowerCase();
    if (documentLanguage === 'en') {
        return false;
    }
    if (documentLanguage === 'ko') {
        return true;
    }

    const selectedLanguage = String(languageModeSelect?.value || '').trim().toLowerCase();
    if (selectedLanguage === 'en') {
        return false;
    }
    if (selectedLanguage === 'ko') {
        return true;
    }

    try {
        const storedLanguage = String(localStorage.getItem('comfileweb.languageMode') || '').trim().toLowerCase();
        if (storedLanguage === 'en') {
            return false;
        }
        if (storedLanguage === 'ko') {
            return true;
        }
    } catch {
    }

    return typeof useKoreanLanguage === 'boolean' ? useKoreanLanguage : true;
}

function syncDeviceLinkLanguageUi() {
    updateUsbConnectionUi(usbCdcConnectionState);
    updateLinkWizardStepState();
}

window.addEventListener('visualization-language-changed', () => {
    syncDeviceLinkLanguageUi();
});

window.setTimeout(syncDeviceLinkLanguageUi, 0);

function getLinkTransportMode() {
    return String(linkTransportSelect?.value || 'USB').trim();
}

function updateLinkTransportRows() {
    const transport = getLinkTransportMode();
    const showEthernet = transport === 'Ethernet';
    if (linkComPortRow) {
        linkComPortRow.style.display = showEthernet ? 'none' : '';
    }
    if (linkEthernetIpRow) {
        linkEthernetIpRow.style.display = showEthernet ? '' : 'none';
    }
    if (linkEthernetPortRow) {
        linkEthernetPortRow.style.display = showEthernet ? '' : 'none';
    }

    updateLinkWizardStepState();
}

function updateLinkWizardStepState() {
    const hasDevice = !!String(linkModelSelect?.value || '').trim();
    const hasTransport = !!String(linkTransportSelect?.value || '').trim();
    const transport = getLinkTransportMode();
    let hasPortDetail = false;
    if (!hasDevice) {
        hasPortDetail = false;
    } else if (transport === 'Ethernet') {
        hasPortDetail = !!String(linkEthernetIpInput?.value || '').trim() && !!String(linkEthernetPortInput?.value || '').trim();
    } else {
        hasPortDetail = !!String(linkComPortSelect?.value || '').trim();
    }

    if (linkStep2) {
        linkStep2.classList.toggle('is-disabled', !hasDevice);
    }
    if (linkStep3) {
        linkStep3.classList.toggle('is-disabled', !(hasDevice && hasTransport));
    }
    if (linkStep4) {
        linkStep4.classList.toggle('is-disabled', !(hasDevice && hasTransport && hasPortDetail));
    }

    if (usbConnectButton) {
        usbConnectButton.disabled = !(hasDevice && hasTransport && hasPortDetail);
    }

    updateDeviceConnectionStatusBar();
}

function updateDeviceConnectionStatusBar() {
    if (!deviceConnectionStatusButton || !deviceConnectionStatusText) {
        return;
    }

    const useKorean = isCurrentVisualizationLanguageKorean();
    const device = String(linkModelSelect?.value || '').trim();
    const transport = String(linkTransportSelect?.value || '').trim();
    const portName = device ? String(linkComPortSelect?.value || usbCdcConnectionState.portName || '').trim() : '';
    const isConnected = !!usbCdcConnectionState.isConnected;
    const lastTestOk = !!usbCdcConnectionState.testOk && !!portName && portName === usbCdcConnectionState.testPortName;
    const hasConfiguration = !!device && (!!transport || !!portName);

    deviceConnectionStatusButton.classList.toggle('is-connected', isConnected);
    deviceConnectionStatusButton.classList.toggle('is-configured', !isConnected && (lastTestOk || hasConfiguration));
    deviceConnectionStatusButton.classList.remove('is-error');

    let statusText = '';
    let titleText = '';

    if (isConnected) {
        const activePort = portName || usbCdcConnectionState.portName;
        statusText = [activePort, useKorean ? '실행 중 연결됨' : 'Connected while running'].filter(Boolean).join(' · ');
        titleText = [device || 'Device', transport, activePort, useKorean ? '실행 중 연결됨' : 'Connected while running'].filter(Boolean).join(' / ');
    } else if (lastTestOk) {
        statusText = [portName, useKorean ? '연결 이상없음' : 'Connection OK'].filter(Boolean).join(' · ');
        titleText = [device || 'Device', transport, portName, useKorean ? '연결 이상없음' : 'Connection OK'].filter(Boolean).join(' / ');
    } else if (hasConfiguration) {
        statusText = [portName || transport, useKorean ? '준비됨' : 'Ready'].filter(Boolean).join(' · ');
        titleText = [device || (useKorean ? '디바이스' : 'Device'), transport, portName, useKorean ? '준비됨 - 실행하면 연결됩니다' : 'Ready - connects when running'].filter(Boolean).join(' / ');
    } else {
        statusText = useKorean ? '디바이스 미설정' : 'Device not set';
        titleText = useKorean ? '디바이스 연결 설정' : 'Device connection settings';
    }

    deviceConnectionStatusText.textContent = statusText;
    deviceConnectionStatusButton.title = titleText;
    deviceConnectionStatusButton.setAttribute('aria-label', titleText);
}

function updateUsbConnectionUi(connectionState) {
    const useKorean = isCurrentVisualizationLanguageKorean();
    const selectedDevice = String(linkModelSelect?.value || '').trim();
    const selectedPort = String(linkComPortSelect?.value || '').trim();
    const reportedPort = connectionState && connectionState.portName ? String(connectionState.portName) : '';
    const isConnected = !!(connectionState && connectionState.isConnected && selectedDevice && selectedPort && selectedPort === reportedPort);
    const portName = isConnected ? reportedPort : '';
    const testOk = !!(connectionState && connectionState.testOk && selectedPort && selectedPort === String(connectionState.testPortName || '').trim());
    const testPortName = testOk ? selectedPort : '';
    usbCdcConnectionState = { isConnected, portName, testOk, testPortName };
    const disconnectedText = testOk
        ? (useKorean ? '연결 이상없음' : 'Connection OK')
        : (useKorean ? '준비됨' : 'Ready');
    const connectedText = useKorean
        ? `연결됨${portName ? ` (${portName})` : ''}`
        : `Connected${portName ? ` (${portName})` : ''}`;

    if (usbConnectionState) {
        usbConnectionState.textContent = isConnected ? connectedText : disconnectedText;
    }
    if (usbConnectButton) {
        usbConnectButton.textContent = useKorean ? '연결 테스트' : 'Connection test';
    }

    updateDeviceConnectionStatusBar();
}

function fillComPortOptions(ports, selectedPortName) {
    if (!linkComPortSelect) {
        return;
    }

    const hasDevice = !!String(linkModelSelect?.value || '').trim();
    if (!hasDevice) {
        linkComPortSelect.innerHTML = '';
        const option = document.createElement('option');
        option.value = '';
        option.textContent = useKoreanLanguage ? '미정' : 'Not set';
        linkComPortSelect.appendChild(option);
        linkComPortSelect.value = '';
        updateLinkWizardStepState();
        return;
    }

    const previous = String(selectedPortName || linkComPortSelect.value || '').trim();
    const normalizedPorts = Array.isArray(ports)
        ? ports.map(item => String(item || '').trim()).filter(Boolean)
        : [];
    const displayPorts = previous && !normalizedPorts.includes(previous)
        ? [previous, ...normalizedPorts]
        : normalizedPorts;
    const activeValue = previous && displayPorts.includes(previous)
        ? previous
        : (displayPorts[0] || '');

    linkComPortSelect.innerHTML = '';
    if (displayPorts.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = useKoreanLanguage ? '포트 없음' : 'No ports';
        linkComPortSelect.appendChild(option);
        updateLinkWizardStepState();
        return;
    }

    displayPorts.forEach(port => {
        const option = document.createElement('option');
        option.value = port;
        option.textContent = port === previous && !normalizedPorts.includes(previous)
            ? (useKoreanLanguage ? `${port} (저장됨)` : `${port} (saved)`)
            : port;
        linkComPortSelect.appendChild(option);
    });
    linkComPortSelect.value = activeValue;
    updateLinkWizardStepState();
}

function fillComPortOptionsWithInfo(portInfos, selectedPortName) {
    if (!linkComPortSelect) {
        return;
    }

    const hasDevice = !!String(linkModelSelect?.value || '').trim();
    if (!hasDevice) {
        fillComPortOptions([], '');
        return;
    }

    const normalizedInfos = Array.isArray(portInfos)
        ? portInfos
            .map(item => {
                const portName = String(item?.portName || '').trim();
                const displayName = String(item?.displayName || '').trim();
                return portName ? { portName, displayName: displayName || portName } : null;
            })
            .filter(Boolean)
        : [];

    if (normalizedInfos.length === 0) {
        fillComPortOptions([], selectedPortName);
        return;
    }

    const previous = String(selectedPortName || linkComPortSelect.value || '').trim();
    const firstPortName = normalizedInfos[0]?.portName || '';
    const hasPrevious = normalizedInfos.some(info => info.portName === previous);
    if (previous && !hasPrevious) {
        normalizedInfos.unshift({
            portName: previous,
            displayName: useKoreanLanguage ? `${previous} (저장됨)` : `${previous} (saved)`
        });
    }

    const activeValue = normalizedInfos.some(info => info.portName === previous)
        ? previous
        : firstPortName;

    linkComPortSelect.innerHTML = '';
    normalizedInfos.forEach(info => {
        const option = document.createElement('option');
        option.value = info.portName;
        option.textContent = info.displayName;
        linkComPortSelect.appendChild(option);
    });
    linkComPortSelect.value = activeValue;
    updateLinkWizardStepState();
}

async function applyDeviceConnectionState(state) {
    const deviceConnection = normalizeDeviceConnection(state);
    documentModel.deviceConnection = deviceConnection;

    if (linkModelSelect) {
        linkModelSelect.value = deviceConnection.device;
    }
    if (linkTransportSelect) {
        linkTransportSelect.value = deviceConnection.transport;
    }
    if (linkEthernetIpInput) {
        linkEthernetIpInput.value = deviceConnection.ethernetIpAddress;
    }
    if (linkEthernetPortInput) {
        linkEthernetPortInput.value = String(deviceConnection.ethernetPort);
    }

    updateLinkTransportRows();
    if (getLinkTransportMode() !== 'Ethernet') {
        await loadUsbCdcPorts(deviceConnection.portName);
        if (linkComPortSelect && deviceConnection.portName) {
            linkComPortSelect.value = deviceConnection.portName;
        }
    }

    updateLinkWizardStepState();
}

async function loadUsbCdcPorts(preferredPortName) {
    try {
        const response = await fetch('/api/usb-cdc/ports', { method: 'GET' });
        if (!response.ok) {
            throw new Error(`USB-CDC ports request failed: ${response.status}`);
        }

        const payload = await response.json();
        fillComPortOptionsWithInfo(payload?.portInfos, preferredPortName || '');
        updateUsbConnectionUi({
            isConnected: !!payload?.isConnected,
            portName: payload?.portName || '',
            testOk: usbCdcConnectionState.testOk,
            testPortName: usbCdcConnectionState.testPortName
        });
    } catch (error) {
        fillComPortOptions([], '');
        updateUsbConnectionUi({ isConnected: false, portName: '' });
        console.warn(error);
    }
}

async function toggleUsbCdcConnection() {
    const selectedPortName = String(linkComPortSelect?.value || '').trim();
    if (!selectedPortName) {
        await loadUsbCdcPorts('');
        alert(useKoreanLanguage ? '먼저 COM 포트를 선택하세요.' : 'Please select a COM port first.');
        return;
    }

    try {
        updateUsbConnectionUi({ isConnected: false, portName: '', testOk: false, testPortName: '' });
        const response = await fetch('/api/usb-cdc/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                device: String(linkModelSelect?.value || 'CUBLOC2'),
                portName: selectedPortName,
                baudRate: 115200
            })
        });

        if (!response.ok) {
            throw new Error(`USB-CDC test failed: ${response.status}`);
        }

        await response.json();
        updateUsbConnectionUi({ isConnected: false, portName: '', testOk: true, testPortName: selectedPortName });
    } catch (error) {
        console.warn(error);
        updateUsbConnectionUi({ isConnected: false, portName: '', testOk: false, testPortName: '' });
        alert(useKoreanLanguage ? 'USB-CDC 연결 테스트에 실패했습니다.' : 'USB-CDC connection test failed.');
        await loadUsbCdcPorts(selectedPortName);
    }
}
