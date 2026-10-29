// 로컬 MCP 편집: 복사본 전체 검증 후 한 번에 적용하고 기존 실행 취소를 사용한다.
(function (root) {
    'use strict';
    const kinds = ['Button', 'Lamp', 'Toggle', 'Number', 'Text', 'Slider', 'ProgressBar', 'Gauge', 'Tank'];
    const byteLength = value => new TextEncoder().encode(JSON.stringify(value)).length;
    const maximumDocumentBytes = 16 * 1024 * 1024;
    const maximumResponseBytes = 512 * 1024;
    const clone = value => JSON.parse(JSON.stringify(value));
    const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
    function object(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_ARGUMENT', 'Expected an object.'); }
    function keys(value, allowed) { object(value); for (const key of Object.keys(value)) if (!allowed.includes(key)) fail('INVALID_ARGUMENT', 'Unknown field: ' + key); }
    function integer(value, min, max, label) {
        if (!Number.isInteger(value) || value < min || value > max) fail('INVALID_ARGUMENT', `${label}: expected ${min}..${max}.`);
    }
    function validAddress(value, bit) {
        if (!value) return;
        const match = /^(DI|DO|ADC|DAC)\.(\d+)\.(\d+)$/.exec(value);
        if (!match) fail('INVALID_ADDRESS', 'Use an absolute CFNET address: ' + value);
        const digital = ['DI', 'DO'].includes(match[1]);
        const channels = digital ? 16 : match[1] === 'ADC' ? 4 : 2;
        if (Number(match[2]) >= (digital ? 8 : 4) || Number(match[3]) >= channels || digital !== bit)
            fail('INVALID_ADDRESS', 'Address type or range does not match widget: ' + value);
    }
    function createComfileMcpEditor(host) {
        let fingerprint = '', revision = '';
        function snapshot() {
            const document = host.document();
            const project = host.project();
            const next = JSON.stringify([document, project.projectName]);
            if (next !== fingerprint) { fingerprint = next; revision = host.uuid(); }
            const result = { success: true, revision, document: clone(document), ...project, runtimeRunning: host.running() };
            if (byteLength(result) > maximumResponseBytes) {
                result.document = { version: document.version, pages: document.pages.map(p => ({ name: p.name, widgetCount: p.widgets.length, backgroundBytes: new TextEncoder().encode(p.properties.pageBackgroundSvg || '').length })) };
                result.summaryOnly = true;
                result.documentBytes = byteLength(document);
                result.message = 'Large document: use get_page with pageName, offset and limit.';
            }
            return result;
        }
        function requireRevision(args) {
            snapshot();
            if (args.expectedRevision !== revision) fail('REVISION_CONFLICT', 'Read get_document again before editing.');
        }
        function requireStopped() { if (host.running()) fail('RUNTIME_ACTIVE', 'Stop runtime in the browser before editing.'); }
        function patchWidget(widget, op) {
            for (const key of ['cellX', 'cellY', 'cellWidth', 'cellHeight']) if (key in op) widget[key] = op[key];
            if (op.properties !== undefined) {
                object(op.properties);
                const defaults = host.create(widget.kind).properties;
                for (const [key, raw] of Object.entries(op.properties)) {
                    if (!Object.hasOwn(defaults, key) || ['X', 'Y'].includes(key)) fail('INVALID_PROPERTY', 'Unknown/read-only property: ' + key);
                    if (!['string', 'number', 'boolean'].includes(typeof raw) || String(raw).length > 4096) fail('INVALID_PROPERTY', 'Invalid property value.');
                    let value = String(raw);
                    if (key === 'Address' || key.endsWith(' Address')) {
                        value = value.trim().toUpperCase();
                        validAddress(value, key !== 'Address' || ['Button', 'Lamp', 'Toggle', 'Text'].includes(widget.kind));
                    }
                    if (key.toLowerCase().includes('color') && !host.isColor(value)) fail('INVALID_PROPERTY', 'Invalid color.');
                    widget.properties[key] = value;
                }
            }
            widget.properties.X = String(widget.cellX); widget.properties.Y = String(widget.cellY);
        }
        function validate(document) {
            if (byteLength(document) > maximumDocumentBytes) fail('DOCUMENT_TOO_LARGE', 'Project exceeds 16 MiB.');
            if (!document.pages.length || document.pages.length > 50) fail('PAGE_LIMIT', 'Use 1..50 pages.');
            const names = new Set(), ids = new Set();
            for (const page of document.pages) {
                if (names.has(page.name.toLowerCase())) fail('PAGE_EXISTS', page.name);
                names.add(page.name.toLowerCase());
                const maxX = page.properties.mobile ? 40 : 98, maxY = page.properties.mobile ? 84 : 60;
                integer(page.properties.gridDivisionsX, 5, maxX, 'gridDivisionsX');
                integer(page.properties.gridDivisionsY, 5, maxY, 'gridDivisionsY');
                if (page.widgets.length > 500) fail('WIDGET_LIMIT', 'At most 500 widgets per page.');
                for (const w of page.widgets) {
                    if (ids.has(w.id)) fail('INVALID_WIDGET', 'Duplicate widget ID.');
                    ids.add(w.id);
                    integer(w.cellX, 0, maxX - 1, 'cellX'); integer(w.cellY, 0, maxY - 1, 'cellY');
                    integer(w.cellWidth, 1, maxX, 'cellWidth'); integer(w.cellHeight, 1, maxY, 'cellHeight');
                    if (w.cellX + w.cellWidth > page.properties.gridDivisionsX || w.cellY + w.cellHeight > page.properties.gridDivisionsY)
                        fail('OUT_OF_BOUNDS', 'Widget exceeds grid: ' + w.id);
                }
                for (let i = 0; i < page.widgets.length; i++) for (let j = i + 1; j < page.widgets.length; j++) {
                    const a = page.widgets[i], b = page.widgets[j];
                    if (a.cellX < b.cellX + b.cellWidth && a.cellX + a.cellWidth > b.cellX && a.cellY < b.cellY + b.cellHeight && a.cellY + a.cellHeight > b.cellY)
                        fail('OVERLAP', `Widgets overlap: ${a.id}, ${b.id}`);
                }
            }
        }
        return async function dispatch(name, args = {}) {
            try {
                if (name === 'get_update_state') return { success: true, ...host.project(), runtimeRunning: host.running() };
                if (name === 'get_document') return snapshot();
                if (name === 'get_page') {
                    const state = snapshot();
                    const page = host.document().pages.find(p => p.name === args.pageName);
                    if (!page) fail('PAGE_NOT_FOUND', String(args.pageName));
                    const offset = args.offset ?? 0, limit = args.limit ?? 20;
                    integer(offset, 0, 500, 'offset'); integer(limit, 1, 100, 'limit');
                    const properties = clone(page.properties);
                    if (args.includeBackground === false) delete properties.pageBackgroundSvg;
                    const result = { success: true, revision: state.revision, page: { name: page.name, properties, widgets: clone(page.widgets.slice(offset, offset + limit)) }, totalWidgets: page.widgets.length,
                        nextOffset: offset + limit < page.widgets.length ? offset + limit : null };
                    if (byteLength(result) > maximumResponseBytes) fail('RESPONSE_TOO_LARGE', 'Reduce limit or set includeBackground=false.');
                    return result;
                }
                if (name === 'get_widget_catalog') return { success: true, kinds: kinds.map(kind => ({ kind, defaults: host.create(kind) })),
                    coordinates: 'Zero-based cells', limits: { desktop: [98, 60], mobile: [40, 84] },
                    addresses: ['DI.0..7.0..15', 'DO.0..7.0..15', 'ADC.0..3.0..3', 'DAC.0..3.0..1'] };
                requireStopped(); requireRevision(args);
                if (name === 'open_project' || name === 'save_project') {
                    if (typeof args.name !== 'string' || !args.name.trim() || /[\\/:*?"<>|]/.test(args.name) || args.name.length > 120 || /[. ]$/.test(args.name))
                        fail('INVALID_ARGUMENT', 'Use a project name without a path or extension.');
                    if (name === 'open_project') {
                        if (host.project().dirty && args.discardUnsaved !== true) fail('UNSAVED_CHANGES', 'Save first or explicitly set discardUnsaved.');
                        const loaded = await host.load(args.name);
                        requireStopped(); requireRevision(args);
                        // 로딩 중 사용자가 저장 상태를 바꾼 경우에도 덮어쓰지 않는다.
                        if (host.project().dirty && args.discardUnsaved !== true) fail('UNSAVED_CHANGES', 'Editor contains unsaved changes.');
                        host.open(loaded, args.name);
                        return snapshot();
                    }
                    const document = host.document(), savedText = JSON.stringify(document), originalProject = host.project().projectName;
                    await host.save(args.name, savedText, args.overwrite === true);
                    const unchanged = JSON.stringify(host.document()) === savedText && host.project().projectName === originalProject;
                    host.saved(args.name, unchanged);
                    return { ...snapshot(), savedSnapshot: true, newerUnsavedChanges: !unchanged };
                }
                if (name === 'edit_history') {
                    if (!['undo', 'redo'].includes(args.direction)) fail('INVALID_ARGUMENT', 'Use undo or redo.');
                    host.history(args.direction); return snapshot();
                }
                if (name !== 'apply_changes') fail('UNKNOWN_TOOL', name);
                if (!Array.isArray(args.operations) || args.operations.length < 1 || args.operations.length > 100) fail('INVALID_ARGUMENT', 'Use 1..100 operations.');
                const candidate = clone(host.document()), created = [];
                for (const op of args.operations) {
                    keys(op, ['op', 'pageName', 'kind', 'id', 'cellX', 'cellY', 'cellWidth', 'cellHeight', 'properties']);
                    if (typeof op.pageName !== 'string') fail('INVALID_ARGUMENT', 'pageName required.');
                    let page = candidate.pages.find(p => p.name === op.pageName);
                    if (op.op === 'create_page') {
                        keys(op, ['op', 'pageName']);
                        if (!/^[A-Za-z_][A-Za-z0-9_]{0,24}$/.test(op.pageName)) fail('INVALID_PAGE', 'Page name must start with a letter/underscore and contain at most 25 letters, digits or underscores.');
                        if (page) fail('PAGE_EXISTS', op.pageName);
                        candidate.pages.push({ name: op.pageName, properties: { gridDivisionsX: 49, gridDivisionsY: 30, mobile: false, pageBackColorHtml: '#202124' }, widgets: [] });
                        continue;
                    }
                    if (!page) fail('PAGE_NOT_FOUND', op.pageName);
                    if (op.op === 'set_page') {
                        keys(op, ['op', 'pageName', 'properties']);
                        keys(op.properties, ['gridDivisionsX', 'gridDivisionsY', 'pageBackColorHtml', 'pageBackgroundSvg', 'mobile']);
                        if ('mobile' in op.properties && typeof op.properties.mobile !== 'boolean') fail('INVALID_PROPERTY', 'mobile must be boolean.');
                        if ('pageBackColorHtml' in op.properties && !host.isColor(op.properties.pageBackColorHtml)) fail('INVALID_PROPERTY', 'Invalid background color.');
                        if ('pageBackgroundSvg' in op.properties) {
                            try { host.validateSvg(op.properties.pageBackgroundSvg); }
                            catch (error) { fail('INVALID_PROPERTY', error.message); }
                        }
                        Object.assign(page.properties, op.properties);
                    } else if (op.op === 'add') {
                        keys(op, ['op', 'pageName', 'kind', 'cellX', 'cellY', 'cellWidth', 'cellHeight', 'properties']);
                        if (!kinds.includes(op.kind)) fail('INVALID_WIDGET', 'Unknown widget kind.');
                        const widget = host.create(op.kind);
                        widget.id = 'mcp-' + host.uuid();
                        widget.properties.Name = op.kind + '_' + widget.id.slice(-8);
                        patchWidget(widget, op); page.widgets.push(widget); created.push(widget.id);
                    } else if (op.op === 'update' || op.op === 'delete') {
                        keys(op, op.op === 'delete' ? ['op', 'pageName', 'id'] : ['op', 'pageName', 'id', 'cellX', 'cellY', 'cellWidth', 'cellHeight', 'properties']);
                        const index = page.widgets.findIndex(w => w.id === op.id);
                        if (index < 0) fail('WIDGET_NOT_FOUND', String(op.id));
                        if (op.op === 'delete') page.widgets.splice(index, 1); else patchWidget(page.widgets[index], op);
                    } else fail('INVALID_ARGUMENT', 'Unknown operation.');
                }
                validate(candidate);
                if (!args.dryRun) host.commit(candidate);
                return { ...snapshot(), dryRun: !!args.dryRun, createdWidgetIds: created, ...(args.dryRun ? (byteLength(candidate) <= maximumResponseBytes / 2 ? { proposedDocument: candidate } : { proposedSummary: candidate.pages.map(p => ({ name: p.name, widgetCount: p.widgets.length })) }) : {}) };
            } catch (error) { return { success: false, code: error.code || 'EDITOR_FAILED', message: error.message }; }
        };
    }
    root.createComfileMcpEditor = createComfileMcpEditor;
    if (typeof module !== 'undefined') module.exports = { createComfileMcpEditor };
    if (typeof document === 'undefined' || !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return;

    async function request(url, options) {
        const response = await fetch(url, { cache: 'no-store', ...options });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }
    const dispatch = createComfileMcpEditor({
        uuid: () => crypto.randomUUID(),
        document: () => JSON.parse(exportVisualizationDocumentText()),
        project: () => window.comfileMcpProject.status(),
        running: () => runtimeRunning || runtimeStarting || !!window.comfileUpdateLocked,
        validateSvg: value => validatePageBackgroundSvg(value),
        isColor: value => typeof value === 'string' && CSS.supports('color', value),
        create(kind) {
            const savedId = nextWidgetId;
            try {
                const widget = clone(createWidget(kind, 0, 0));
                // Address처럼 기본 생성 객체에는 없지만 속성창에서 편집하는 항목도 제공한다.
                for (const row of getWidgetPropertyRows(widget)) {
                    if (row.key !== 'Font' && !Object.hasOwn(widget.properties, row.key)) widget.properties[row.key] = String(row.value ?? '');
                }
                return widget;
            } finally { nextWidgetId = savedId; }
        },
        commit(candidate) {
            pushUndoState(); documentModel.pages = candidate.pages;
            setSelectedWidgets([]); selectedCell = null;
            normalizeVisualizationDocumentPages(); updateGridControlsFromCurrentPage();
            renderProjectTree(); renderWidgets(); notifyVisualizationDirty();
        },
        history(direction) { if (direction === 'undo') undoEdit(); else redoEdit(); notifyVisualizationDirty(); },
        load: name => request('/api/project/load?name=' + encodeURIComponent(name)),
        open(loaded, name) {
            if (!Array.isArray(loaded.pages) || !loaded.pages.length) fail('INVALID_PROJECT', 'Project has no pages.');
            importVisualizationDocumentText(JSON.stringify(loaded)); window.comfileMcpProject.opened(name);
        },
        async save(name, text, overwrite) {
            // 기존 저장 API에 덮어쓰기 방지 옵션을 전달한다.
            await request('/api/project/save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, documentText: text, failIfExists: !overwrite }) });
        },
        saved: (name, unchanged) => window.comfileMcpProject.saved(name, unchanged)
    });
    let socket, queue = Promise.resolve();
    function connect() {
        socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/mcp/editor`);
        socket.onmessage = event => {
            const connection = socket;
            queue = queue.then(async () => {
                const message = JSON.parse(event.data);
                if (message.editorId) { window.comfileMcpEditorId = message.editorId; return; }
                let result;
                if (message.name === 'lock_for_update') result = window.comfileUpdateUi?.lock(message.arguments?.version) || { success: false };
                else if (message.name === 'unlock_after_update') { window.comfileUpdateUi?.unlock(); result = { success: true }; }
                else result = await dispatch(message.name, message.arguments);
                if (connection.readyState === WebSocket.OPEN) connection.send(JSON.stringify({ id: message.id, result }));
            }).catch(error => console.warn('MCP editor:', error));
        };
        socket.onclose = () => { window.comfileMcpEditorId = null; setTimeout(connect, 3000); };
    }
    connect();
})(typeof window === 'undefined' ? globalThis : window);
