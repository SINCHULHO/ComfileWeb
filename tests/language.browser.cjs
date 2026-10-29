const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const server = require('node:http').createServer((req, res) => {
    if (req.url === '/api/app/update') { res.setHeader('Content-Type', 'application/json'); return res.end('{"currentVersion":"0.9.1936","availableVersion":"0.9.1937","token":"test"}'); }
    if (req.url.startsWith('/api/project/list')) { res.setHeader('Content-Type', 'application/json'); return res.end('[]'); }
    if (req.url.startsWith('/api/project/settings')) { res.setHeader('Content-Type', 'application/json'); return res.end('{"projectsDirectory":"D:\\\\Projects"}'); }
    if (req.url === '/api/ui-language.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end("window.comfileWebSystemLanguage = 'en';"); }
    const file = path.join(__dirname, '../ComfileWeb/wwwroot', req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
});
(async () => {
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage({ locale: 'ko-KR', viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        assert.equal(await page.locator('html').getAttribute('lang'), 'en');
        assert.equal(await page.evaluate(() => window.comfileMcpProject.status().dirty), false);
        await page.reload();
        await page.waitForTimeout(50);
        assert.equal(await page.evaluate(() => window.comfileMcpProject.status().dirty), false, 'Reloading an untouched page must not make it dirty');
        async function audit(label) {
            const korean = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => !['SCRIPT','STYLE'].includes(e.tagName)).flatMap(e => {
                const text = [...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('');
                return [text, e.title, e.getAttribute('aria-label'), e.getAttribute('placeholder')].filter(t => /[가-힣]/.test(t || '')).map(t=>`${e.id || e.className || e.tagName}: ${t.trim()}`);
            }));
            assert.deepEqual(korean, [], label);
        }
        await audit('Initial English UI');
        await page.locator('#appLanguageSelect').selectOption('ko');
        assert.equal(await page.locator('#aiConnectionButton').textContent(), 'AI 연결 설정');
        await page.reload();
        assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
        await page.locator('#appLanguageSelect').selectOption('en');
        await page.getByRole('button', { name: 'Update without saving', exact: true }).waitFor({ state: 'visible' });
        assert.equal(await page.getByRole('button', { name: 'Save and update', exact: true }).count(), 1);
        await audit('Switch to English');
        await page.locator('#aiConnectionButton').click();
        await audit('AI dialog');
        await page.locator('.ai-close').click();
        await page.locator('#settingsToggleButton').click();
        for (const tab of ['#settingsLinkTab', '#settingsScreenTab', '#settingsGeneralTab']) { await page.locator(tab).click(); await audit(tab); }
        await page.locator('#settingsCloseButton').click();
        await page.locator('#aboutButton').click();
        await audit('About');
        await page.locator('.about-dialog-close').click();
        for (const button of ['#comfilewebQuickOpenButton', '#comfilewebSaveButton']) {
            if (button === '#comfilewebSaveButton') await page.locator('#fileMenuButton').click();
            await page.locator(button).click();
            await audit(button + ' dialog');
            await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        }
        await page.locator('.project-tree-page').first().click({ button: 'right' });
        await audit('Page menu');
        await page.keyboard.press('Escape');
        const dialogs = [];
        page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
        await page.locator('#projectAddPageButton').click();
        assert(dialogs.length && dialogs.every(text => !/[가-힣]/.test(text)), 'Page prompt translation');
        for (const kind of ['Button', 'Lamp', 'Toggle', 'Number', 'Text', 'Slider', 'ProgressBar', 'Gauge', 'Tank']) {
            await page.evaluate(kind => {
                const widget = createWidget(kind, 2, 2);
                getCurrentPage().widgets = [widget];
                setSelectedWidgets([widget.id]);
                renderWidgets(); renderProperties();
            }, kind);
            await audit(kind + ' properties');
        }
        await page.reload();
        assert.equal(await page.locator('html').getAttribute('lang'), 'en');
        await page.evaluate(() => { window.comfileMcpProject.opened('Saved test'); });
        await page.reload();
        await page.waitForTimeout(50);
        assert.equal(await page.evaluate(() => window.comfileMcpProject.status().dirty), false, 'Saved page must remain saved after reload');
        await page.evaluate(() => { notifyVisualizationDirty(); });
        await page.reload();
        await page.waitForTimeout(50);
        assert.equal(await page.evaluate(() => window.comfileMcpProject.status().dirty), true, 'Unsaved edits must remain dirty after reload');
        await page.screenshot({ path: path.join(__dirname, '../dist/english-ui.png') });
        const koreanPage = await browser.newPage({ locale: 'en-US' });
        await koreanPage.route('**/api/ui-language.js', route => route.fulfill({ contentType: 'application/javascript', body: "window.comfileWebSystemLanguage = 'ko';" }));
        await koreanPage.goto(`http://127.0.0.1:${server.address().port}`);
        assert.equal(await koreanPage.locator('html').getAttribute('lang'), 'ko');
        await koreanPage.locator('#appLanguageSelect').selectOption('en');
        await koreanPage.reload();
        assert.equal(await koreanPage.locator('html').getAttribute('lang'), 'en');
        await koreanPage.close();
        assert.deepEqual(errors, []);
        console.log('PASS: Windows default, persisted choice, language switch, settings, tooltips and AI dialog.');
    } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
