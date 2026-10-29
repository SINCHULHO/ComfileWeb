(function () {
    'use strict';
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return;
    const restoreKey = 'comfileweb-update-project';
    const banner = document.createElement('div');
    banner.className = 'app-update-banner'; banner.hidden = true;
    banner.setAttribute('role', 'status');
    const label = document.createElement('span');
    const button = document.createElement('button'); button.type = 'button';
    banner.append(label, button); document.body.append(banner);
    const korean = () => window.comfileWebUseKoreanLanguage !== false;
    let info, checking = false, restartTimer, restarting = false;
    let lockVersion, lockTime, lastMessage;
    function message(ko, en) { lastMessage = [ko, en]; banner.hidden = false; label.textContent = korean() ? ko : en; }
    function unlock() {
        window.comfileUpdateLocked = false;
        document.querySelector('.designer').inert = false;
        clearInterval(restartTimer); restartTimer = null;
        button.disabled = false;
        sessionStorage.removeItem(restoreKey);
    }
    window.comfileUpdateUi = {
        lock(version) {
            const state = window.comfileMcpProject.status();
            if (state.dirty || runtimeRunning || runtimeStarting) return { success: false };
            try { sessionStorage.setItem(restoreKey, state.projectName || ''); }
            catch { return { success: false }; }
            window.comfileUpdateLocked = true;
            document.querySelector('.designer').inert = true;
            lockVersion = version || info?.currentVersion;
            lockTime = Date.now();
            message('저장 완료. 새 버전으로 전환 중…', 'Saved. Switching to the new version…');
            button.disabled = true;
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
            message('업데이트 전환을 확인하지 못했습니다. 저장된 프로젝트를 유지했습니다. 새 앱 실행 상태를 확인하세요.', 'Update could not be confirmed. Your project is saved. Check the new application.');
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
            if (info.availableVersion) {
                message(`실행 버전 ${info.currentVersion} · 새 버전 ${info.availableVersion} 준비됨`, `Running ${info.currentVersion} · New version ${info.availableVersion} ready`);
                button.textContent = korean() ? '저장 후 업데이트' : 'Save and update';
            }
        } catch { /* 다음 확인 주기에 다시 시도한다. */ }
        finally { checking = false; }
    }
    button.addEventListener('click', async () => {
        if (!info?.availableVersion || restarting) return;
        if (runtimeRunning || runtimeStarting) {
            message('실행을 중지한 뒤 업데이트하세요.', 'Stop runtime before updating.'); return;
        }
        button.disabled = true;
        try {
            if (!await window.comfileMcpProject.saveForUpdate()) return;
            if (window.comfileMcpProject.status().dirty) return;
            restarting = true;
            const response = await fetch('/api/app/update', {
                method: 'POST', headers: { 'X-Comfile-Update-Token': info.token }
            });
            if (!response.ok) {
                unlock(); restarting = false;
                message('업데이트를 시작하지 못했습니다. 모든 편집 탭을 저장하고 실행을 중지한 뒤 다시 시도하세요.', 'Could not update. Save all editor tabs and stop runtime, then retry.');
            }
        } catch {
            if (!window.comfileUpdateLocked) {
                restarting = false;
                message('업데이트 요청에 실패했습니다. 다시 시도하세요.', 'Update request failed. Please retry.');
            }
        } finally { if (!window.comfileUpdateLocked) button.disabled = false; }
    });
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
        check();
    });
    window.addEventListener('pageshow', check);
    window.addEventListener('focus', check);
    setInterval(check, 10000);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore, { once: true });
    else restore();
})();
