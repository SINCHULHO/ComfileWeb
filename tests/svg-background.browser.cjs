const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const server = require('node:http').createServer((req, res) => {
    const file = path.join(__dirname, '../ComfileWeb/wwwroot', req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(process.env.COMFILE_TEST_URL || `http://127.0.0.1:${server.address().port}`);
        await page.waitForFunction(() => typeof setPageBackgroundSvg === 'function');
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" fill="#204a70"/><text x="10" y="50">SVG</text></svg>';
        await page.locator('#pageSvgFileInput').setInputFiles({ name: 'background.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
        await page.waitForFunction(() => document.getElementById('pageSvgStatus').dataset.state === 'ready');
        const result = await page.evaluate(async (svg) => {
            const check = (condition, message) => { if (!condition) throw new Error(message); };
            const loaded = async () => { const image = new Image(); image.src = 'data:image/svg+xml,' + encodeURIComponent(getCurrentPage().properties.pageBackgroundSvg); await image.decode(); await new Promise(resolve => setTimeout(resolve, 50)); };
            const bg = () => getComputedStyle(designSurface).backgroundImage;
            check(bg().includes('data:image/svg+xml'), 'SVG missing');
            check(bg().includes('linear-gradient'), 'Grid missing');
            const image = new Image(); image.src = 'data:image/svg+xml,' + encodeURIComponent(svg); await image.decode();
            check(JSON.parse(exportVisualizationDocumentText()).pages[0].properties.pageBackgroundSvg === svg, 'Export lost SVG');
            undoEdit(); check(!getCurrentPage().properties.pageBackgroundSvg, 'Undo failed');
            redoEdit(); await loaded(); check(getCurrentPage().properties.pageBackgroundSvg === svg, 'Redo failed');
            designSurface.classList.add('grid-hidden'); check(bg().includes('data:image/svg+xml') && !bg().includes('linear-gradient'), 'Hidden grid erased SVG');
            designSurface.classList.remove('grid-hidden');
            designSurface.classList.add('runtime-running'); check(bg().includes('data:image/svg+xml') && !bg().includes('linear-gradient'), 'Runtime erased SVG');
            designSurface.classList.remove('runtime-running');
            const saved = getCurrentPage().properties;
            getCurrentPage().properties = { ...saved, pageBackgroundSvg: '' }; updatePageBackgroundSvg(); check(!bg().includes('data:image/svg+xml'), 'Previous page background leaked');
            getCurrentPage().properties = saved; updatePageBackgroundSvg(); await loaded();
            for (const invalid of ['<svg>', '<html/>', '<svg xmlns="wrong"/>', 'x'.repeat(262145), 42]) {
                let failed = false; try { validatePageBackgroundSvg(invalid); } catch { failed = true; }
                check(failed, 'Invalid SVG accepted');
            }
            const dispatch = createComfileMcpEditor({
                document: () => JSON.parse(exportVisualizationDocumentText()), project: () => ({ projectName: '', dirty: true }),
                running: () => false, uuid: () => crypto.randomUUID(), validateSvg: validatePageBackgroundSvg,
                commit: doc => { documentModel.pages = doc.pages; updateGridControlsFromCurrentPage(); },
            });
            let revision = (await dispatch('get_document')).revision;
            let r = await dispatch('apply_changes', { expectedRevision: revision, operations: [{ op: 'set_page', pageName: getCurrentPage().name, properties: { pageBackgroundSvg: '<svg>' } }] });
            check(r.code === 'INVALID_PROPERTY', 'MCP accepted malformed SVG');
            check(getCurrentPage().properties.pageBackgroundSvg === svg, 'Failed MCP edit changed document');
            r = await dispatch('apply_changes', { expectedRevision: revision, operations: [{ op: 'set_page', pageName: getCurrentPage().name, properties: { pageBackgroundSvg: '' } }] });
            check(r.success && !getCurrentPage().properties.pageBackgroundSvg, 'MCP clear failed');
            setPageBackgroundSvg(getCurrentPage(), svg);
            const savedText = exportVisualizationDocumentText();
            setPageBackgroundSvg(getCurrentPage(), '');
            importVisualizationDocumentText(savedText); await loaded();
            check(getCurrentPage().properties.pageBackgroundSvg === svg && bg().includes('data:image/svg+xml'), 'Import lost SVG');
            getCurrentPage().widgets.push(createWidget('Button', 5, 5), createWidget('Lamp', 12, 5));
            renderWidgets();
            check(designSurface.querySelectorAll('.design-widget').length === 2, 'Widgets missing over SVG');
            applyVisualizationLanguage({ useKorean: false, persist: false });
            check(document.getElementById('pageSvgLoadButton').textContent === 'Load SVG background', 'English label failed');
            applyVisualizationLanguage({ useKorean: true, persist: false });
            return 'SVG upload, decode, export, undo/redo, grid/runtime layers, page change, validation, MCP and language passed';
        }, svg);
        await page.evaluate(() => {
            getCurrentPage().properties.pageBackgroundSvg = '<svg>';
            updatePageBackgroundSvg();
        });
        assert.equal(await page.locator('#pageSvgStatus').getAttribute('data-state'), 'error');
        assert.equal(await page.locator('#pageSvgRetryButton').isVisible(), true);
        await page.evaluate(svg => { getCurrentPage().properties.pageBackgroundSvg = svg; }, svg);
        await page.locator('#pageSvgRetryButton').click();
        await page.waitForFunction(() => document.getElementById('pageSvgStatus').dataset.state === 'ready');
        await page.evaluate(() => {
            const before = getCurrentPage().properties.pageBackgroundSvg;
            let rejected = false;
            try { validatePageBackgroundSvg('<svg xmlns="http://www.w3.org/2000/svg">' + '한'.repeat(90000) + '</svg>'); } catch { rejected = true; }
            if (!rejected) throw new Error('UTF-8 SVG byte limit not enforced');
            window.comfileMcpProject.saved('BrowserTest', true);
            if (!window.comfileUpdateUi.lock().success || !document.querySelector('.designer').inert) throw new Error('Update lock failed');
            window.comfileUpdateUi.unlock();
            if (document.querySelector('.designer').inert) throw new Error('Update unlock failed');
            document.dispatchEvent(new Event('unused'));
        });
        await page.screenshot({ path: 'dist/svg-background-preview.png' });
        await page.locator('#pageSvgRemoveButton').click();
        assert.equal(await page.evaluate(() => getCurrentPage().properties.pageBackgroundSvg), '');
        assert.deepEqual(errors, []);
        console.log(result);
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
