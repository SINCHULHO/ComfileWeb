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
    if (toolbarDeviceConnectButton) {
        toolbarDeviceConnectButton.disabled = !(hasDevice && hasTransport && hasPortDetail);
    }

    updateDeviceConnectionStatusBar();
}

function updateDeviceConnectionStatusBar() {
    if (!deviceConnectionStatusButton || !deviceConnectionStatusText) {
        return;
    }

    const device = String(linkModelSelect?.value || '').trim();
    const transport = String(linkTransportSelect?.value || '').trim();
    const portName = device ? String(linkComPortSelect?.value || usbCdcConnectionState.portName || '').trim() : '';
    const isConnected = !!usbCdcConnectionState.isConnected;
    const hasConfiguration = !!device && (!!transport || !!portName);

    deviceConnectionStatusButton.classList.toggle('is-connected', isConnected);
    deviceConnectionStatusButton.classList.toggle('is-configured', !isConnected && hasConfiguration);
    deviceConnectionStatusButton.classList.remove('is-error');

    if (isConnected) {
        deviceConnectionStatusText.textContent = [device || 'Device', portName || usbCdcConnectionState.portName, useKoreanLanguage ? '연결됨' : 'Connected']
            .filter(Boolean)
            .join(' / ');
    } else if (hasConfiguration) {
        deviceConnectionStatusText.textContent = [
            [device || (useKoreanLanguage ? '디바이스' : 'Device'), transport, portName].filter(Boolean).join(' / '),
            useKoreanLanguage ? '연결 안됨' : 'Not connected'
        ]
            .filter(Boolean)
            .join(' - ');
    } else {
        deviceConnectionStatusText.textContent = useKoreanLanguage ? '디바이스 미연결' : 'Device not connected';
    }
}

function updateUsbConnectionUi(connectionState) {
    const selectedDevice = String(linkModelSelect?.value || '').trim();
    const selectedPort = String(linkComPortSelect?.value || '').trim();
    const reportedPort = connectionState && connectionState.portName ? String(connectionState.portName) : '';
    const isConnected = !!(connectionState && connectionState.isConnected && selectedDevice && selectedPort && selectedPort === reportedPort);
    const portName = isConnected ? reportedPort : '';
    usbCdcConnectionState = { isConnected, portName };
    const disconnectedText = useKoreanLanguage ? '연결 안됨' : 'Disconnected';
    const connectedText = useKoreanLanguage
        ? `연결됨${portName ? ` (${portName})` : ''}`
        : `Connected${portName ? ` (${portName})` : ''}`;

    if (usbConnectionState) {
        usbConnectionState.textContent = isConnected ? connectedText : disconnectedText;
    }
    if (usbConnectButton) {
        usbConnectButton.textContent = isConnected
            ? (useKoreanLanguage ? '연결 해제' : 'Disconnect')
            : (useKoreanLanguage ? '연결' : 'Connect');
    }
    if (toolbarDeviceConnectButton) {
        toolbarDeviceConnectButton.textContent = isConnected
            ? (useKoreanLanguage ? '연결 해제' : 'Disconnect')
            : (useKoreanLanguage ? '연결' : 'Connect');
        toolbarDeviceConnectButton.classList.toggle('is-connected', isConnected);
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
            portName: payload?.portName || ''
        });
    } catch (error) {
        fillComPortOptions([], '');
        updateUsbConnectionUi({ isConnected: false, portName: '' });
        console.warn(error);
    }
}

async function toggleUsbCdcConnection() {
    const currentlyConnected = !!usbCdcConnectionState.isConnected;
    if (currentlyConnected) {
        try {
            await fetch('/api/usb-cdc/disconnect', { method: 'POST' });
        } catch (error) {
            console.warn(error);
        }
        await loadUsbCdcPorts('');
        return;
    }

    const selectedPortName = String(linkComPortSelect?.value || '').trim();
    if (!selectedPortName) {
        await loadUsbCdcPorts('');
        alert(useKoreanLanguage ? '먼저 COM 포트를 선택하세요.' : 'Please select a COM port first.');
        return;
    }

    try {
        const response = await fetch('/api/usb-cdc/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                device: String(linkModelSelect?.value || 'CUBLOC2'),
                portName: selectedPortName,
                baudRate: 115200
            })
        });

        if (!response.ok) {
            throw new Error(`USB-CDC connect failed: ${response.status}`);
        }

        const payload = await response.json();
        await loadUsbCdcPorts(payload?.portName || selectedPortName);
    } catch (error) {
        console.warn(error);
        alert(useKoreanLanguage ? 'USB-CDC 연결에 실패했습니다.' : 'Failed to connect USB-CDC.');
        await loadUsbCdcPorts(selectedPortName);
    }
}
