const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createComfileMcpEditor } = require('../ComfileWeb/wwwroot/comfileweb-mcp.js');
const copy = value => structuredClone(value);
function fixture() {
    const state = { doc: { pages: [{ name: 'Main', properties: { gridDivisionsX: 98, gridDivisionsY: 60, mobile: false }, widgets: [] }] }, projectName: 'original', dirty: false, running: false, undo: [], redo: [] };
    let id = 0;
    const host = {
        document: () => copy(state.doc), project: () => ({ projectName: state.projectName, dirty: state.dirty }), running: () => state.running,
        uuid: () => String(++id).padStart(12, '0'), isColor: v => /^#[0-9a-f]{6}$/i.test(v),
        create: kind => ({ kind, cellX: 0, cellY: 0, cellWidth: 1, cellHeight: 1, properties: { Name: kind, Address: '', Text: '', BackColor: '#000000', X: '0', Y: '0' } }),
        commit(doc) { state.undo.push(copy(state.doc)); state.doc = doc; state.dirty = true; },
        history(direction) { const from = direction === 'undo' ? state.undo : state.redo, to = direction === 'undo' ? state.redo : state.undo; if (from.length) { to.push(state.doc); state.doc = from.pop(); } },
        load: async () => copy(state.doc), open(doc, name) { state.doc = doc; state.projectName = name; state.dirty = false; },
        save: async () => {}, saved(name, unchanged) { if (unchanged) { state.projectName = name; state.dirty = false; } }
    };
    const call = createComfileMcpEditor(host);
    const edit = async (operations, extra = {}) => call('apply_changes', { expectedRevision: (await call('get_document')).revision, operations, ...extra });
    return { state, host, call, edit };
}
const add = (x = 0, y = 0) => ({ op: 'add', pageName: 'Main', kind: 'Button', cellX: x, cellY: y, properties: { Address: 'DO.0.0' } });
test('batch validation rolls back all operations on overlap', async () => {
    const f = fixture(); const r = await f.edit([add(), add()]);
    assert.equal(r.code, 'OVERLAP'); assert.equal(f.state.doc.pages[0].widgets.length, 0); assert.equal(f.state.undo.length, 0);
});
test('boundary cells, dry run and undo/redo', async () => {
    const f = fixture(); const before = await f.call('get_document');
    const dry = await f.edit([add(97, 59)], { dryRun: true });
    assert.equal(dry.success, true); assert.equal(dry.revision, before.revision); assert.equal(f.state.undo.length, 0);
    const r = await f.edit([add(97, 59)]); assert.equal(r.success, true);
    const undone = await f.call('edit_history', { expectedRevision: r.revision, direction: 'undo' }); assert.equal(undone.document.pages[0].widgets.length, 0);
    const redone = await f.call('edit_history', { expectedRevision: undone.revision, direction: 'redo' }); assert.equal(redone.document.pages[0].widgets.length, 1);
    assert.equal((await f.edit([add(98, 0)])).success, false);
});
test('manual changes invalidate revision and runtime prevents edits', async () => {
    const f = fixture(); const old = await f.call('get_document'); f.state.doc.pages[0].properties.gridDivisionsX = 50;
    assert.equal((await f.call('apply_changes', { expectedRevision: old.revision, operations: [add()] })).code, 'REVISION_CONFLICT');
    f.state.running = true; assert.equal((await f.edit([add()])).code, 'RUNTIME_ACTIVE');
});
test('address types and ranges are validated', async () => {
    const f = fixture();
    for (const address of ['I8', 'DO.8.0', 'DO.0.16', 'ADC.0.0']) { const op = add(); op.properties.Address = address; assert.equal((await f.edit([op])).code, 'INVALID_ADDRESS'); }
});
test('mobile bounds and grid shrinking are checked atomically', async () => {
    const f = fixture();
    assert.equal((await f.edit([{ op: 'set_page', pageName: 'Main', properties: { mobile: true, gridDivisionsX: 40, gridDivisionsY: 84 } }, add(39, 83)])).success, true);
    assert.equal((await f.edit([{ op: 'set_page', pageName: 'Main', properties: { gridDivisionsY: 83 } }])).code, 'OUT_OF_BOUNDS');
    assert.equal(f.state.doc.pages[0].properties.gridDivisionsY, 84);
});
test('unsaved document cannot be silently opened', async () => {
    const f = fixture(); f.state.dirty = true; const r = await f.call('get_document');
    assert.equal((await f.call('open_project', { expectedRevision: r.revision, name: 'other' })).code, 'UNSAVED_CHANGES');
});
test('open rechecks revision after asynchronous load', async () => {
    const f = fixture(); const r = await f.call('get_document');
    f.host.load = async () => { f.state.doc.pages[0].properties.gridDivisionsX = 40; return copy(f.state.doc); };
    assert.equal((await f.call('open_project', { expectedRevision: r.revision, name: 'other' })).code, 'REVISION_CONFLICT');
    assert.equal(f.state.projectName, 'original');
});
test('save completion cannot mark a different document as saved', async () => {
    const f = fixture(); const r = await f.call('get_document');
    f.host.save = async () => { f.state.projectName = 'opened-during-save'; f.state.dirty = true; };
    const saved = await f.call('save_project', { expectedRevision: r.revision, name: 'saved-copy' });
    assert.equal(saved.newerUnsavedChanges, true); assert.equal(f.state.projectName, 'opened-during-save'); assert.equal(f.state.dirty, true);
});

test('large SVG projects return a compact summary and paginated pages', async () => {
    const f = fixture();
    f.state.doc.pages = Array.from({ length: 20 }, (_, i) => ({ name: 'Page' + i, properties: { gridDivisionsX: 98, gridDivisionsY: 60, pageBackgroundSvg: '<svg>' + ' '.repeat(250000) + '</svg>' }, widgets: Array.from({length: 25}, (_, j) => ({id: 'w' + i + '-' + j, kind: 'Text', properties: {Text: 'Widget ' + j}})) }));
    const summary = await f.call('get_document');
    assert.equal(summary.summaryOnly, true);
    assert.ok(summary.documentBytes > 4 * 1024 * 1024);
    assert.ok(JSON.stringify(summary).length < 10000);
    const page = await f.call('get_page', {pageName: 'Page0', offset: 0, limit: 20});
    assert.equal(page.success, true); assert.equal(page.page.widgets.length, 20); assert.equal(page.nextOffset, 20);
    assert.equal(page.revision, summary.revision);
    const tail = await f.call('get_page', {pageName:'Page0', offset:20, includeBackground:false});
    assert.equal(tail.page.widgets.length, 5); assert.equal(tail.nextOffset, null);
    assert.equal(tail.page.properties.pageBackgroundSvg, undefined);
});

test('document byte limit rejects edits atomically', async () => {
    const f = fixture(); f.state.doc.metadata = 'x'.repeat(16 * 1024 * 1024);
    const result = await f.edit([add()]);
    assert.equal(result.code, 'DOCUMENT_TOO_LARGE');
    assert.equal(f.state.undo.length, 0); assert.equal(f.state.doc.pages[0].widgets.length, 0);
});

test('oversized page response returns a recoverable error', async () => {
    const f = fixture(); f.state.doc.pages[0].properties.pageBackgroundSvg = 'x'.repeat(600000);
    assert.equal((await f.call('get_page', {pageName:'Main'})).code, 'RESPONSE_TOO_LARGE');
    assert.equal((await f.call('get_page', {pageName:'Main',includeBackground:false})).success, true);
});
