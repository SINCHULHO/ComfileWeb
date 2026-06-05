function createVisualizationLdMonitor(context) {
	const state = {
		featureEnabled: true,
		splitMode: false,
		splitRatio: 0.4,
		layout: null,
		leftPane: null,
		rightPane: null,
		splitter: null,
		dragging: false,
		content: null,
		ldJson: null,
		ldJsonPending: false,
		ldCanvas: null,
		resizeObserver: null,
		ldRenderFrame: 0,
		subscribedAddressKey: ''
	};

	function setSplitMode(enabled) {
		const nextEnabled = !!enabled;
		if (state.splitMode === nextEnabled) {
			return;
		}

		state.splitMode = nextEnabled;
		syncLayout();
		context.renderWidgets();
	}

	function syncLayout() {
		const mainLayout = context.getMainLayout();
		const workArea = context.getWorkArea();
		const designSurface = context.getDesignSurface();
		if (!mainLayout || !workArea || !designSurface) {
			return;
		}

		const canUseSplitLayout = context.getRuntimeRunning() && state.splitMode;
		if (!canUseSplitLayout) {
			teardownLayout();
			return;
		}

		ensureLayout(mainLayout, workArea, designSurface);
		updateLayoutColumns();
	}

	function ensureLayout(mainLayout, workArea, designSurface) {
		if (!state.layout || !state.layout.isConnected) {
			state.layout = document.createElement('div');
			state.layout.className = 'runtime-monitor-layout';

			state.leftPane = document.createElement('section');
			state.leftPane.className = 'runtime-monitor-pane runtime-monitor-pane-left';

			const leftContent = document.createElement('div');
			leftContent.className = 'runtime-monitor-content';
			state.content = leftContent;

			state.ldCanvas = document.createElement('canvas');
			state.ldCanvas.className = 'runtime-monitor-ld-canvas';
			leftContent.appendChild(state.ldCanvas);
			renderDiagram();

			state.leftPane.appendChild(leftContent);

			state.splitter = document.createElement('div');
			state.splitter.className = 'runtime-monitor-splitter';
			state.splitter.addEventListener('pointerdown', handleSplitterPointerDown);

			state.rightPane = document.createElement('section');
			state.rightPane.className = 'runtime-monitor-pane runtime-monitor-pane-right';

			state.layout.appendChild(state.leftPane);
			state.layout.appendChild(state.splitter);
			state.layout.appendChild(state.rightPane);
		}

		if (!state.layout.isConnected) {
			mainLayout.insertBefore(state.layout, mainLayout.firstChild || null);
		}

		if (state.content && !state.resizeObserver && window.ResizeObserver) {
			state.resizeObserver = new ResizeObserver(() => requestRender());
			state.resizeObserver.observe(state.content);
		}

		requestJson();

		if (state.rightPane && workArea.parentElement !== state.rightPane) {
			state.rightPane.appendChild(workArea);
		}
	}

	function teardownLayout() {
		const mainLayout = context.getMainLayout();
		const workArea = context.getWorkArea();
		if (mainLayout && workArea && workArea.parentElement !== mainLayout) {
			mainLayout.insertBefore(workArea, mainLayout.firstChild || null);
		}

		if (state.layout && state.layout.isConnected) {
			state.layout.remove();
		}

		state.content = null;
		state.ldCanvas = null;
		state.ldJson = null;
		state.ldJsonPending = false;
		state.subscribedAddressKey = '';
		if (state.resizeObserver) {
			state.resizeObserver.disconnect();
			state.resizeObserver = null;
		}

		state.dragging = false;
		document.body.classList.remove('runtime-monitor-resizing');
	}

	function updateLayoutColumns() {
		if (!state.layout) {
			return;
		}

		const clamped = Math.max(0.2, Math.min(0.8, state.splitRatio));
		state.splitRatio = clamped;
		state.layout.style.gridTemplateColumns = `${(clamped * 100).toFixed(1)}% 8px minmax(0, 1fr)`;
	}

	function handleSplitterPointerDown(event) {
		event.preventDefault();
		if (!state.layout) {
			return;
		}

		state.dragging = true;
		document.body.classList.add('runtime-monitor-resizing');
		window.addEventListener('pointermove', handleSplitterPointerMove);
		window.addEventListener('pointerup', handleSplitterPointerUp);
	}

	function handleSplitterPointerMove(event) {
		if (!state.dragging || !state.layout) {
			return;
		}

		const rect = state.layout.getBoundingClientRect();
		if (!rect || rect.width <= 1) {
			return;
		}

		const nextRatio = (event.clientX - rect.left) / rect.width;
		state.splitRatio = Math.max(0.2, Math.min(0.8, nextRatio));
		updateLayoutColumns();
		renderDiagram();
	}

	function handleSplitterPointerUp() {
		state.dragging = false;
		document.body.classList.remove('runtime-monitor-resizing');
		window.removeEventListener('pointermove', handleSplitterPointerMove);
		window.removeEventListener('pointerup', handleSplitterPointerUp);
	}

	function requestRender() {
		if (state.ldRenderFrame) {
			return;
		}

		state.ldRenderFrame = window.requestAnimationFrame(() => {
			state.ldRenderFrame = 0;
			renderDiagram();
		});
	}

	function requestJson() {
		if (!state.splitMode || state.ldJson || state.ldJsonPending) {
			return;
		}

		if (!(window.chrome && window.chrome.webview)) {
			loadStandaloneLdJson();
			return;
		}

		state.ldJsonPending = true;
		renderDiagram();
		try {
			window.chrome.webview.postMessage({ type: 'visualization-ld-json-request' });
		} catch (error) {
			state.ldJsonPending = false;
			state.ldJson = {
				success: false,
				detail: error && error.message ? error.message : String(error)
			};
			renderDiagram();
		}
	}

	async function loadStandaloneLdJson() {
		state.ldJsonPending = true;
		renderDiagram();
		try {
			const response = await fetch('visualization.ld.json', { cache: 'no-store' });
			if (!response.ok) {
				throw new Error(context.getUseKoreanLanguage() ? '배포 LD 파일을 찾을 수 없습니다.' : 'Deployed LD file was not found.');
			}

			const result = await response.json();
			onLdJsonResult(result);
		} catch (error) {
			state.ldJsonPending = false;
			state.ldJson = {
				success: false,
				detail: error && error.message ? error.message : String(error)
			};
			renderDiagram();
		}
	}

	function onLdJsonResult(result) {
		state.ldJsonPending = false;
		state.ldJson = result || {
			success: false,
			detail: context.getUseKoreanLanguage() ? 'LD JSON 응답이 비어 있습니다.' : 'LD JSON response is empty.'
		};
		subscribeAddresses();
		renderDiagram();
	}

	async function subscribeAddresses() {
		if (!context.getRuntimeRunning() || !state.ldJson || state.ldJson.success === false) {
			return;
		}

		const addresses = collectAddresses();
		const addressKey = addresses.map(item => item.address).sort((a, b) => a.localeCompare(b)).join('|');
		if (!addressKey || addressKey === state.subscribedAddressKey) {
			return;
		}

		state.subscribedAddressKey = addressKey;
		try {
			const connection = await context.ensureRuntimeConnection();
			await connection.invoke('AddAddresses', { addresses });
		} catch (error) {
			console.warn(error);
		}
	}

	function collectAddresses() {
		if (!state.ldJson || !Array.isArray(state.ldJson.cells)) {
			return [];
		}

		const seen = new Set();
		const addresses = [];
		state.ldJson.cells.forEach(cell => {
			const address = getCellAddress(cell);
			if (address && !seen.has(address.toUpperCase())) {
				seen.add(address.toUpperCase());
				addresses.push({ address, kind: 'LD', widgetId: `ld:${cell.y}:${cell.x}` });
			}

			const statusAddress = getCellStatusAddress(cell);
			if (statusAddress && !seen.has(statusAddress.toUpperCase())) {
				seen.add(statusAddress.toUpperCase());
				addresses.push({ address: statusAddress, kind: 'LD', widgetId: `ld-status:${cell.y}:${cell.x}` });
			}
		});
		return addresses;
	}

	function getCellAddress(cell) {
		const runtimeAddress = String(cell?.runtimeAddress || '').trim();
		if (runtimeAddress) {
			return runtimeAddress.toUpperCase();
		}

		return normalizeAddress(cell?.text);
	}

	function getCellStatusAddress(cell) {
		const sym = Number(cell?.sym);
		if (sym !== 6) {
			return '';
		}

		const address = getCellAddress(cell);
		const match = String(address || '').match(/^(T|C)(\d+)$/i);
		if (!match) {
			return '';
		}

		return `${match[1].toUpperCase()}S${match[2]}`;
	}

	function normalizeAddress(value) {
		const text = String(value || '').trim();
		if (!text) {
			return '';
		}

		const match = text.match(/\b(?:I|O|Q|M|D|T|C|X|Y)[A-Za-z0-9_.]+\b/i);
		return match ? match[0].toUpperCase() : '';
	}

	function renderDiagram() {
		if (!state.ldCanvas || !state.content) {
			return;
		}

		const canvas = state.ldCanvas;
		const json = state.ldJson;
		const rowCount = json && json.success !== false ? Math.max(1, context.toNumber(json.rowCount, 1)) : 1;
		const columnCount = json && json.success !== false ? Math.max(1, context.toNumber(json.columnCount, 12)) : 12;
		const contentRect = state.content.getBoundingClientRect();
		const availableWidth = Math.max(1, Math.floor(contentRect.width || state.content.clientWidth || 1));
		const availableHeight = Math.max(1, Math.floor(contentRect.height || state.content.clientHeight || 1));
		const metrics = getMetrics(columnCount, rowCount, availableWidth, availableHeight);
		const canvasWidth = Math.max(availableWidth, metrics.canvasWidth);
		const canvasHeight = Math.max(availableHeight, metrics.canvasHeight);

		if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
			canvas.width = canvasWidth;
			canvas.height = canvasHeight;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		const styles = getComputedStyle(document.documentElement);
		const backColor = styles.getPropertyValue('--surface-bg').trim() || '#202124';
		const textColor = styles.getPropertyValue('--text').trim() || '#dcdcdc';
		const gridColor = context.getCurrentThemeMode() === 'light' ? '#d0d0d0' : '#464646';

		ctx.clearRect(0, 0, canvasWidth, canvasHeight);
		ctx.fillStyle = backColor;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		if (state.ldJsonPending) {
			drawMessage(ctx, canvasWidth, canvasHeight, context.getUseKoreanLanguage() ? 'LD 불러오는 중...' : 'Loading LD...');
			return;
		}

		if (!json) {
			drawMessage(ctx, canvasWidth, canvasHeight, context.getUseKoreanLanguage() ? 'LD 데이터 없음' : 'No LD data');
			return;
		}

		if (json.success === false) {
			drawMessage(ctx, canvasWidth, canvasHeight, json.detail || (context.getUseKoreanLanguage() ? 'LD 데이터 없음' : 'No LD data'));
			return;
		}

		const cells = Array.isArray(json.cells) ? json.cells : [];
		const rows = Array.isArray(json.rows) ? json.rows : [];
		drawFrame(ctx, metrics, columnCount, rowCount, textColor, gridColor, cells, rows);
		cells.forEach(cell => drawCell(ctx, cell, metrics, textColor, getCellState(cell)));
		cells.forEach(cell => drawJoin(ctx, cell, metrics, textColor));
	}

	function getCellState(cell) {
		const address = getCellAddress(cell);
		if (!address) {
			return false;
		}

		const runtimeValues = context.getRuntimeValues();
		if (!runtimeValues.has(address)) {
			return false;
		}

		const value = Number(runtimeValues.get(address));
		if (!Number.isFinite(value)) {
			return false;
		}

		const sym = Number(cell?.sym);
		if (sym === 2) {
			return value === 0;
		}

		return value !== 0;
	}

	function getMetrics(columnCount, rowCount, availableWidth, availableHeight) {
		const baseMarginLeft = 54;
		const baseMarginRight = 28;
		const baseHeaderHeight = 34;
		const baseRowHeight = 96;
		const baseCellWidth = 86;
		const baseCwy = 64;
		const baseSymbolOffsetY = 16;
		const baseWidth = baseMarginLeft + (columnCount * baseCellWidth) + baseMarginRight;
		const baseHeight = baseHeaderHeight + (rowCount * baseRowHeight) + 36;
		const widthScale = Math.max(0.45, Math.min(1.6, (availableWidth || baseWidth) / baseWidth));
		const heightScale = Math.max(0.55, Math.min(1.35, (availableHeight || baseHeight) / baseHeight));
		const scale = Math.max(0.45, Math.min(1.6, Math.min(widthScale, heightScale)));
		const marginLeft = Math.round(baseMarginLeft * scale);
		const marginRight = Math.round(baseMarginRight * scale);
		const headerHeight = Math.round(baseHeaderHeight * scale);
		const rowHeight = Math.round(baseRowHeight * scale);
		const cellWidth = Math.round(baseCellWidth * scale);
		const cwy = Math.round(baseCwy * scale);
		const symbolOffsetY = Math.round(baseSymbolOffsetY * scale);
		return {
			scale,
			marginLeft,
			marginRight,
			headerHeight,
			rowHeight,
			cellWidth,
			cwy,
			symbolOffsetY,
			canvasWidth: marginLeft + (columnCount * cellWidth) + marginRight,
			canvasHeight: headerHeight + (rowCount * rowHeight) + Math.round(36 * scale)
		};
	}

	function drawMessage(ctx, width, height, message) {
		const styles = getComputedStyle(document.documentElement);
		ctx.fillStyle = styles.getPropertyValue('--property-muted').trim() || '#aeb8c8';
		ctx.font = '13px Segoe UI';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(message, width / 2, height / 2);
	}

	function drawFrame(ctx, metrics, columnCount, rowCount, textColor, gridColor, cells, rows) {
		ctx.strokeStyle = gridColor;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, metrics.headerHeight);
		ctx.lineTo(metrics.canvasWidth, metrics.headerHeight);
		ctx.stroke();

		ctx.fillStyle = textColor;
		ctx.font = `${Math.max(8, Math.round(12 * metrics.scale))}px Segoe UI`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const firstOutputColumn = Math.max(0, columnCount - 2);
		const hiddenOutputColumn = Math.max(0, columnCount - 1);
		for (let x = 0; x < columnCount; x += 1) {
			if (x === hiddenOutputColumn && hiddenOutputColumn > firstOutputColumn) {
				continue;
			}

			const label = x === firstOutputColumn ? 'Coil / Function' : String(x + 1);
			const centerX = metrics.marginLeft + x * metrics.cellWidth + metrics.cellWidth / 2;
			const drawX = x === firstOutputColumn && hiddenOutputColumn > firstOutputColumn
				? centerX + metrics.cellWidth / 2
				: centerX;
			ctx.fillText(label, drawX, metrics.headerHeight / 2);
		}

		ctx.strokeStyle = textColor;
		ctx.beginPath();
		ctx.moveTo(metrics.marginLeft, metrics.headerHeight);
		ctx.lineTo(metrics.marginLeft, metrics.headerHeight + rowCount * metrics.rowHeight + 8);
		ctx.stroke();

		ctx.fillStyle = textColor;
		ctx.font = `${Math.max(8, Math.round(12 * metrics.scale))}px Segoe UI`;
		ctx.textAlign = 'left';
		const rungLabels = buildRungLabels(cells, rowCount, columnCount, rows);
		for (let y = 0; y < rowCount; y += 1) {
			const label = rungLabels.get(y) || '';
			if (label) {
				ctx.fillText(label, 4, metrics.headerHeight + y * metrics.rowHeight + metrics.rowHeight / 2);
			}
		}
	}

	function buildRungLabels(cells, rowCount, columnCount, rows) {
		const labels = new Map();
		if (Array.isArray(rows) && rows.length > 0) {
			rows.forEach(row => {
				const y = Number(row?.y);
				const rungLabel = String(row?.rungLabel || '').trim();
				if (Number.isFinite(y) && y >= 0 && y < rowCount && rungLabel) {
					labels.set(y, rungLabel);
				}
			});

			return labels;
		}

		const rowsWithContent = new Set();
		const joinsByRow = new Map();
		const maxColumn = Math.max(0, columnCount - 1);

		if (Array.isArray(cells)) {
			cells.forEach(cell => {
				const x = Number(cell?.x);
				const y = Number(cell?.y);
				if (!Number.isFinite(x) || !Number.isFinite(y) || y < 0 || y >= rowCount) {
					return;
				}

				const sym = Number(cell?.sym);
				const text = String(cell?.text || '');
				const join = Number(cell?.join);
				const hasContent = sym !== 0 || text.length > 0 || join !== 0;
				if (hasContent) {
					rowsWithContent.add(y);
				}

				if (join !== 0 && x >= 0 && x <= maxColumn) {
					joinsByRow.set(y, true);
				}
			});
		}

		let circuitNumber = 0;
		let subRowNumber = 0;
		for (let y = 0; y < rowCount; y += 1) {
			if (!rowsWithContent.has(y)) {
				continue;
			}

			if (y > 0 && joinsByRow.has(y - 1)) {
				subRowNumber += 1;
				labels.set(y, `${circuitNumber}.${subRowNumber}`);
			} else {
				circuitNumber += 1;
				subRowNumber = 0;
				labels.set(y, String(circuitNumber));
			}
		}

		return labels;
	}

	function drawCell(ctx, cell, metrics, textColor, isOn) {
		const x = Number(cell?.x);
		const y = Number(cell?.y);
		const sym = Number(cell?.sym);
		const text = String(cell?.text || '');
		const alias = String(cell?.alias || '');
		if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(sym) || sym === 0) {
			return;
		}

		const px = metrics.marginLeft + x * metrics.cellWidth;
		const py = metrics.headerHeight + y * metrics.rowHeight + metrics.symbolOffsetY;
		const midY = py + metrics.cwy / 2;
		ctx.strokeStyle = textColor;
		ctx.fillStyle = textColor;
		ctx.lineWidth = 1;

		if (text) {
			ctx.font = `${Math.max(8, Math.round(12 * metrics.scale))}px Segoe UI`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(text, px + metrics.cellWidth / 2, py + Math.round(6 * metrics.scale));
		}

		if (alias) {
			drawAlias(ctx, px, py, metrics, alias);
		}

		if (sym === 3) {
			drawLine(ctx, px, midY, px + metrics.cellWidth, midY);
			return;
		}

		if (sym === 1 || sym === 2 || sym === 13 || sym === 14) {
			drawContact(ctx, px, py, metrics, sym, isOn);
			return;
		}

		if (sym === 5 || sym === 15 || sym === 16) {
			drawCoil(ctx, px, py, metrics, sym, isOn);
			return;
		}

		drawBox(ctx, px, py, metrics, cell);
	}

	function drawAlias(ctx, px, py, metrics, alias) {
		ctx.save();
		ctx.fillStyle = '#00B050';
		ctx.font = `${Math.max(7, Math.round(11 * metrics.scale))}px Segoe UI`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const maxWidth = Math.max(12, metrics.cellWidth - Math.round(8 * metrics.scale));
		const aliasY = py + metrics.cwy - Math.round(4 * metrics.scale);
		ctx.fillText(alias, px + metrics.cellWidth / 2, aliasY, maxWidth);
		ctx.restore();
	}

	function drawContact(ctx, px, py, metrics, sym, isOn) {
		const midY = py + metrics.cwy / 2;
		const midX = px + metrics.cellWidth / 2;
		const gap = metrics.cellWidth * 0.3;
		const leftBar = midX - gap / 2;
		const rightBar = midX + gap / 2;
		const topY = py + metrics.cwy * 0.2;
		const bottomY = py + metrics.cwy * 0.8;

		if (isOn) {
			ctx.save();
			ctx.fillStyle = '#2BE060';
			const fillPadding = Math.max(2, Math.round(3 * metrics.scale));
			ctx.fillRect(
				leftBar + fillPadding,
				topY + fillPadding,
				Math.max(2, rightBar - leftBar - fillPadding * 2),
				Math.max(2, bottomY - topY - fillPadding * 2)
			);
			ctx.restore();
		}

		drawLine(ctx, px, midY, leftBar, midY);
		drawLine(ctx, rightBar, midY, px + metrics.cellWidth, midY);
		ctx.lineWidth = 2;
		drawLine(ctx, leftBar, topY, leftBar, bottomY);
		drawLine(ctx, rightBar, topY, rightBar, bottomY);
		ctx.lineWidth = 1;
		if (sym === 2) {
			drawLine(ctx, leftBar + 5, bottomY - 6, rightBar - 5, topY + 6);
		}
	}

	function drawCoil(ctx, px, py, metrics, sym, isOn) {
		const midX = px + metrics.cellWidth / 2;
		const midY = py + metrics.cwy / 2;
		const gap = metrics.cellWidth * 0.26;
		const leftCenter = midX - gap / 2;
		const rightCenter = midX + gap / 2;
		const topY = py + metrics.cwy * 0.24;
		const coilH = metrics.cwy * 0.52;
		const arcW = Math.max(4, metrics.cellWidth * 0.12);

		if (isOn) {
			ctx.save();
			ctx.fillStyle = '#2BE060';
			ctx.beginPath();
			ctx.ellipse(
				midX,
				midY,
				Math.max(7, gap * 0.72),
				Math.max(7, coilH * 0.55),
				0,
				0,
				Math.PI * 2
			);
			ctx.fill();
			ctx.restore();
		}

		drawLine(ctx, px, midY, leftCenter - arcW, midY);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(leftCenter, topY + coilH / 2, arcW, coilH / 2, 0, Math.PI * 0.55, Math.PI * 1.45);
		ctx.stroke();
		ctx.beginPath();
		ctx.ellipse(rightCenter, topY + coilH / 2, arcW, coilH / 2, 0, Math.PI * 1.55, Math.PI * 0.45);
		ctx.stroke();
		ctx.lineWidth = 1;

		if (sym === 15 || sym === 16) {
			ctx.font = `bold ${Math.max(7, Math.round(10 * metrics.scale))}px Segoe UI`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(sym === 15 ? 'SET' : 'RST', midX, midY);
		}
	}

	function drawBox(ctx, px, py, metrics, cell) {
		const midY = py + metrics.cwy / 2;
		const boxX = px + metrics.cellWidth * 0.08;
		const boxY = py + metrics.cwy * 0.28;
		const boxRightX = px + metrics.cellWidth * 1.92;
		const boxBottomY = py + metrics.cwy * 0.74;
		const bracketSerif = Math.max(3, metrics.cellWidth * 0.12);
		const monitorOnColor = '#2BE060';
		drawLine(ctx, px, midY, boxX, midY);
		if (isBoxStatusOn(cell)) {
			ctx.save();
			ctx.fillStyle = monitorOnColor;
			const stripWidth = Math.max(2, Math.round((boxRightX - boxX) / 20));
			ctx.fillRect(boxX + 1, boxY + 1, stripWidth, Math.max(2, boxBottomY - boxY - 2));
			ctx.fillRect(boxRightX - stripWidth, boxY + 1, stripWidth, Math.max(2, boxBottomY - boxY - 2));
			ctx.restore();
		}
		ctx.lineWidth = 2;
		drawLine(ctx, boxX, boxY, boxX, boxBottomY);
		drawLine(ctx, boxX, boxY, boxX + bracketSerif, boxY);
		drawLine(ctx, boxX, boxBottomY, boxX + bracketSerif, boxBottomY);
		drawLine(ctx, boxRightX, boxY, boxRightX, boxBottomY);
		drawLine(ctx, boxRightX, boxY, boxRightX - bracketSerif, boxY);
		drawLine(ctx, boxRightX, boxBottomY, boxRightX - bracketSerif, boxBottomY);
		ctx.lineWidth = 1;

		const valueText = getBoxValueText(cell);
		if (valueText) {
			ctx.save();
			ctx.fillStyle = monitorOnColor;
			ctx.font = `${Math.max(8, Math.round(12 * metrics.scale))}px Segoe UI`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(valueText, (boxX + boxRightX) / 2, (boxY + boxBottomY) / 2, Math.max(12, boxRightX - boxX - Math.round(8 * metrics.scale)));
			ctx.restore();
		}
	}

	function getBoxValueText(cell) {
		const sym = Number(cell?.sym);
		if (sym !== 6) {
			return '';
		}

		const address = getCellAddress(cell);
		if (!address) {
			return '';
		}

		const key = address.toUpperCase();
		const runtimeValues = context.getRuntimeValues();
		const value = runtimeValues.has(key) ? runtimeValues.get(key) : 0;
		return `${key}=${formatMonitorValue(value)}`;
	}

	function formatMonitorValue(value) {
		const numericValue = Number(value);
		if (Number.isFinite(numericValue)) {
			return String(numericValue);
		}

		return String(value ?? 0);
	}

	function isBoxStatusOn(cell) {
		const statusAddress = getCellStatusAddress(cell);
		const monitorAddress = getCellAddress(cell);
		const address = statusAddress || monitorAddress;
		const runtimeValues = context.getRuntimeValues();
		if (!address || !runtimeValues.has(address)) {
			return false;
		}

		const value = Number(runtimeValues.get(address));
		return Number.isFinite(value) && value !== 0;
	}

	function drawJoin(ctx, cell, metrics, textColor) {
		const join = Number(cell?.join);
		if (join !== 1) {
			return;
		}
		const x = Number(cell?.x);
		const y = Number(cell?.y);
		if (!Number.isFinite(x) || !Number.isFinite(y)) {
			return;
		}

		const joinX = metrics.marginLeft + (x + 1) * metrics.cellWidth;
		const topY = metrics.headerHeight + y * metrics.rowHeight + metrics.symbolOffsetY + metrics.cwy / 2;
		const bottomY = metrics.headerHeight + (y + 1) * metrics.rowHeight + metrics.symbolOffsetY + metrics.cwy / 2;
		ctx.strokeStyle = textColor;
		ctx.lineWidth = 1;
		drawLine(ctx, joinX, topY, joinX, bottomY);
	}

	function drawLine(ctx, x1, y1, x2, y2) {
		ctx.beginPath();
		ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
		ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
		ctx.stroke();
	}

	function stop() {
		state.splitMode = false;
		teardownLayout();
	}

	function setFeatureEnabled(value) {
		state.featureEnabled = !!value;
	}

	return {
		setSplitMode,
		syncLayout,
		requestJson,
		renderDiagram,
		subscribeAddresses,
		onLdJsonResult,
		stop,
		isSplitMode: () => state.splitMode,
		isFeatureEnabled: () => state.featureEnabled,
		setFeatureEnabled
	};
}

window.createVisualizationLdMonitor = createVisualizationLdMonitor;
