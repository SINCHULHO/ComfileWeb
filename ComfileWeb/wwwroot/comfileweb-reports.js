(() => {
    'use strict';
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return;
    const ko = () => window.comfileWebUseKoreanLanguage !== false;
    const t = (k, e) => ko() ? k : e;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'report-feedback-button';
    button.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 3.5h12a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H8l-4.5 3v-3A1.5 1.5 0 0 1 2 13V5a1.5 1.5 0 0 1 2-1.5Z"/><path d="M6 7h8M6 10.5h5"/></svg><span></span>';
    const labelButton = () => {
        const label = t('의견 보내기', 'Send feedback');
        button.querySelector('span').textContent = label;
        button.title = label; button.setAttribute('aria-label', label);
    };
    labelButton(); window.addEventListener('visualization-language-changed', labelButton);
    document.getElementById('aboutButton')?.before(button);
    const dialog = document.createElement('dialog'); dialog.className = 'report-dialog';
    dialog.innerHTML = `<h2></h2><div class="report-options"><select aria-label="Report type"><option value="bug"></option><option value="suggestion"></option></select><button type="button" data-action="pending"></button></div><div class="report-pending"></div><label class="report-intro"></label><textarea spellcheck="false" maxlength="10000"></textarea><p class="report-hint"></p><div class="report-attach"><input type="file" accept="image/png,image/jpeg" multiple hidden><button type="button" data-action="attach"></button></div><div class="report-images"></div><p class="report-status" role="status"></p><footer><button type="button" data-action="correct"></button><button type="button" data-action="discard"></button><button type="button" data-action="send"></button><button type="button" data-action="close"></button></footer>`;
    document.body.append(dialog);
    const q = s => dialog.querySelector(s), action = name => q(`[data-action="${name}"]`);
    const description = q('textarea'), kind = q('select'), files = q('input');
    let frozen = null, images = [], correction = null, busy = false, processing = false, controller = null, token = null;
    const message = text => q('.report-status').textContent = text;
    async function api(path, options = {}) {
        if (!token) {
            const response = await fetch('/api/app/update');
            if (!response.ok) throw Error(t('로컬 서버에 연결할 수 없습니다.', 'Local server unavailable.'));
            token = (await response.json()).token;
        }
        const response = await fetch('/api/reports' + path, { ...options, headers: { 'X-Comfile-Update-Token': token, 'X-Report-Language': ko() ? 'ko' : 'en', ...options.headers } });
        if (!response.ok) { if (response.status === 403) token = null; throw Error(t('보고 작업을 완료하지 못했습니다. 내용과 연결을 확인하세요.', 'Unable to complete report operation. Check content and connection.')); }
        return response.status === 204 ? null : response.json();
    }
    function update() {
        const crash = frozen?.kind === 'crash';
        q('h2').textContent = crash ? t('비정상 종료 보고', 'Unexpected shutdown report') : t('의견 보내기', 'Send feedback');
        kind.options[0].textContent = t('오류 신고', 'Report a problem'); kind.options[1].textContent = t('개선 제안', 'Suggest an improvement');
        q('.report-intro').textContent = crash ? t('이전 서버 실행이 정상적으로 종료되지 않았습니다. 아래 진단을 확인하세요. 보고하기를 눌러야 전송됩니다.', 'The previous server session terminated unexpectedly. Review the diagnostics. Nothing is sent until you choose Send report.') : t('발견한 문제나 개선할 내용을 작성해 주세요. (필수, UTF-8 10,000바이트 이하)', 'Describe the problem or improvement (required, up to 10,000 UTF-8 bytes).');
        q('.report-hint').textContent = t('스크린샷을 첨부하면 내용을 이해하는 데 도움이 됩니다.\nWin + Shift + S로 화면 영역을 캡처한 뒤, 이 창에서 Ctrl + V를 눌러 붙여넣으세요.\nPNG/JPEG 최대 3장, 장당 5 MiB · 각 변 6,000픽셀 / 총 1,600만 픽셀 이하', 'Screenshots help us understand your report.\nPress Win + Shift + S, then Ctrl + V in this window.\nPNG/JPEG: up to 3 images, 5 MiB each; 6,000 pixels per side / 16 million pixels.');
        kind.hidden = crash; kind.disabled = !!frozen || busy;
        description.readOnly = !!frozen || busy; description.maxLength = crash ? 100000 : 10000;
        for (const selector of ['.report-hint', '.report-attach', '.report-images']) q(selector).hidden = crash;
        action('attach').textContent = t('스크린샷 첨부…', 'Attach screenshot…'); action('attach').disabled = !!frozen || busy || processing;
        action('pending').textContent = t('미전송 보고', 'Unsent reports'); action('pending').disabled = busy || processing;
        action('send').textContent = t('보고하기', 'Send report'); action('send').disabled = busy || processing || !!frozen?.blocked;
        action('close').textContent = busy ? t('전송 취소', 'Cancel sending') : t('닫기', 'Close');
        action('discard').textContent = t('보고 삭제', 'Discard report'); action('discard').hidden = !frozen; action('discard').disabled = busy;
        action('correct').textContent = t('수정 후 새 보고', 'Edit as new report'); action('correct').hidden = !frozen?.blocked || crash; action('correct').disabled = busy;
    }
    function previews() {
        q('.report-images').replaceChildren();
        images.forEach((file, index) => {
            const box = document.createElement('div'), image = document.createElement('img'), remove = document.createElement('button');
            const url = URL.createObjectURL(file); image.src = url; image.alt = t('첨부 스크린샷', 'Attached screenshot'); image.onload = () => URL.revokeObjectURL(url);
            image.style.cursor = 'zoom-in';
            image.onclick = () => {
                const viewer = document.createElement('dialog'), full = document.createElement('img'), done = document.createElement('button');
                viewer.className = 'report-dialog'; full.style.cssText = 'width:100%;max-height:75vh;object-fit:contain';
                const fullUrl = URL.createObjectURL(file); full.src = fullUrl; full.alt = image.alt;
                done.type = 'button'; done.textContent = t('닫기', 'Close'); done.onclick = () => viewer.close();
                viewer.append(full, done); document.body.append(viewer); viewer.onclose = () => { URL.revokeObjectURL(fullUrl); viewer.remove(); }; viewer.showModal();
            };
            remove.type = 'button'; remove.textContent = t('삭제', 'Remove'); remove.disabled = !!frozen || busy || processing;
            remove.onclick = () => { images.splice(index, 1); previews(); };
            box.append(image, remove); q('.report-images').append(box);
        });
    }
    async function attach(list) {
        if (frozen || busy || processing) return;
        processing = true; update(); previews();
        try {
            if (images.length + list.length > 3) throw Error(t('이미지는 최대 3장입니다.', 'Maximum 3 images.'));
            const additions = [];
            for (const file of list) {
                if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5242880) throw Error(t('PNG/JPEG, 장당 최대 5 MiB입니다.', 'PNG/JPEG only, maximum 5 MiB per image.'));
                const bitmap = await createImageBitmap(file);
                try {
                    if (bitmap.width > 6000 || bitmap.height > 6000 || bitmap.width * bitmap.height > 16000000) throw Error(t('이미지 크기 제한을 초과했습니다.', 'Image dimensions exceed the limit.'));
                    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
                    canvas.getContext('2d').drawImage(bitmap, 0, 0);
                    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    if (!png || png.size > 5242880) throw Error(t('변환된 이미지가 5 MiB를 초과합니다. 캡처 영역을 줄여 주세요.', 'Converted image exceeds 5 MiB. Use a smaller capture area.'));
                    additions.push(png);
                } finally { bitmap.close(); }
            }
            images.push(...additions); message('');
        } catch (error) { message(error.message); }
        finally { processing = false; update(); previews(); }
    }
    action('attach').onclick = () => files.click(); files.onchange = () => { attach([...files.files]); files.value = ''; };
    dialog.addEventListener('paste', e => { const list = [...(e.clipboardData?.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean); if (list.length) { e.preventDefault(); attach(list); } });
    async function load(id) {
        if (busy || processing) return;
        busy = true; controller = new AbortController(); update(); previews();
        try {
        const report = await api('/' + encodeURIComponent(id), { signal: controller.signal }); frozen = report; correction = null;
        kind.value = report.kind === 'suggestion' ? 'suggestion' : 'bug';
        images = report.images.map(p => new Blob([Uint8Array.from(atob(p.data), c => c.charCodeAt(0))], { type: p.mime }));
        const { report_id, ...visible } = report.metadata;
        description.value = report.kind === 'crash' ? JSON.stringify(visible, null, 2) : report.metadata.description;
        q('.report-pending').replaceChildren(); update(); previews(); description.setSelectionRange(0, 0);
        message(report.blocked ? t('서버가 이 보고를 거부했습니다. 수정 후 새 보고로 보낼 수 있습니다.', 'The server rejected this report. Edit it as a new report.') : t('전송 전에 글과 이미지의 비밀번호·개인 경로 등 민감한 정보를 확인하세요.', 'Review text and images for sensitive information before sending.'));
        } finally { busy = false; controller = null; update(); previews(); }
    }
    action('pending').onclick = async () => {
        if (!frozen && (description.value.trim() || images.length) && !confirm(t('작성 중인 내용을 닫고 보관된 보고를 보시겠습니까?', 'Discard the current draft and view saved reports?'))) return;
        try {
            const reports = await api(''); q('.report-pending').replaceChildren();
            reports.forEach((r, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = `${i + 1}. ${r.kind === 'crash' ? t('비정상 종료', 'Unexpected shutdown') : r.kind === 'bug' ? t('오류 신고', 'Problem report') : t('개선 제안', 'Suggestion')}`; b.onclick = () => load(r.id).catch(e => message(e.message)); q('.report-pending').append(b); });
            if (!reports.length) message(t('미전송 보고가 없습니다.', 'No unsent reports.'));
        } catch (error) { message(error.message); }
    };
    action('correct').onclick = () => { correction = frozen.id; frozen = null; update(); previews(); };
    action('discard').onclick = async () => {
        if (!confirm(t('이 보고를 삭제하시겠습니까?', 'Delete this saved report?'))) return;
        try { await api('/' + frozen.id, { method: 'DELETE' }); dialog.close(); } catch (error) { message(error.message); }
    };
    action('send').onclick = async () => {
        if (busy || processing) return;
        if (!frozen && (!description.value.trim() || new TextEncoder().encode(description.value).length > 10000)) { message(t('설명은 필수이며 UTF-8 10,000바이트 이하여야 합니다.', 'Description is required, maximum 10,000 UTF-8 bytes.')); return; }
        busy = true; controller = new AbortController(); update(); previews();
        try {
            if (!frozen) {
                const form = new FormData(); form.append('kind', kind.value); form.append('description', description.value);
                images.forEach((file, i) => form.append('images[]', file, `image-${i + 1}.png`));
                frozen = await api('', { method: 'POST', body: form, signal: controller.signal });
                if (correction) { await api('/' + correction, { method: 'DELETE', signal: controller.signal }); correction = null; }
            }
            const result = await api('/' + frozen.id + '/send', { method: 'POST', signal: controller.signal });
            frozen.blocked = result.blocked;
            if (result.accepted) {
                dialog.close();
                alert(t('보고가 전송되었습니다.\n제품 개선에 도움이 되는 자료를 보내주셔서 감사합니다.', 'Report sent.\nThank you for helping us improve the product.'));
            } else message(result.message || t('접수를 확인하지 못했습니다. 같은 보고로 다시 보낼 수 있습니다.', 'Receipt is unconfirmed. Retry the same report.'));
        } catch (error) { message(t('전송 결과를 확인하지 못했습니다. 저장된 보고는 미전송 보고에서 다시 보낼 수 있습니다.', 'Receipt is unconfirmed. Saved reports can be retried from Unsent reports.')); }
        finally { busy = false; controller = null; update(); previews(); }
    };
    const close = () => { if (busy) { controller?.abort(); return; } if (processing) return; dialog.close(); };
    action('close').onclick = close; dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    button.onclick = () => {
        frozen = null; correction = null; images = []; description.value = ''; kind.value = 'bug'; q('.report-pending').replaceChildren();
        message(t('보내기 전에 글과 이미지에 민감한 정보가 없는지 확인해 주세요.', 'Review text and images for sensitive information before sending.'));
        update(); previews(); dialog.showModal(); description.focus();
    };
    // Only genuine server exception reports are offered; closing a browser is not a crash.
    api('').then(async reports => { const report = reports.find(r => r.kind === 'crash'); if (report && !dialog.open) { await load(report.id); dialog.showModal(); description.setSelectionRange(0, 0); } }).catch(() => {});
})();
