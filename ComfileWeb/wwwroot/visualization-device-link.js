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
    if (String(linkModelSelect?.value || '').trim().toUpperCase() === 'CUBLOC2') {
        return 'USB';
    }

    return String(linkTransportSelect?.value || '').trim();
}

let cfnetConnectionInProgress = false;

function isCfnetFieldIoSelected() {
    return String(linkModelSelect?.value || '').trim().toUpperCase() === 'CFNET';
}

function getLinkStepConnectTitle() {
    return isCurrentVisualizationLanguageKorean() ? '2. 연결' : '2. Connect';
}

function getLinkStepCheckTitle() {
    return isCurrentVisualizationLanguageKorean() ? '3. 연결 체크' : '3. Connection check';
}

function getDefaultLinkStepCheckTitle() {
    return isCurrentVisualizationLanguageKorean() ? '4. 연결 체크' : '4. Connection check';
}

function getLinkStepPortTitle() {
    return isCurrentVisualizationLanguageKorean() ? '2. 포트 설정' : '2. Port settings';
}

function getDefaultLinkStepPortTitle() {
    return isCurrentVisualizationLanguageKorean() ? '3. 포트/주소 설정' : '3. Port/address settings';
}

function syncCfnetStepLayout() {
    const isCfnet = isCfnetFieldIoSelected();
    const hasDevice = !!String(linkModelSelect?.value || '').trim();
    const isCubloc2 = String(linkModelSelect?.value || '').trim().toUpperCase() === 'CUBLOC2';
    const linkWizard = linkStep1?.parentElement;
    const step3Title = linkStep3?.querySelector('.link-step-title');
    const step4Title = linkStep4?.querySelector('.link-step-title');
    if (linkWizard) {
        linkWizard.classList.toggle('is-cubloc2-link', isCubloc2);
    }
    if (step3Title) {
        step3Title.textContent = isCubloc2 ? getLinkStepPortTitle() : getDefaultLinkStepPortTitle();
    }
    if (step4Title) {
        step4Title.textContent = isCfnet
            ? getLinkStepConnectTitle()
            : (isCubloc2 ? getLinkStepCheckTitle() : getDefaultLinkStepCheckTitle());
    }

    if (linkStep2) {
        linkStep2.style.display = (!hasDevice || isCfnet || isCubloc2) ? 'none' : '';
    }
    if (linkStep3) {
        linkStep3.style.display = (!hasDevice || isCfnet) ? 'none' : '';
    }
    if (linkStep4) {
        linkStep4.style.display = hasDevice ? '' : 'none';
    }
}

function clearCfnetDetectedModules() {
    const listElement = document.getElementById('cfnetDetectedModules');
    if (listElement) {
        listElement.innerHTML = '';
    }
}

function renderCfnetDetectedModules(modules) {
    const listElement = document.getElementById('cfnetDetectedModules');
    if (!listElement) {
        return;
    }

    const normalizedModules = Array.isArray(modules) ? modules : [];
    if (normalizedModules.length === 0) {
        listElement.innerHTML = `<div class="cfnet-detected-modules-empty">${isCurrentVisualizationLanguageKorean() ? '감지된 모듈 없음' : 'No modules detected'}</div>`;
        return;
    }

    const title = isCurrentVisualizationLanguageKorean() ? '감지된 모듈' : 'Detected modules';
    const items = normalizedModules
        .map(module => {
            const type = String(module?.type || '').trim() || 'I/O Module';
            const address = String(module?.address ?? '').trim();
            return `<li>${type}${address ? ` - ${isCurrentVisualizationLanguageKorean() ? '주소' : 'Address'} ${address}` : ''}</li>`;
        })
        .join('');
    listElement.innerHTML = `<div class="cfnet-detected-modules-title">${title}</div><ul>${items}</ul>`;
}

function updateLinkTransportRows() {
    const isCfnet = isCfnetFieldIoSelected();
    const hasDevice = !!String(linkModelSelect?.value || '').trim();
    const transport = getLinkTransportMode();
    const hasTransport = !!transport;
    const showEthernet = transport === 'Ethernet';

    syncCfnetStepLayout();

    if (!hasDevice) {
        if (linkTransportSelect) {
            linkTransportSelect.value = '';
        }
        if (linkComPortRow) {
            linkComPortRow.style.display = 'none';
        }
        if (linkEthernetIpRow) {
            linkEthernetIpRow.style.display = 'none';
        }
        if (linkEthernetPortRow) {
            linkEthernetPortRow.style.display = 'none';
        }

        updateLinkWizardStepState();
        return;
    }

    if (isCfnet) {
        if (linkComPortRow) {
            linkComPortRow.style.display = 'none';
        }
        if (linkEthernetIpRow) {
            linkEthernetIpRow.style.display = 'none';
        }
        if (linkEthernetPortRow) {
            linkEthernetPortRow.style.display = 'none';
        }
        if (linkTransportSelect) {
            linkTransportSelect.value = '';
        }

        updateLinkWizardStepState();
        return;
    }

    if (linkTransportSelect) {
        linkTransportSelect.value = hasDevice ? 'USB' : '';
    }

    if (linkComPortRow) {
        linkComPortRow.style.display = (!hasDevice || !hasTransport || showEthernet) ? 'none' : '';
    }
    if (linkEthernetIpRow) {
        linkEthernetIpRow.style.display = (hasDevice && hasTransport && showEthernet) ? '' : 'none';
    }
    if (linkEthernetPortRow) {
        linkEthernetPortRow.style.display = (hasDevice && hasTransport && showEthernet) ? '' : 'none';
    }

    updateLinkWizardStepState();
}

function updateLinkWizardStepState() {
    syncCfnetStepLayout();

    const isCfnet = isCfnetFieldIoSelected();
    const hasDevice = !!String(linkModelSelect?.value || '').trim();
    const hasTransport = isCfnet ? true : !!getLinkTransportMode();
    const transport = getLinkTransportMode();
    let hasPortDetail = false;
    if (isCfnet) {
        hasPortDetail = hasDevice;
    } else if (!hasDevice || !hasTransport) {
        hasPortDetail = false;
    } else if (transport === 'Ethernet') {
        hasPortDetail = !!String(linkEthernetIpInput?.value || '').trim() && !!String(linkEthernetPortInput?.value || '').trim();
    } else {
        hasPortDetail = !!String(linkComPortSelect?.value || '').trim();
    }

    if (linkStep2) {
        linkStep2.classList.toggle('is-disabled', !hasDevice || isCfnet);
    }
    if (linkStep3) {
        linkStep3.classList.toggle('is-disabled', isCfnet || !(hasDevice && hasTransport));
    }
    if (linkStep4) {
        linkStep4.classList.toggle('is-disabled', isCfnet ? !hasDevice : !(hasDevice && hasTransport && hasPortDetail));
    }

    if (usbConnectButton) {
        usbConnectButton.disabled = isCfnet ? !hasDevice : !(hasDevice && hasTransport && hasPortDetail);
    }

    updateDeviceConnectionStatusBar();
}

function updateDeviceConnectionStatusBar() {
    if (!deviceConnectionStatusButton || !deviceConnectionStatusText) {
        return;
    }

    const useKorean = isCurrentVisualizationLanguageKorean();
    const device = String(linkModelSelect?.value || '').trim();
    const isCfnet = isCfnetFieldIoSelected();
    const transport = String(linkTransportSelect?.value || '').trim();
    const hasTransport = isCfnet ? true : !!transport;
    const portName = (device && hasTransport) ? String(linkComPortSelect?.value || usbCdcConnectionState.portName || '').trim() : '';
    const hasPortDetail = hasTransport
        ? (isCfnet
            ? true
            : (transport === 'Ethernet'
            ? (!!String(linkEthernetIpInput?.value || '').trim() && !!String(linkEthernetPortInput?.value || '').trim())
            : !!String(linkComPortSelect?.value || '').trim()))
        : false;
    const isConnected = !!usbCdcConnectionState.isConnected;
    const lastTestOk = isCfnet
        ? !!usbCdcConnectionState.testOk
        : (!!usbCdcConnectionState.testOk && !!portName && portName === usbCdcConnectionState.testPortName);
    const hasConfiguration = !!device && hasTransport && hasPortDetail;

    deviceConnectionStatusButton.classList.toggle('is-connected', isConnected);
    deviceConnectionStatusButton.classList.toggle('is-configured', !isConnected && (lastTestOk || hasConfiguration));
    deviceConnectionStatusButton.classList.remove('is-error');

    let statusText = '';
    let titleText = '';

    if (isConnected) {
        const activePort = isCfnet ? 'CFNET' : (portName || usbCdcConnectionState.portName);
        statusText = [activePort, useKorean ? '연결됨' : 'Connected'].filter(Boolean).join(' · ');
        titleText = [device || 'Device', transport, activePort, useKorean ? '연결됨' : 'Connected'].filter(Boolean).join(' / ');
    } else if (lastTestOk) {
        statusText = portName;
        titleText = [device || 'Device', transport, portName, useKorean ? '연결 이상없음' : 'Connection OK'].filter(Boolean).join(' / ');
    } else if (hasConfiguration) {
        if (isCfnet) {
            statusText = 'CFNET';
            titleText = device || (useKorean ? '디바이스' : 'Device');
        } else {
            statusText = portName || transport;
            titleText = [device || (useKorean ? '디바이스' : 'Device'), transport, portName].filter(Boolean).join(' / ');
        }
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
    const isCfnet = isCfnetFieldIoSelected();
    const selectedPort = String(linkComPortSelect?.value || '').trim();
    const reportedPort = connectionState && connectionState.portName ? String(connectionState.portName) : '';
    const isConnected = !!(connectionState && connectionState.isConnected && selectedDevice && (isCfnet || (selectedPort && selectedPort === reportedPort)));
    const portName = isConnected ? (isCfnet ? 'CFNET' : reportedPort) : '';
    const testOk = isCfnet
        ? !!(connectionState && connectionState.testOk)
        : !!(connectionState && connectionState.testOk && selectedPort && selectedPort === String(connectionState.testPortName || '').trim());
    const testPortName = testOk ? (isCfnet ? 'CFNET' : selectedPort) : '';
    usbCdcConnectionState = { isConnected, portName, testOk, testPortName };
    const hasDevice = !!selectedDevice;
    const hasTransport = isCfnet ? true : !!String(linkTransportSelect?.value || '').trim();
    const hasPortDetail = hasTransport
        ? (isCfnet
            ? true
            : (String(linkTransportSelect?.value || '').trim() === 'Ethernet'
            ? (!!String(linkEthernetIpInput?.value || '').trim() && !!String(linkEthernetPortInput?.value || '').trim())
            : !!selectedPort))
        : false;
    const disconnectedText = testOk
        ? (useKorean ? '연결 이상없음' : 'Connection OK')
        : (hasDevice && hasTransport && hasPortDetail
            ? ''
            : '');
    const connectedText = useKorean
        ? `연결됨${portName ? ` (${portName})` : ''}`
        : `Connected${portName ? ` (${portName})` : ''}`;
    const connectingText = useKorean ? '연결 시도중...' : 'Connecting...';

    if (usbConnectionState) {
        usbConnectionState.textContent = cfnetConnectionInProgress ? connectingText : (isConnected ? connectedText : disconnectedText);
    }
    if (usbConnectButton) {
        const baseDisabled = isCfnet ? !hasDevice : !(hasDevice && hasTransport && hasPortDetail);
        usbConnectButton.textContent = isCfnet
            ? (cfnetConnectionInProgress
                ? connectingText
                : (isConnected || testOk
                    ? (useKorean ? '재연결' : 'Reconnect')
                    : (useKorean ? '연결' : 'Connect')))
            : (useKorean ? '연결 체크' : 'Connection check');
        usbConnectButton.disabled = cfnetConnectionInProgress || baseDisabled;
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
    if (isCfnetFieldIoSelected()) {
        fillComPortOptions([], '');
        clearCfnetDetectedModules();
        updateUsbConnectionUi({ isConnected: false, portName: 'CFNET', testOk: false, testPortName: '' });
        return;
    }

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
    if (isCfnetFieldIoSelected()) {
        try {
            if (usbCdcConnectionState?.isConnected || usbCdcConnectionState?.testOk) {
                const response = await fetch('/api/cfnet/disconnect', { method: 'POST' });
                if (!response.ok) {
                    throw new Error(`CFNET disconnect failed: ${response.status}`);
                }
            }

            cfnetConnectionInProgress = true;
            clearCfnetDetectedModules();
            updateUsbConnectionUi({
                isConnected: false,
                portName: usbCdcConnectionState.portName || 'CFNET',
                testOk: false,
                testPortName: ''
            });
            const response = await fetch('/api/cfnet/scan-modules', {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error(`CFNET module scan failed: ${response.status}`);
            }

            const payload = await response.json();
            cfnetConnectionInProgress = false;
            renderCfnetDetectedModules(payload?.modules);
            updateUsbConnectionUi({
                isConnected: true,
                portName: 'CFNET',
                testOk: true,
                testPortName: 'CFNET'
            });
        } catch (error) {
            console.warn(error);
            cfnetConnectionInProgress = false;
            clearCfnetDetectedModules();
            updateUsbConnectionUi({
                isConnected: false,
                portName: 'CFNET',
                testOk: false,
                testPortName: ''
            });
            alert(useKoreanLanguage ? 'CFNET 모듈 감지에 실패했습니다.' : 'CFNET module scan failed.');
            await loadUsbCdcPorts('');
        }
        return;
    }

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
            throw new Error(`USB-CDC connection check failed: ${response.status}`);
        }

        await response.json();
        updateUsbConnectionUi({ isConnected: false, portName: '', testOk: true, testPortName: selectedPortName });
    } catch (error) {
        console.warn(error);
        updateUsbConnectionUi({ isConnected: false, portName: '', testOk: false, testPortName: '' });
        alert(useKoreanLanguage ? 'USB-CDC 연결 체크에 실패했습니다.' : 'USB-CDC connection check failed.');
        await loadUsbCdcPorts(selectedPortName);
    }
}
