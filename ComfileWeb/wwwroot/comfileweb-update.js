(function () {
    'use strict';
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return;
    const restoreKey = 'comfileweb-update-project';
    const banner = document.createElement('div');
    banner.className = 'app-update-banner'; banner.hidden = true;
    banner.setAttribute('role', 'status');
    const label = document.createElement('span');
    const button = document.createElement('button'); button.type = 'button';
    const discardButton = document.createElement('button'); discardButton.type = 'button';
    banner.append(label, button, discardButton); document.body.append(banner);
    const korean = () => window.comfileWebUseKoreanLanguage !== false;
    let info, checking = false, restartTimer, restarting = false, updateBlocked = false;
    let lockVersion, lockTime, lastMessage;
    function message(ko, en) { lastMessage = [ko, en]; banner.hidden = false; label.textContent = korean() ? ko : en; }
    function unlock() {
        window.comfileUpdateLocked = false;
        document.querySelector('.designer').inert = false;
        clearInterval(restartTimer); restartTimer = null;
        button.disabled = false;
        discardButton.disabled = false;
        sessionStorage.removeItem(restoreKey);
    }
    window.comfileUpdateUi = {
        lock(version, discardUnsaved = false) {
            const state = window.comfileMcpProject.status();
            if (runtimeRunning || runtimeStarting) return { success: false, code: 'RUNTIME_ACTIVE', projectName: state.projectName };
            if (state.dirty && !discardUnsaved) {
                updateBlocked = true;
                message('이 탭의 변경 사항이 저장되지 않아 업데이트가 보류되었습니다. 이 탭을 저장한 뒤 다시 시도하세요.', 'This tab has unsaved changes and is blocking the update. Save this tab, then retry.');
                return { success: false, code: 'DIRTY_EDITOR', projectName: state.projectName };
            }
            try { sessionStorage.setItem(restoreKey, state.projectName || ''); }
            catch { return { success: false, code: 'STORAGE_UNAVAILABLE', projectName: state.projectName }; }
            window.comfileUpdateLocked = true;
            document.querySelector('.designer').inert = true;
            lockVersion = version || info?.currentVersion;
            lockTime = Date.now();
            if (discardUnsaved) message('저장하지 않고 새 버전으로 전환 중…', 'Switching to the new version without saving…');
            else message('저장 완료. 새 버전으로 전환 중…', 'Saved. Switching to the new version…');
            button.disabled = true;
            discardButton.disabled = true;
            if (!restartTimer) restartTimer = setInterval(checkRestart, 1500);
            return { success: true };
        },
        unlock
    };
    document.addEventListener('keydown', event => {
        if (window.comfileUpdateLocked) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    async function checkRestart() {
        if (Date.now() - lockTime > 60000) {
            unlock(); restarting = false;
            message('업데이트 전환을 확인하지 못했습니다. 현재 화면을 유지했습니다. 새 앱 실행 상태를 확인하세요.', 'Update could not be confirmed. The current editor is preserved. Check the new application.');
            return;
        }
        try {
            const response = await fetch('/api/version', { cache: 'no-store' });
            const data = await response.json();
            if (lockVersion && data.version !== lockVersion) location.reload();
        } catch { /* 서버가 교체되는 동안 잠시 연결이 끊긴다. */ }
    }
    async function check() {
        if (checking || window.comfileUpdateLocked || restarting) return;
        checking = true;
        try {
            const response = await fetch('/api/app/update', { cache: 'no-store' });
            if (!response.ok) return;
            info = await response.json();
            if (info.availableVersion && !updateBlocked) {
                message(`실행 버전 ${info.currentVersion} · 새 버전 ${info.availableVersion} 준비됨`, `Running ${info.currentVersion} · New version ${info.availableVersion} ready`);
                button.textContent = korean() ? '저장 후 업데이트' : 'Save and update';
                discardButton.textContent = korean() ? '저장하지 않고 업데이트' : 'Update without saving';
            }
        } catch { /* 다음 확인 주기에 다시 시도한다. */ }
        finally { checking = false; }
    }
    async function requestUpdate(discardUnsaved) {
        if (!info?.availableVersion || restarting) return;
        if (runtimeRunning || runtimeStarting) {
            message('실행을 중지한 뒤 업데이트하세요.', 'Stop runtime before updating.'); return;
        }
        if (discardUnsaved && !window.confirm(korean()
            ? '열려 있는 모든 편집 탭의 저장하지 않은 변경 사항이 사라집니다. 저장된 프로젝트 파일은 유지됩니다. 저장하지 않고 업데이트할까요?'
            : 'Unsaved changes in ALL open editor tabs will be discarded. Saved project files will be kept. Update without saving?')) return;
        button.disabled = true;
        discardButton.disabled = true;
        updateBlocked = false;
        try {
            if (!discardUnsaved) {
                if (!await window.comfileMcpProject.saveForUpdate()) return;
                if (window.comfileMcpProject.status().dirty) return;
            }
            restarting = true;
            const response = await fetch('/api/app/update', {
                method: 'POST', headers: { 'X-Comfile-Update-Token': info.token, 'X-Comfile-Discard-Unsaved': String(discardUnsaved) }
            });
            if (!response.ok) {
                unlock(); restarting = false;
                updateBlocked = true;
                const failure = await response.json().catch(() => ({}));
                const project = failure.projectName || (korean() ? '이름 없는 프로젝트' : 'Unnamed project');
                const reasons = {
                    DIRTY_EDITOR: [`다른 편집 탭의 '${project}'에 저장하지 않은 변경 사항이 있습니다. 해당 탭을 저장한 뒤 다시 시도하세요.`, `Another editor tab has unsaved changes in '${project}'. Save that tab, then retry.`],
                    RUNTIME_ACTIVE: ['실행 중인 화면이 있습니다. 실행을 중지한 뒤 다시 시도하세요.', 'A runtime is active. Stop it, then retry.'],
                    NO_EDITORS: ['편집 탭 연결이 없습니다. 이 PC의 localhost 화면을 다시 여세요.', 'No editor is connected. Reopen the localhost page on this PC.'],
                    EDITOR_TIMEOUT: ['응답하지 않는 편집 탭이 있습니다. 해당 탭의 연결을 확인한 뒤 다시 시도하세요.', 'An editor tab is not responding. Check its connection, then retry.'],
                    EDITOR_CLOSED: ['확인 도중 편집 탭이 닫혔습니다. 다시 시도하세요.', 'An editor tab closed during the check. Retry the update.'],
                    EDITORS_CHANGED: ['편집 탭 연결이 바뀌었습니다. 다시 시도하세요.', 'Editor connections changed. Retry the update.'],
                    STORAGE_UNAVAILABLE: ['편집 탭에서 복구 정보를 저장할 수 없습니다. 브라우저 저장소 설정을 확인하세요.', 'An editor cannot store recovery information. Check browser storage settings.']
                };
                message(...(reasons[failure.code] || ['업데이트 준비 확인에 실패했습니다. 편집 탭의 상태와 서버 연결을 확인하세요.', 'Update preparation failed. Check the editor tabs and server connection.']));
            }
        } catch {
            if (!window.comfileUpdateLocked) {
                restarting = false;
                message('업데이트 요청에 실패했습니다. 다시 시도하세요.', 'Update request failed. Please retry.');
            }
        } finally { if (!window.comfileUpdateLocked) { button.disabled = false; discardButton.disabled = false; } }
    }
    button.addEventListener('click', () => requestUpdate(false));
    discardButton.addEventListener('click', () => requestUpdate(true));
    async function restore() {
        const name = sessionStorage.getItem(restoreKey);
        if (name) {
            try {
                const response = await fetch('/api/project/load?name=' + encodeURIComponent(name), { cache: 'no-store' });
                if (!response.ok) throw new Error();
                const data = await response.json();
                // 로드 API는 문서 JSON을 그대로 반환한다.
                importVisualizationDocumentText(JSON.stringify(data));
                window.comfileMcpProject.opened(name);
                sessionStorage.removeItem(restoreKey);
            } catch { message('저장된 프로젝트를 다시 여세요: ' + name, 'Reopen saved project: ' + name); }
        }
        await check();
    }
    window.addEventListener('visualization-language-changed', () => {
        if (lastMessage) label.textContent = lastMessage[korean() ? 0 : 1];
        button.textContent = korean() ? '저장 후 업데이트' : 'Save and update';
        discardButton.textContent = korean() ? '저장하지 않고 업데이트' : 'Update without saving';
        check();
    });
    window.addEventListener('pageshow', check);
    window.addEventListener('focus', check);
    setInterval(check, 10000);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore, { once: true });
    else restore();
})();
