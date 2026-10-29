const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
(async () => {
    const root = fs.mkdtempSync(path.join(__dirname, '../dist/codex-setup-test-'));
    const base = 'http://127.0.0.1:15023';
    const child = spawn('dotnet', [path.join(__dirname, '../ComfileWeb/bin/Release/net10.0/ComfileWeb.dll'), '--no-browser', '--urls', base, '--contentRoot', path.join(__dirname, '../ComfileWeb')], {
        windowsHide: true, stdio: 'ignore',
        env: { ...process.env, CODEX_HOME: root, COMFILEWEB_MCP_INSTANCE: path.basename(root) }
    });
    let browser;
    try {
        let ready = false;
        for (let i = 0; i < 60; i++) {
            try { if ((await fetch(base + '/api/version')).ok) { ready = true; break; } } catch {}
            await new Promise(r => setTimeout(r, 200));
        }
        assert(ready, 'Test server did not start');
        const token = (await (await fetch(base + '/api/app/update')).json()).token;
        assert.equal((await fetch(base + '/api/ai/codex/setup', { method: 'POST' })).status, 403);
        assert.equal((await fetch(base + '/api/ai/codex/setup', { method: 'POST', headers: { Origin: 'http://other.example', 'X-Comfile-Update-Token': token } })).status, 403);
        browser = await chromium.launch({ channel: 'msedge', headless: true });
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(base);
        await page.locator('#appLanguageSelect').selectOption('ko');
        await page.locator('#aiConnectionButton').click();
        fs.writeFileSync(path.join(root, 'config.toml'), '[broken');
        await page.locator('.ai-register').click();
        await page.waitForFunction(() => document.querySelector('.ai-result').textContent.includes('설정하지 못했습니다'));
        assert.equal(fs.readFileSync(path.join(root, 'config.toml'), 'utf8'), '[broken');
        fs.writeFileSync(path.join(root, 'config.toml'), 'model = "preserved"\n');
        await page.locator('.ai-register').click();
        await page.waitForFunction(() => document.querySelector('.ai-result').textContent.includes('설정 완료!'));
        assert(fs.readFileSync(path.join(root, 'config.toml'), 'utf8').includes('preserved'));
        assert(fs.readdirSync(root).some(f => f.endsWith('.bak')));
        await page.screenshot({ path: path.join(__dirname, '../dist/codex-setup-1935.png') });
        await page.evaluate(() => applyVisualizationLanguage({ useKorean: false }));
        assert((await page.locator('.ai-result').textContent()).includes('Setup complete'));
        await page.locator('.ai-close').click();
        assert.equal(await page.locator('dialog').evaluate(e => e.open), false);
        assert.deepEqual(errors, []);
        console.log('PASS: origin/token guard, UI retry, registration/backup, language change and close.');
    } finally {
        if (browser) await browser.close();
        child.kill();
        await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve));
        const target = path.resolve(root);
        assert.equal(path.dirname(target), path.resolve(__dirname, '../dist'));
        assert(path.basename(target).startsWith('codex-setup-test-'));
        fs.rmSync(target, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
