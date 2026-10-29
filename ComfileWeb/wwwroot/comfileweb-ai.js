(function () {
    'use strict';
    const launch = document.getElementById('aiConnectionButton');
    const dialog = document.createElement('dialog');
    dialog.className = 'ai-connection-dialog';
    dialog.setAttribute('aria-labelledby', 'aiConnectionTitle');
    dialog.innerHTML = '<h2 id="aiConnectionTitle"></h2><p class="ai-description"></p><p class="ai-result" role="status" aria-live="polite"></p><div class="ai-actions"><button type="button" class="ai-register"></button><button type="button" class="ai-close"></button></div>';
    document.body.append(dialog);
    const register = dialog.querySelector('.ai-register');
    const close = dialog.querySelector('.ai-close');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    let state = 'idle';
    const messages = {
        idle: ['', ''],
        busy: ['Codex 연결을 설정하고 있습니다…', 'Setting up Codex…'],
        done: ['설정 완료! Codex를 완전히 종료한 뒤 다시 실행하세요. ComfileWEB과 이 화면은 열어 두세요.', 'Setup complete! Fully quit and reopen Codex. Keep ComfileWEB and this page open.'],
        failed: ['설정하지 못했습니다. Codex 설정 파일의 형식이나 쓰기 권한을 확인한 뒤 다시 시도하세요. 기존 파일이 있으면 변경 전 백업을 보관합니다.', 'Setup failed. Check the Codex configuration format and write access, then retry. Existing files are backed up before replacement.'],
        remote: ['ComfileWEB이 설치된 PC에서 localhost 주소로 접속해 설정하세요.', 'Open the localhost address on the PC running ComfileWEB to configure Codex.']
    };
    function render() {
        const ko = window.comfileWebUseKoreanLanguage !== false;
        launch.textContent = ko ? 'AI 연결 설정' : 'AI connection';
        dialog.querySelector('h2').textContent = ko ? 'AI 연결 설정' : 'AI connection';
        dialog.querySelector('.ai-description').textContent = ko
            ? '이 PC의 Codex에 ComfileWEB을 등록합니다. Codex가 설치되어 있어야 하며, 기존 설정은 백업한 뒤 유지합니다.'
            : 'Register ComfileWEB with Codex on this PC. Install Codex first. Existing settings are backed up and preserved.';
        dialog.querySelector('.ai-result').textContent = messages[local ? state : 'remote'][ko ? 0 : 1];
        register.textContent = state === 'done' ? (ko ? '설정 완료' : 'Configured') : (ko ? 'Codex 연결 설정' : 'Set up Codex');
        register.disabled = !local || state === 'busy' || state === 'done';
        close.textContent = ko ? '닫기' : 'Close';
    }
    launch.addEventListener('click', () => { render(); dialog.showModal(); });
    close.addEventListener('click', () => dialog.close());
    register.addEventListener('click', async () => {
        if (!local || state === 'busy' || state === 'done') return;
        state = 'busy'; render();
        try {
            const tokenResponse = await fetch('/api/app/update', { cache: 'no-store' });
            if (!tokenResponse.ok) throw new Error();
            const { token } = await tokenResponse.json();
            const response = await fetch('/api/ai/codex/setup', { method: 'POST', headers: { 'X-Comfile-Update-Token': token } });
            if (!response.ok || !(await response.json()).configured) throw new Error();
            state = 'done';
        } catch { state = 'failed'; }
        render();
    });
    window.addEventListener('visualization-language-changed', render);
    render();
})();
