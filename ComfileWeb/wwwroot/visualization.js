const designSurface = document.getElementById('designSurface');
        const workArea = document.querySelector('.work-area');
        const mainLayout = document.querySelector('.main-layout');
        const runButton = document.querySelector('.run-button');
        const activePageLabel = document.getElementById('activePageLabel');
        const gridXSlider = document.getElementById('gridXSlider');
        const gridYSlider = document.getElementById('gridYSlider');
        const themeModeSelect = document.getElementById('themeModeSelect');
        const languageModeSelect = document.getElementById('languageModeSelect');
        const gridXValue = document.getElementById('gridXValue');
        const gridYValue = document.getElementById('gridYValue');
        const gridVisibleCheckbox = document.getElementById('gridVisibleCheckbox');
        const alignTopButton = document.getElementById('alignTopButton');
        const alignBottomButton = document.getElementById('alignBottomButton');
        const alignLeftButton = document.getElementById('alignLeftButton');
        const alignRightButton = document.getElementById('alignRightButton');
        const distributeHorizontalButton = document.getElementById('distributeHorizontalButton');
        const distributeVerticalButton = document.getElementById('distributeVerticalButton');
        const matchSizeButton = document.getElementById('matchSizeButton');
        const arrayDuplicateButton = document.getElementById('arrayDuplicateButton');
        const pageBackColorButton = document.getElementById('pageBackColorButton');
        const pageBackColorSwatch = document.getElementById('pageBackColorSwatch');
        const deployWebServerButton = document.getElementById('deployWebServerButton');
        const propertyGridBody = document.getElementById('propertyGridBody');
        const propertyPanelTitle = document.getElementById('propertyPanelTitle');
        const propertySplitter = document.getElementById('propertySplitter');
        const rightPanelSplitter = document.getElementById('rightPanelSplitter');
        const linkPanelSplitter = document.getElementById('linkPanelSplitter');
        const rightPanel = document.querySelector('.right-panel');
        const projectPanel = document.querySelector('.project-panel');
        const propertyPanel = document.querySelector('.property-panel');
        const linkPanel = document.getElementById('linkPanel');
        const projectTree = document.getElementById('projectTree');
        const projectAddPageButton = document.getElementById('projectAddPageButton');
        const linkModelSelect = document.getElementById('linkModelSelect');
        const linkTransportSelect = document.getElementById('linkTransportSelect');
        const linkComPortSelect = document.getElementById('linkComPortSelect');
        const linkComPortRow = document.getElementById('linkComPortRow');
        const linkEthernetIpRow = document.getElementById('linkEthernetIpRow');
        const linkEthernetPortRow = document.getElementById('linkEthernetPortRow');
        const linkEthernetIpInput = document.getElementById('linkEthernetIpInput');
        const linkEthernetPortInput = document.getElementById('linkEthernetPortInput');
        const usbConnectionState = document.getElementById('usbConnectionState');
        const usbConnectButton = document.getElementById('usbConnectButton');

        const documentModel = {
            version: 1,
            pages: [
                {
                    name: 'Page1',
                    properties: {
                        gridDivisionsX: 49,
                        gridDivisionsY: 30,
                        pageBackColorHtml: '#202124'
                    },
                    widgets: []
                }
            ]
        };

        let activePageName = 'Page1';
        let selectedWidgetId = null;
        let selectedWidgetIds = [];
        let selectedCell = null;
        let copiedWidgets = [];
        const undoStack = [];
        const redoStack = [];
        const maxHistoryCount = 100;
        let nextWidgetId = 1;
        let activeResize = null;
        let activeMove = null;
        let activeMarquee = null;
        let activePropertyPanelResize = null;
        let activeRightPanelResize = null;
        let activeLinkPanelResize = null;
        let resizeDragIndicator = null;
        let lastWidgetPointerDown = { widgetId: '', time: 0 };
        let runtimeConnection = null;
        let runtimeStarting = false;
        let runtimeRunning = false;
        let runtimeStartPageName = '';
        let runtimeValues = new Map();
        let usbCdcConnectionState = { isConnected: false, portName: '' };
        const runtimeLocalValueOverrides = new Map();
        const runtimeDraggingSliderIds = new Set();
        const runtimePressedWidgetIds = new Set();
        let activeNumberInputPopup = null;
        let deployServerStarting = false;
        let deployedRuntimeMode = false;
        let gridVisible = true;
        let visualizationAddressAliases = new Map();
        let visualizationAddressAliasRefreshRequested = false;
        let visualizationAddressAliasesLoaded = false;
        let visualizationAddressAliasSelectionKey = '';
        const ldMonitor = createVisualizationLdMonitor({
            getMainLayout: () => mainLayout,
            getWorkArea: () => workArea,
            getDesignSurface: () => designSurface,
            renderWidgets: () => renderWidgets(),
            getRuntimeRunning: () => runtimeRunning,
            ensureRuntimeConnection: () => ensureRuntimeConnection(),
            getUseKoreanLanguage: () => useKoreanLanguage,
            toNumber: (value, fallback) => toNumber(value, fallback),
            getCurrentThemeMode: () => currentThemeMode,
            getRuntimeValues: () => runtimeValues
        });
        const runtimeServerOrigin = window.location.protocol === 'file:' ? 'http://127.0.0.1:5129' : window.location.origin;
        const defaultColorPalette = [
            '#000000', '#404040', '#808080', '#C0C0C0', '#FFFFFF',
            '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00B050',
            '#00FFFF', '#0070C0', '#0000FF', '#7030A0', '#FF00FF',
            '#C00000', '#C06000', '#C0C000', '#548235', '#008080',
            '#1F4E79', '#002060', '#5F497A', '#A64D79', '#FFC000',
            '#D9EAD3', '#DDEBF7', '#FCE4D6', '#EADCF8', '#E6E6E6'
        ];
        const visualizationTextResources = {
            ko: {
                run: '실행',
                starting: '시작 중...',
                stop: '중지',
                exit: '종료',
                color: '색상',
                grid: '격자',
                theme: '테마',
                language: '언어',
                widgets: '위젯',
                project: '프로젝트',
                currentPagePrefix: '현재 페이지',
                properties: '속성',
                select: '선택',
                empty: '없음',
                controls: '개 컨트롤',
                emptyCell: '빈 셀',
                placeholder: '원하는 부품(버튼, 램프등)을 마우스로 끌어다 이곳에 놓으세요',
                alignTopTooltip: '위 맞춤',
                alignBottomTooltip: '아래 맞춤',
                alignLeftTooltip: '왼쪽 맞춤',
                alignRightTooltip: '오른쪽 맞춤',
                distributeHorizontalTooltip: '가로 간격 균등',
                distributeVerticalTooltip: '세로 간격 균등',
                matchSizeTooltip: '크기 맞춤',
                arrayDuplicateTooltip: '배열복제',
                arrayDuplicateTitle: '배열복제',
                rows: '행',
                columns: '열',
                gapX: 'X 간격',
                gapY: 'Y 간격',
                apply: '적용',
                cancel: '취소'
            },
            en: {
                run: 'Run',
                starting: 'Starting...',
                stop: 'Stop',
                exit: 'Exit',
                color: 'Color',
                grid: 'Grid',
                theme: 'Theme',
                language: 'Language',
                widgets: 'Widgets',
                project: 'Project',
                currentPagePrefix: 'Current page',
                properties: 'Properties',
                select: 'Selection',
                empty: 'None',
                controls: ' controls',
                emptyCell: 'Empty cell',
                placeholder: 'Drag and drop the desired parts (buttons, lamps, etc.) here.',
                alignTopTooltip: 'Align Top',
                alignBottomTooltip: 'Align Bottom',
                alignLeftTooltip: 'Align Left',
                alignRightTooltip: 'Align Right',
                distributeHorizontalTooltip: 'Distribute Horizontally',
                distributeVerticalTooltip: 'Distribute Vertically',
                matchSizeTooltip: 'Match Size',
                arrayDuplicateTooltip: 'Array Duplicate',
                arrayDuplicateTitle: 'Array Duplicate',
                rows: 'Rows',
                columns: 'Columns',
                gapX: 'Gap X',
                gapY: 'Gap Y',
                apply: 'Apply',
                cancel: 'Cancel'
            }
        };
        let useKoreanLanguage = true;
        let currentThemeMode = 'dark';

        function getVisualizationResources() {
            return useKoreanLanguage ? visualizationTextResources.ko : visualizationTextResources.en;
        }

        const propertyDisplayNamesKo = {
            'Name': '이름',
            'Type': '종류',
            'Address': '주소',
            'Display': '표시',
            'Display Address': '표시 주소',
            'Border': '테두리',
            'Border Color': '테두리 색상',
            'Lamp': '램프',
            'Lamp Address': '램프 주소',
            'Lamp Size': '램프 크기',
            'LampColor': '램프 색상',
            'DisplayColor': '표시 색상',
            'BackColor': '배경색',
            'ForeColor': '글자색',
            'Round': '라운드',
            'X': 'X',
            'Y': 'Y',
            'Text Size': '글자 크기',
            'Text': '텍스트',
            'Direction': '방향',
            'Marking': '눈금',
            'Gauge Type': '게이지 종류',
            'Color': '색상',
            'Unit': '단위',
            'Editable': '편집 가능',
            'Position': '위치',
            'Alignment': '정렬',
            'Location': '세로 위치',
            'Minimum': '최소값',
            'Maximum': '최대값',
            'Value': '값'
        };

        function getPropertyDisplayName(propertyKey) {
            const key = String(propertyKey || '');
            if (useKoreanLanguage) {
                return propertyDisplayNamesKo[key] || key;
            }
            return key;
        }

        const themeColorDefaults = {
            dark: {
                pageBack: '#202124',
                buttonBack: '#E6E6E6',
                buttonFore: '#2D2D2D',
                buttonLamp: '#EF0000',
                lampDisplay: '#FFC850',
                toggleDisplay: '#466E3C',
                toggleBorderBack: '#535354',
                numberDisplay: '#DCDCDC',
                textDisplay: '#DCDCDC',
                textBorder: '#DCDCDC',
                progressDisplay: '#50AAF5',
                gaugeDisplay: '#F0B000'
            },
            light: {
                pageBack: '#FFFFFF',
                buttonBack: '#F3F3F3',
                buttonFore: '#1F1F1F',
                buttonLamp: '#CC0000',
                lampDisplay: '#E5A100',
                toggleDisplay: '#2E7D32',
                toggleBorderBack: '#E8E8E8',
                numberDisplay: '#303030',
                textDisplay: '#303030',
                textBorder: '#B8B8B8',
                progressDisplay: '#0078D4',
                gaugeDisplay: '#CC8A00'
            }
        };

        function getThemeColorDefaults(themeMode = currentThemeMode) {
            return themeMode === 'light' ? themeColorDefaults.light : themeColorDefaults.dark;
        }

        function createVisualizationPage(pageName) {
            const themeDefaults = getThemeColorDefaults();
            return {
                name: pageName || 'Page1',
                properties: {
                    gridDivisionsX: 49,
                    gridDivisionsY: 30,
                    pageBackColorHtml: themeDefaults.pageBack
                },
                widgets: []
            };
        }

        function normalizeVisualizationDocumentPages() {
            if (!Array.isArray(documentModel.pages) || documentModel.pages.length === 0) {
                documentModel.pages = [createVisualizationPage('Page1')];
            }

            documentModel.pages.forEach((page, index) => {
                if (!page || typeof page !== 'object') {
                    documentModel.pages[index] = createVisualizationPage(index === 0 ? 'Page1' : `Page${index + 1}`);
                    return;
                }

                page.name = String(page.name || (index === 0 ? 'Page1' : `Page${index + 1}`));
                page.properties = page.properties && typeof page.properties === 'object' ? page.properties : {};
                page.widgets = Array.isArray(page.widgets) ? page.widgets : [];
                if (!Number.isFinite(Number(page.properties.gridDivisionsX))) {
                    page.properties.gridDivisionsX = 49;
                }
                if (!Number.isFinite(Number(page.properties.gridDivisionsY))) {
                    page.properties.gridDivisionsY = 30;
                }
                if (!page.properties.pageBackColorHtml) {
                    page.properties.pageBackColorHtml = getThemeColorDefaults().pageBack;
                }
            });
        }

        function getPageByName(pageName) {
            const normalizedPageName = String(pageName || '').trim();
            if (!normalizedPageName) {
                return null;
            }

            return documentModel.pages.find(page => String(page.name || '') === normalizedPageName) || null;
        }

        function ensureVisualizationPage(pageName) {
            normalizeVisualizationDocumentPages();

            const normalizedPageName = String(pageName || '').trim() || 'Page1';
            let page = getPageByName(normalizedPageName);
            if (!page) {
                page = createVisualizationPage(normalizedPageName);
                documentModel.pages.push(page);
            }

            return page;
        }

        function getCurrentPage() {
            return ensureVisualizationPage(activePageName);
        }

        function setActiveVisualizationPage(pageName) {
            const page = ensureVisualizationPage(pageName);
            activePageName = page.name || 'Page1';
            setSelectedWidgets([]);
            selectedCell = null;
            updateGridControlsFromCurrentPage();
            updateActivePageLabel();
            renderProjectTree();
            renderWidgets();
        }

        function updateActivePageLabel() {
            if (activePageLabel) {
                const resources = getVisualizationResources();
                activePageLabel.textContent = `${resources.currentPagePrefix}: ${activePageName || 'Page1'}`;
            }
        }

        function renderProjectTree() {
            if (!projectTree) {
                return;
            }

            normalizeVisualizationDocumentPages();
            if (!getPageByName(activePageName)) {
                activePageName = documentModel.pages[0].name || 'Page1';
            }

            projectTree.innerHTML = '';

            const root = document.createElement('div');
            root.className = 'project-tree-root';
            root.setAttribute('role', 'treeitem');
            root.tabIndex = 0;

            const rootIcon = document.createElement('span');
            rootIcon.className = 'project-tree-icon';
            rootIcon.textContent = '▾';
            root.appendChild(rootIcon);

            const rootName = document.createElement('span');
            rootName.className = 'project-tree-name';
            rootName.textContent = 'Project';
            root.appendChild(rootName);
            root.addEventListener('contextmenu', event => openProjectTreeContextMenu(event, ''));
            root.addEventListener('keydown', event => {
                if (event.key === 'Insert') {
                    event.preventDefault();
                    addProjectTreePage();
                }
            });
            projectTree.appendChild(root);

            documentModel.pages.forEach(page => {
                const pageName = String(page.name || '').trim() || 'Page1';
                const pageItem = document.createElement('div');
                pageItem.className = 'project-tree-page';
                pageItem.setAttribute('role', 'treeitem');
                pageItem.tabIndex = 0;
                pageItem.dataset.pageName = pageName;
                if (pageName === activePageName) {
                    pageItem.classList.add('active');
                    pageItem.setAttribute('aria-selected', 'true');
                } else {
                    pageItem.setAttribute('aria-selected', 'false');
                }

                const pageIcon = document.createElement('span');
                pageIcon.className = 'project-tree-icon';
                pageIcon.textContent = '□';
                pageItem.appendChild(pageIcon);

                const name = document.createElement('span');
                name.className = 'project-tree-name';
                name.textContent = pageName;
                pageItem.appendChild(name);

                pageItem.addEventListener('click', () => setActiveVisualizationPage(pageName));
                pageItem.addEventListener('dblclick', event => {
                    event.preventDefault();
                    renameProjectTreePage(pageName);
                });
                pageItem.addEventListener('contextmenu', event => openProjectTreeContextMenu(event, pageName));
                pageItem.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveVisualizationPage(pageName);
                    } else if (event.key === 'F2') {
                        event.preventDefault();
                        renameProjectTreePage(pageName);
                    } else if (event.key === 'Delete') {
                        event.preventDefault();
                        deleteProjectTreePage(pageName);
                    }
                });

                projectTree.appendChild(pageItem);
            });
        }

        function getNextPageName() {
            normalizeVisualizationDocumentPages();
            const existingNames = new Set(documentModel.pages.map(page => String(page.name || '')));
            let index = documentModel.pages.length + 1;
            let candidate = `Page${index}`;
            while (existingNames.has(candidate)) {
                index += 1;
                candidate = `Page${index}`;
            }

            return candidate;
        }

        function addProjectTreePage() {
            if (runtimeRunning || deployedRuntimeMode) {
                return;
            }

            const defaultName = getNextPageName();
            const input = window.prompt('새 페이지 이름을 입력하세요.', defaultName);
            if (input === null) {
                return;
            }

            const pageName = String(input).trim();
            if (!pageName) {
                window.alert('페이지 이름을 입력하세요.');
                return;
            }

            normalizeVisualizationDocumentPages();
            if (getPageByName(pageName)) {
                window.alert('같은 이름의 페이지가 이미 있습니다.');
                return;
            }

            pushUndoState();
            documentModel.pages.push(createVisualizationPage(pageName));
            activePageName = pageName;
            setSelectedWidgets([]);
            selectedCell = null;
            updateGridControlsFromCurrentPage();
            updateActivePageLabel();
            renderProjectTree();
            renderWidgets();
        }

        function renameProjectTreePage(pageName) {
            if (runtimeRunning || deployedRuntimeMode) {
                return;
            }

            const oldName = String(pageName || activePageName || 'Page1').trim();
            const input = window.prompt('페이지 이름을 입력하세요.', oldName);
            if (input === null) {
                return;
            }

            const nextName = String(input).trim();
            if (!nextName || nextName === oldName) {
                return;
            }

            normalizeVisualizationDocumentPages();
            if (documentModel.pages.some(page => String(page.name || '') === nextName)) {
                window.alert('같은 이름의 페이지가 이미 있습니다.');
                return;
            }

            pushUndoState();
            renameVisualizationPage(oldName, nextName);
        }

        function deleteProjectTreePage(pageName) {
            if (runtimeRunning || deployedRuntimeMode) {
                return;
            }

            const name = String(pageName || activePageName || '').trim();
            if (!name) {
                return;
            }

            normalizeVisualizationDocumentPages();
            if (documentModel.pages.length <= 1) {
                window.alert('최소 한 개의 페이지는 필요합니다.');
                return;
            }

            if (!window.confirm(`'${name}' 페이지를 삭제하시겠습니까?`)) {
                return;
            }

            pushUndoState();
            deleteVisualizationPage(name);
        }

        function openProjectTreeContextMenu(event, pageName) {
            event.preventDefault();
            event.stopPropagation();

            closeProjectTreeContextMenu();
            const targetPageName = String(pageName || '').trim();
            if (targetPageName) {
                setActiveVisualizationPage(targetPageName);
            }

            const menu = document.createElement('div');
            menu.className = 'project-tree-context-menu';
            menu.setAttribute('role', 'menu');

            if (targetPageName) {
                const title = document.createElement('div');
                title.className = 'project-tree-context-menu-title';
                title.textContent = targetPageName;
                menu.appendChild(title);
                appendProjectTreeMenuItem(menu, '이름 변경', () => renameProjectTreePage(targetPageName));
                appendProjectTreeMenuItem(menu, '삭제', () => deleteProjectTreePage(targetPageName), documentModel.pages.length <= 1);
            } else {
                appendProjectTreeMenuItem(menu, '페이지 추가', () => addProjectTreePage());
            }

            document.body.appendChild(menu);
            const menuRect = menu.getBoundingClientRect();
            const left = Math.max(4, Math.min(window.innerWidth - menuRect.width - 4, event.clientX));
            const top = Math.max(4, Math.min(window.innerHeight - menuRect.height - 4, event.clientY));
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;

            const firstEnabledItem = menu.querySelector('.project-tree-context-menu-item:not(:disabled)');
            if (firstEnabledItem) {
                firstEnabledItem.focus();
            }

            window.addEventListener('pointerdown', handleProjectTreeContextMenuPointerDown, { capture: true });
            window.addEventListener('keydown', handleProjectTreeContextMenuKeyDown, { once: true });
        }

        function appendProjectTreeMenuItem(menu, label, action, disabled = false) {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'project-tree-context-menu-item';
            item.textContent = label;
            item.disabled = disabled;
            item.setAttribute('role', 'menuitem');
            item.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                closeProjectTreeContextMenu();
                if (!disabled) {
                    action();
                }
            });
            menu.appendChild(item);
        }

        function closeProjectTreeContextMenu() {
            document.querySelectorAll('.project-tree-context-menu').forEach(menu => menu.remove());
            window.removeEventListener('pointerdown', handleProjectTreeContextMenuPointerDown, { capture: true });
        }

        function handleProjectTreeContextMenuPointerDown(event) {
            if (event.target && event.target.closest && event.target.closest('.project-tree-context-menu')) {
                return;
            }

            closeProjectTreeContextMenu();
        }

        function handleProjectTreeContextMenuKeyDown(event) {
            if (event.key === 'Escape') {
                closeProjectTreeContextMenu();
            }
        }

        function matchSelectedWidgetSizes(mode) {
            if (runtimeRunning || selectedWidgetIds.length < 2) {
                return;
            }

            const page = getCurrentPage();
            const selectedWidgets = page.widgets.filter(widget => selectedWidgetIds.includes(widget.id));
            if (selectedWidgets.length < 2) {
                return;
            }

            const gridX = toNumber(gridXSlider.value, 49);
            const gridY = toNumber(gridYSlider.value, 30);
            const anchor = selectedWidgets[selectedWidgets.length - 1];
            if (!anchor) {
                return;
            }

            const targetWidth = Math.max(1, anchor.cellWidth);
            const targetHeight = Math.max(1, anchor.cellHeight);
            const nextSizes = new Map();

            selectedWidgets.forEach(widget => {
                if (!widget || widget.id === anchor.id) {
                    return;
                }

                let nextWidth = Math.max(1, widget.cellWidth);
                let nextHeight = Math.max(1, widget.cellHeight);

                if (mode === 'width' || mode === 'size') {
                    nextWidth = targetWidth;
                }
                if (mode === 'height' || mode === 'size') {
                    nextHeight = targetHeight;
                }

                nextWidth = Math.max(1, Math.min(nextWidth, gridX - widget.cellX));
                nextHeight = Math.max(1, Math.min(nextHeight, gridY - widget.cellY));
                nextSizes.set(widget.id, { width: nextWidth, height: nextHeight });
            });

            const changed = selectedWidgets.some(widget => {
                if (!widget || widget.id === anchor.id) {
                    return false;
                }

                const next = nextSizes.get(widget.id);
                return !!next && (next.width !== widget.cellWidth || next.height !== widget.cellHeight);
            });

            if (!changed) {
                return;
            }

            pushUndoState();

            selectedWidgets.forEach(widget => {
                if (!widget || widget.id === anchor.id) {
                    return;
                }

                const next = nextSizes.get(widget.id);
                if (!next) {
                    return;
                }

                widget.cellWidth = next.width;
                widget.cellHeight = next.height;
            });

            renderWidgets();
        }

        function distributeSelectedWidgets(direction) {
            if (runtimeRunning || selectedWidgetIds.length < 3) {
                return;
            }

            const page = getCurrentPage();
            const selectedWidgets = page.widgets.filter(widget => selectedWidgetIds.includes(widget.id));
            if (selectedWidgets.length < 3) {
                return;
            }

            const sorted = [...selectedWidgets].sort((a, b) => {
                if (direction === 'horizontal') {
                    return a.cellX - b.cellX;
                }

                return a.cellY - b.cellY;
            });

            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            if (!first || !last) {
                return;
            }

            const nextPositions = new Map();
            const gaps = sorted.length - 1;
            if (direction === 'horizontal') {
                const firstLeft = first.cellX;
                const lastRight = last.cellX + Math.max(1, last.cellWidth);
                const totalWidth = sorted.reduce((sum, widget) => sum + Math.max(1, widget.cellWidth), 0);
                const gap = (lastRight - firstLeft - totalWidth) / gaps;
                let cursor = first.cellX + Math.max(1, first.cellWidth) + gap;

                for (let index = 1; index < sorted.length - 1; index += 1) {
                    const widget = sorted[index];
                    const width = Math.max(1, widget.cellWidth);
                    const nextX = Math.round(cursor);
                    nextPositions.set(widget.id, { x: nextX, y: widget.cellY });
                    cursor += width + gap;
                }
            } else {
                const firstTop = first.cellY;
                const lastBottom = last.cellY + Math.max(1, last.cellHeight);
                const totalHeight = sorted.reduce((sum, widget) => sum + Math.max(1, widget.cellHeight), 0);
                const gap = (lastBottom - firstTop - totalHeight) / gaps;
                let cursor = first.cellY + Math.max(1, first.cellHeight) + gap;

                for (let index = 1; index < sorted.length - 1; index += 1) {
                    const widget = sorted[index];
                    const height = Math.max(1, widget.cellHeight);
                    const nextY = Math.round(cursor);
                    nextPositions.set(widget.id, { x: widget.cellX, y: nextY });
                    cursor += height + gap;
                }
            }

            const changed = sorted.some((widget, index) => {
                if (index === 0 || index === sorted.length - 1) {
                    return false;
                }

                const next = nextPositions.get(widget.id);
                return !!next && (next.x !== widget.cellX || next.y !== widget.cellY);
            });

            if (!changed) {
                return;
            }

            pushUndoState();

            sorted.forEach((widget, index) => {
                if (index === 0 || index === sorted.length - 1) {
                    return;
                }

                const next = nextPositions.get(widget.id);
                if (!next) {
                    return;
                }

                widget.cellX = next.x;
                widget.cellY = next.y;
                widget.properties.X = String(next.x);
                widget.properties.Y = String(next.y);
            });

            renderWidgets();
        }

        function notifyVisualizationDirty() {
            if (!window.chrome || !window.chrome.webview) {
                return;
            }

            window.chrome.webview.postMessage({ type: 'visualization-document-dirty' });
        }

        function applyGridVisibility() {
            const hideGrid = !gridVisible || runtimeRunning;
            designSurface.classList.toggle('grid-hidden', hideGrid);
            if (gridVisibleCheckbox) {
                gridVisibleCheckbox.checked = !!gridVisible;
            }
        }

        function setGridVisible(nextVisible, notifyHost = true) {
            const normalizedVisible = !!nextVisible;
            if (gridVisible === normalizedVisible) {
                return;
            }

            gridVisible = normalizedVisible;
            applyGridVisibility();

            if (notifyHost && window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage({
                    type: 'visualization-grid-visible-changed',
                    gridVisible: gridVisible
                });
            }
        }

        function applyHostGridVisibilitySetting(payload) {
            const nextVisible = payload && typeof payload.gridVisible === 'boolean'
                ? payload.gridVisible
                : true;
            setGridVisible(nextVisible, false);
        }

        window.applyVisualizationGridVisibilitySetting = applyHostGridVisibilitySetting;

        function setDeployButtonState(isDeploying) {
            deployServerStarting = !!isDeploying;
            if (!deployWebServerButton) {
                return;
            }

            deployWebServerButton.disabled = deployServerStarting;
            deployWebServerButton.textContent = deployServerStarting ? '배포중...' : '웹서버 배포';
        }

        function onVisualizationDeployServerResult(result) {
            setDeployButtonState(false);

            const success = !result || result.success !== false;
            if (!success) {
                console.warn(String(result?.detail || '웹서버 배포에 실패했습니다. Output 창 로그를 확인하세요.'));
            }
        }

        function getDeployMonitorOptionFromDocument(model) {
            const includeOption = model?.deployOptions?.includeLdMonitoring;
            return typeof includeOption === 'boolean' ? includeOption : true;
        }

        function exportVisualizationDeployDocumentText(includeLdMonitoring) {
            const deployModel = JSON.parse(JSON.stringify(documentModel || {}));
            deployModel.deployOptions = deployModel.deployOptions && typeof deployModel.deployOptions === 'object'
                ? deployModel.deployOptions
                : {};
            deployModel.deployOptions.includeLdMonitoring = !!includeLdMonitoring;
            return JSON.stringify(deployModel);
        }

        function closeDeployOptionsDialog() {
            document.querySelectorAll('.deploy-options-dialog-overlay').forEach(element => element.remove());
        }

        function openDeployOptionsDialog() {
            closeDeployOptionsDialog();

            const isKorean = !!useKoreanLanguage;
            const titleText = isKorean ? '웹서버 배포 안내' : 'Web Server Deployment';
            const descriptionText = isKorean
                ? '웹브라우저에서 접속할 수 있는 웹서버 실행파일을 생성하는 기능입니다.'
                : 'This feature creates a web server executable that can be accessed from a web browser.';
            const includeLabelText = isKorean ? 'LD 모니터링 포함' : 'Include LD monitoring';
            const deployText = isKorean ? '배포' : 'Deploy';
            const cancelText = isKorean ? '취소' : 'Cancel';

            const overlay = document.createElement('div');
            overlay.className = 'deploy-options-dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'deploy-options-dialog';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-label', titleText);

            const title = document.createElement('h3');
            title.className = 'deploy-options-dialog-title';
            title.textContent = titleText;

            const description = document.createElement('p');
            description.className = 'deploy-options-dialog-description';
            description.textContent = descriptionText;

            const checkboxRow = document.createElement('label');
            checkboxRow.className = 'deploy-options-checkbox';
            const includeCheckbox = document.createElement('input');
            includeCheckbox.type = 'checkbox';
            includeCheckbox.checked = true;
            const checkboxText = document.createElement('span');
            checkboxText.textContent = includeLabelText;
            checkboxRow.appendChild(includeCheckbox);
            checkboxRow.appendChild(checkboxText);

            const footer = document.createElement('div');
            footer.className = 'deploy-options-dialog-footer';
            const deployButton = document.createElement('button');
            deployButton.type = 'button';
            deployButton.className = 'toolbar-button deploy-options-confirm';
            deployButton.textContent = deployText;
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'toolbar-button';
            cancelButton.textContent = cancelText;

            const closeDialog = () => closeDeployOptionsDialog();

            cancelButton.addEventListener('click', closeDialog);
            overlay.addEventListener('pointerdown', event => {
                if (event.target === overlay) {
                    closeDialog();
                }
            });

            deployButton.addEventListener('click', () => {
                if (deployServerStarting) {
                    return;
                }

                if (!window.chrome || !window.chrome.webview) {
                    alert('웹서버 배포는 CUBLOC2 Studio 환경에서만 실행할 수 있습니다.');
                    closeDialog();
                    return;
                }

                setDeployButtonState(true);

                window.chrome.webview.postMessage({
                    type: 'visualization-deploy-server-request',
                    documentText: exportVisualizationDeployDocumentText(includeCheckbox.checked)
                });

                closeDialog();
            });

            footer.appendChild(deployButton);
            footer.appendChild(cancelButton);

            dialog.appendChild(title);
            dialog.appendChild(description);
            dialog.appendChild(checkboxRow);
            dialog.appendChild(footer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        }

        window.onVisualizationDeployServerResult = onVisualizationDeployServerResult;

        async function tryLoadStandaloneVisualizationDocument() {
            if (window.chrome && window.chrome.webview) {
                return;
            }

            // ComfileWeb 편집 전용 모드에서는 배포 런타임으로 자동 진입하지 않고
            // 디자이너 편집 화면을 그대로 유지한다.
            if (window.comfileWebEditorMode) {
                return;
            }

            try {
                deployedRuntimeMode = true;
                hideDesignerToolbarForDeployedRuntime();
                const response = await fetch('visualization.document.json', { cache: 'no-store' });
                if (!response.ok) {
                    return;
                }

                const text = await response.text();
                if (text && text.trim()) {
                    importVisualizationDocumentText(text);
                    await startRuntime();
                }
            } catch {
            }
        }

        function hideDesignerToolbarForDeployedRuntime() {
            if (!deployedRuntimeMode) {
                return;
            }

            document.documentElement.classList.add('deployed-runtime-preload');

            const toolbar = document.querySelector('.toolbar');
            const splitter = document.getElementById('propertySplitter');
            if (toolbar) {
                toolbar.style.display = 'none';
            }
            if (propertyPanel) {
                propertyPanel.style.display = 'none';
            }
            if (splitter) {
                splitter.style.display = 'none';
            }
        }

        function renameVisualizationPage(oldPageName, newPageName) {
            const oldName = String(oldPageName || '').trim();
            const nextName = String(newPageName || '').trim();
            if (!oldName || !nextName || oldName === nextName) {
                return;
            }

            normalizeVisualizationDocumentPages();
            const page = getPageByName(oldName);
            if (page) {
                page.name = nextName;
            } else {
                ensureVisualizationPage(nextName);
            }

            if (activePageName === oldName || !getPageByName(activePageName)) {
                activePageName = nextName;
                setSelectedWidgets([]);
                selectedCell = null;
            }

            notifyVisualizationDirty();

            updateGridControlsFromCurrentPage();
            updateActivePageLabel();
            renderProjectTree();
            renderWidgets();
        }

        function deleteVisualizationPage(pageName) {
            const name = String(pageName || '').trim();
            if (!name) {
                return;
            }

            normalizeVisualizationDocumentPages();
            if (documentModel.pages.length <= 1) {
                return;
            }

            documentModel.pages = documentModel.pages.filter(page => String(page.name || '') !== name);
            normalizeVisualizationDocumentPages();
            if (activePageName === name || !getPageByName(activePageName)) {
                activePageName = documentModel.pages[0].name || 'Page1';
                setSelectedWidgets([]);
                selectedCell = null;
            }

            notifyVisualizationDirty();

            updateGridControlsFromCurrentPage();
            updateActivePageLabel();
            renderProjectTree();
            renderWidgets();
        }

        function createHistorySnapshot() {
            return {
                documentModel: JSON.parse(JSON.stringify(documentModel)),
                nextWidgetId,
                selectedWidgetId,
                selectedWidgetIds: [...selectedWidgetIds],
                selectedCell: selectedCell ? { ...selectedCell } : null
            };
        }

        function restoreHistorySnapshot(snapshot) {
            if (!snapshot) {
                return;
            }

            documentModel.version = snapshot.documentModel.version;
            documentModel.pages = JSON.parse(JSON.stringify(snapshot.documentModel.pages || []));
            normalizeVisualizationDocumentPages();
            if (!getPageByName(activePageName)) {
                activePageName = documentModel.pages[0].name || 'Page1';
            }
            nextWidgetId = snapshot.nextWidgetId;
            selectedWidgetId = snapshot.selectedWidgetId || null;
            selectedWidgetIds = Array.isArray(snapshot.selectedWidgetIds) ? [...snapshot.selectedWidgetIds] : [];
            selectedCell = snapshot.selectedCell ? { ...snapshot.selectedCell } : null;
            updateGridControlsFromCurrentPage();
            renderProjectTree();
            renderWidgets();
        }

        function pushUndoState() {
            pushUndoSnapshot(createHistorySnapshot());
            notifyVisualizationDirty();
        }

        function pushUndoSnapshot(snapshot) {
            if (!snapshot) {
                return;
            }

            undoStack.push(snapshot);
            if (undoStack.length > maxHistoryCount) {
                undoStack.shift();
            }
            redoStack.length = 0;
            notifyVisualizationDirty();
        }

        function undoEdit() {
            if (runtimeRunning) {
                return;
            }

            if (undoStack.length === 0) {
                return;
            }

            redoStack.push(createHistorySnapshot());
            restoreHistorySnapshot(undoStack.pop());
        }

        function redoEdit() {
            if (runtimeRunning) {
                return;
            }

            if (redoStack.length === 0) {
                return;
            }

            undoStack.push(createHistorySnapshot());
            restoreHistorySnapshot(redoStack.pop());
        }

        function setSelectedWidgets(widgetIds) {
            selectedWidgetIds = Array.from(new Set((widgetIds || []).filter(Boolean)));
            selectedWidgetId = selectedWidgetIds.length > 0 ? selectedWidgetIds[selectedWidgetIds.length - 1] : null;
            visualizationAddressAliasSelectionKey = '';
            if (selectedWidgetIds.length > 0) {
                selectedCell = null;
            }
        }

        function addSelectedWidget(widgetId) {
            if (!widgetId) {
                return;
            }

            setSelectedWidgets([...selectedWidgetIds, widgetId]);
        }

        function removeSelectedWidget(widgetId) {
            setSelectedWidgets(selectedWidgetIds.filter(id => id !== widgetId));
        }

        function setSelectedCell(cell) {
            selectedCell = cell && Number.isFinite(cell.x) && Number.isFinite(cell.y)
                ? { x: cell.x, y: cell.y }
                : null;
            if (selectedCell) {
                selectedWidgetIds = [];
                selectedWidgetId = null;
            }
        }

        function isWidgetSelected(widget) {
            return !!widget && selectedWidgetIds.includes(widget.id);
        }

        function alignSelectedWidgets(direction) {
            if (runtimeRunning || selectedWidgetIds.length < 2) {
                return;
            }

            const page = getCurrentPage();
            const selectedWidgets = page.widgets.filter(widget => selectedWidgetIds.includes(widget.id));
            if (selectedWidgets.length < 2) {
                return;
            }

            const gridX = toNumber(gridXSlider.value, 54);
            const gridY = toNumber(gridYSlider.value, 30);
            const anchor = selectedWidgets[selectedWidgets.length - 1];
            if (!anchor) {
                return;
            }

            const anchorLeft = anchor.cellX;
            const anchorTop = anchor.cellY;
            const anchorRight = anchor.cellX + Math.max(1, anchor.cellWidth);
            const anchorBottom = anchor.cellY + Math.max(1, anchor.cellHeight);

            const nextPositions = new Map();
            selectedWidgets.forEach(widget => {
                if (!widget || widget.id === anchor.id) {
                    return;
                }

                const width = Math.max(1, widget.cellWidth);
                const height = Math.max(1, widget.cellHeight);
                let nextX = widget.cellX;
                let nextY = widget.cellY;

                if (direction === 'top') {
                    nextY = anchorTop;
                } else if (direction === 'bottom') {
                    nextY = anchorBottom - height;
                } else if (direction === 'left') {
                    nextX = anchorLeft;
                } else if (direction === 'right') {
                    nextX = anchorRight - width;
                }

                nextX = Math.max(0, Math.min(gridX - width, nextX));
                nextY = Math.max(0, Math.min(gridY - height, nextY));

                nextPositions.set(widget.id, { x: nextX, y: nextY });
            });

            const changed = selectedWidgets.some(widget => {
                if (!widget || widget.id === anchor.id) {
                    return false;
                }

                const next = nextPositions.get(widget.id);
                return !!next && (next.x !== widget.cellX || next.y !== widget.cellY);
            });

            if (!changed) {
                return;
            }

            pushUndoState();

            selectedWidgets.forEach(widget => {
                if (!widget || widget.id === anchor.id) {
                    return;
                }

                const next = nextPositions.get(widget.id);
                if (!next) {
                    return;
                }

                if (next.x !== widget.cellX || next.y !== widget.cellY) {
                    widget.cellX = next.x;
                    widget.cellY = next.y;
                    widget.properties.X = String(next.x);
                    widget.properties.Y = String(next.y);
                }
            });

            renderWidgets();
        }

        function createButtonWidget(cellX, cellY) {
            const page = getCurrentPage();
            const buttonIndex = page.widgets.filter(widget => widget.kind === 'Button').length + 1;
            const name = `Button${buttonIndex}`;
            const themeDefaults = getThemeColorDefaults();

            return {
                id: `w${nextWidgetId++}`,
                kind: 'Button',
                cellX,
                cellY,
                cellWidth: 1,
                cellHeight: 1,
                properties: {
                    Name: name,
                    Address: '',
                    Display: 'On',
                    'Display Address': '',
                    Lamp: 'Off',
                    'Lamp Address': '',
                    LampColor: themeDefaults.buttonLamp,
                    X: String(cellX),
                    Y: String(cellY),
                    BackColor: themeDefaults.buttonBack,
                    ForeColor: themeDefaults.buttonFore,
                    Round: 'Yes',
                    'Text Size': '18',
                    Text: 'Button'
                }
            };
        }

        function createLampWidget(cellX, cellY) {
            const page = getCurrentPage();
            const lampIndex = page.widgets.filter(widget => widget.kind === 'Lamp').length + 1;
            const name = `Lamp${lampIndex}`;
            const themeDefaults = getThemeColorDefaults();

            return {
                id: `w${nextWidgetId++}`,
                kind: 'Lamp',
                cellX,
                cellY,
                cellWidth: 1,
                cellHeight: 1,
                properties: {
                    Name: name,
                    Address: '',
                    Display: 'On',
                    'Display Address': '',
                    Border: 'Off',
                    'Border Color': themeDefaults.toggleBorderBack,
                    'Lamp Size': '100',
                    DisplayColor: themeDefaults.lampDisplay,
                    X: String(cellX),
                    Y: String(cellY),
                    'Text Size': '16',
                    Text: ''
                }
            };
        }

        function createWidget(kind, cellX, cellY) {
            let widget;
            if (kind === 'Lamp') {
                widget = createLampWidget(cellX, cellY);
            } else if (kind === 'Toggle') {
                widget = createToggleWidget(cellX, cellY);
            } else if (kind === 'Number') {
                widget = createNumberWidget(cellX, cellY);
            } else if (kind === 'Text') {
                widget = createTextWidget(cellX, cellY);
            } else if (kind === 'Slider') {
                widget = createSliderWidget(cellX, cellY);
            } else if (kind === 'ProgressBar') {
                widget = createProgressBarWidget(cellX, cellY);
            } else if (kind === 'Gauge') {
                widget = createGaugeWidget(cellX, cellY);
            } else {
                widget = createButtonWidget(cellX, cellY);
            }

            applyAdaptiveInitialWidgetSize(widget);
            return widget;
        }

        function getAdaptiveWidgetTargetPixelSize(kind) {
            if (kind === 'Gauge') {
                return { width: 180, height: 180 };
            }

            if (kind === 'ProgressBar' || kind === 'Slider') {
                return { width: 190, height: 56 };
            }

            if (kind === 'Number') {
                return { width: 150, height: 90 };
            }

            if (kind === 'Button' || kind === 'Text') {
                return { width: 140, height: 58 };
            }

            if (kind === 'Lamp') {
                return { width: 96, height: 96 };
            }

            if (kind === 'Toggle') {
                return { width: 84, height: 44 };
            }

            return { width: 120, height: 72 };
        }

        function applyAdaptiveInitialWidgetSize(widget) {
            if (!widget || !designSurface) {
                return;
            }

            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            if (gridX <= 0 || gridY <= 0) {
                return;
            }

            const compactGrid = gridX <= 12 && gridY <= 12;
            let desiredWidth = 1;
            let desiredHeight = 1;

            if (!compactGrid) {
                const target = getAdaptiveWidgetTargetPixelSize(widget.kind);
                const cellPixelWidth = Math.max(1, designSurface.clientWidth / gridX);
                const cellPixelHeight = Math.max(1, designSurface.clientHeight / gridY);
                desiredWidth = Math.max(1, Math.round(target.width / cellPixelWidth));
                desiredHeight = Math.max(1, Math.round(target.height / cellPixelHeight));
            }

            desiredWidth = Math.max(1, Math.min(4, desiredWidth, gridX - widget.cellX));
            desiredHeight = Math.max(1, Math.min(4, desiredHeight, gridY - widget.cellY));

            while (desiredWidth > 1 || desiredHeight > 1) {
                if (!wouldOverlap(widget, widget.cellX, widget.cellY, desiredWidth, desiredHeight)) {
                    break;
                }

                if (desiredWidth >= desiredHeight && desiredWidth > 1) {
                    desiredWidth -= 1;
                } else if (desiredHeight > 1) {
                    desiredHeight -= 1;
                } else {
                    break;
                }
            }

            widget.cellWidth = desiredWidth;
            widget.cellHeight = desiredHeight;
        }

        function isSupportedWidgetKind(kind) {
            return kind === 'Button' || kind === 'Lamp' || kind === 'Toggle' || kind === 'Number' || kind === 'Text' || kind === 'Slider' || kind === 'ProgressBar' || kind === 'Gauge';
        }

        function createGaugeWidget(cellX, cellY) {
            const page = getCurrentPage();
            const gaugeIndex = page.widgets.filter(widget => widget.kind === 'Gauge').length + 1;
            const name = `Gauge${gaugeIndex}`;
            const themeDefaults = getThemeColorDefaults();

            return {
                id: `w${nextWidgetId++}`,
                kind: 'Gauge',
                cellX,
                cellY,
                cellWidth: 2,
                cellHeight: 2,
                properties: {
                    Name: name,
                    Address: '',
                    'Gauge Type': 'Default',
                    X: String(cellX),
                    Y: String(cellY),
                    Minimum: '0',
                    Maximum: '60',
                    Color: themeDefaults.gaugeDisplay,
                    Unit: '',
                    Value: '0'
                }
            };
        }

        function createProgressBarWidget(cellX, cellY) {
            const page = getCurrentPage();
            const progressIndex = page.widgets.filter(widget => widget.kind === 'ProgressBar').length + 1;
            const name = `ProgressBar${progressIndex}`;
            const themeDefaults = getThemeColorDefaults();

            return {
                id: `w${nextWidgetId++}`,
                kind: 'ProgressBar',
                cellX,
                cellY,
                cellWidth: 2,
                cellHeight: 1,
                properties: {
                    Name: name,
                    Address: '',
                    Direction: 'Horizontal',
                    Marking: 'On',
                    X: String(cellX),
                    Y: String(cellY),
                    Minimum: '0',
                    Maximum: '100',
                    DisplayColor: themeDefaults.progressDisplay,
                    Value: '0'
                }
            };
        }

        function createSliderWidget(cellX, cellY) {
            const page = getCurrentPage();
            const sliderIndex = page.widgets.filter(widget => widget.kind === 'Slider').length + 1;
            const name = `Slider${sliderIndex}`;

            return {
                id: `w${nextWidgetId++}`,
                kind: 'Slider',
                cellX,
                cellY,
                cellWidth: 2,
                cellHeight: 1,
                properties: {
                    Name: name,
                    Address: '',
                    Direction: 'Horizontal',
                    X: String(cellX),
                    Y: String(cellY),
                    Minimum: '0',
                    Maximum: '100',
                    Value: '0'
                }
            };
        }

        function createTextWidget(cellX, cellY) {
            const page = getCurrentPage();
            const textIndex = page.widgets.filter(widget => widget.kind === 'Text').length + 1;
            const name = `Text${textIndex}`;
            const themeDefaults = getThemeColorDefaults();

            return {
                id: `w${nextWidgetId++}`,
                kind: 'Text',
                cellX,
                cellY,
                cellWidth: 1,
                cellHeight: 1,
                properties: {
                    Name: name,
                    Address: '',
                    Display: 'On',
                    'Display Address': '',
                    Border: 'Off',
                    'Border Color': themeDefaults.textBorder,
                    X: String(cellX),
                    Y: String(cellY),
                    DisplayColor: themeDefaults.textDisplay,
                    Alignment: 'Center',
                    Location: 'Middle',
                    'Text Size': '18',
                    Text: 'Text'
                }
            };
        }

        function createNumberWidget(cellX, cellY) {
            const page = getCurrentPage();
            const numberIndex = page.widgets.filter(widget => widget.kind === 'Number').length + 1;
            const name = `Number${numberIndex}`;
            const themeDefaults = getThemeColorDefaults();

            return {
                id: `w${nextWidgetId++}`,
                kind: 'Number',
                cellX,
                cellY,
                cellWidth: 1,
                cellHeight: 1,
                properties: {
                    Name: name,
                    Address: '',
                    Display: 'On',
                    'Display Address': '',
                    DisplayColor: themeDefaults.numberDisplay,
                    X: String(cellX),
                    Y: String(cellY),
                    Editable: 'Disable',
                    Unit: '',
                    'Text Size': '32',
                    Text: '123'
                }
            };
        }

        function createToggleWidget(cellX, cellY) {
            const page = getCurrentPage();
            const toggleIndex = page.widgets.filter(widget => widget.kind === 'Toggle').length + 1;
            const name = `Toggle${toggleIndex}`;
            const themeDefaults = getThemeColorDefaults();

            return {
                id: `w${nextWidgetId++}`,
                kind: 'Toggle',
                cellX,
                cellY,
                cellWidth: 1,
                cellHeight: 1,
                properties: {
                    Name: name,
                    Address: '',
                    Border: 'Off',
                    'Border Color': themeDefaults.toggleBorderBack,
                    DisplayColor: themeDefaults.toggleDisplay,
                    X: String(cellX),
                    Y: String(cellY),
                    'Text Size': '16',
                    Text: ''
                }
            };
        }

        function renderWidgets() {
            if (runtimeRunning && activeNumberInputPopup) {
                return;
            }

            ldMonitor.syncLayout();

            const page = getCurrentPage();
            designSurface.classList.toggle('runtime-running', runtimeRunning);
            designSurface.querySelectorAll('.design-widget').forEach(widgetElement => widgetElement.remove());
            designSurface.querySelectorAll('.selected-widget-address-popup').forEach(element => element.remove());
            removeRuntimePageNavigationElement();
            renderRuntimePageNavigation();
            removeCellCursorElement();
            removeSelectionMarqueeElement();

            page.widgets.forEach(widget => {
                let widgetElement = null;
                if (widget.kind === 'Button') {
                    widgetElement = renderButtonWidget(widget);
                } else if (widget.kind === 'Lamp') {
                    widgetElement = renderLampWidget(widget);
                } else if (widget.kind === 'Toggle') {
                    widgetElement = renderToggleWidget(widget);
                } else if (widget.kind === 'Number') {
                    widgetElement = renderNumberWidget(widget);
                } else if (widget.kind === 'Text') {
                    widgetElement = renderTextWidget(widget);
                } else if (widget.kind === 'Slider') {
                    widgetElement = renderSliderWidget(widget);
                } else if (widget.kind === 'ProgressBar') {
                    widgetElement = renderProgressBarWidget(widget);
                } else if (widget.kind === 'Gauge') {
                    widgetElement = renderGaugeWidget(widget);
                }

                if (widgetElement) {
                    designSurface.appendChild(widgetElement);
                    renderSelectedWidgetAddressPopup(widgetElement, widget);
                }
            });

            updatePlaceholderVisibility();
            if (!runtimeRunning) {
                renderCellCursor();
            }
            renderProperties();
        }

        function renderRuntimePageNavigation() {
            if (!runtimeRunning || !Array.isArray(documentModel.pages)) {
                if (workArea) {
                    workArea.classList.remove('runtime-pages-visible');
                }
                return;
            }

            normalizeVisualizationDocumentPages();

            const runtimePages = documentModel.pages
                .map((page, index) => String(page?.name || `Page${index + 1}`).trim())
                .filter(pageName => pageName);

            const navigation = document.createElement('nav');
            navigation.className = 'runtime-page-navigation';
            navigation.setAttribute('aria-label', useKoreanLanguage ? '시각화 페이지 이동' : 'Visualization page navigation');

            const pageList = document.createElement('div');
            pageList.className = 'runtime-page-list';

            if (documentModel.pages.length > 1) {
                runtimePages.forEach(pageName => {
                    const pageButton = document.createElement('button');
                    pageButton.type = 'button';
                    pageButton.className = 'runtime-page-button';
                    pageButton.textContent = pageName;
                    if (pageName === activePageName) {
                        pageButton.classList.add('active');
                        pageButton.setAttribute('aria-current', 'page');
                    }
                    pageButton.addEventListener('pointerdown', event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (pageName !== activePageName) {
                            setActiveVisualizationPage(pageName);
                        }
                    });
                    pageButton.addEventListener('click', event => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (pageName !== activePageName) {
                            setActiveVisualizationPage(pageName);
                        }
                    });
                    pageList.appendChild(pageButton);
                });
            }

            if (pageList.childElementCount > 0) {
                navigation.appendChild(pageList);
            }

            const resources = useKoreanLanguage ? visualizationTextResources.ko : visualizationTextResources.en;
            if (!deployedRuntimeMode || ldMonitor.isFeatureEnabled()) {
                const monitorButton = document.createElement('button');
                monitorButton.type = 'button';
                monitorButton.className = 'runtime-page-button runtime-monitor-button';
                const monitorLabel = ldMonitor.isSplitMode()
                    ? (useKoreanLanguage ? '모니터링 중지' : 'Stop monitoring')
                    : (useKoreanLanguage ? '모니터링 시작' : 'Start monitoring');
                monitorButton.setAttribute('aria-label', monitorLabel);
                monitorButton.title = monitorLabel;
                monitorButton.setAttribute('aria-pressed', ldMonitor.isSplitMode() ? 'true' : 'false');
                if (ldMonitor.isSplitMode()) {
                    monitorButton.classList.add('active');
                }

                const monitorIcon = document.createElement('span');
                monitorIcon.className = 'runtime-monitor-icon';
                monitorIcon.setAttribute('aria-hidden', 'true');
                monitorButton.appendChild(monitorIcon);

                monitorButton.addEventListener('pointerdown', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (runtimeRunning || runtimeStarting) {
                        ldMonitor.setSplitMode(!ldMonitor.isSplitMode());
                    }
                });
                monitorButton.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                });
                navigation.appendChild(monitorButton);
            }

            if (!deployedRuntimeMode) {
                const exitButton = document.createElement('button');
                exitButton.type = 'button';
                exitButton.className = 'runtime-page-button runtime-exit-button';
                exitButton.textContent = resources.exit;
                exitButton.addEventListener('pointerdown', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (runtimeRunning || runtimeStarting) {
                        stopRuntime();
                    }
                });
                navigation.appendChild(exitButton);
            }

            if (navigation.childElementCount > 0) {
                if (workArea) {
                    workArea.classList.add('runtime-pages-visible');
                    workArea.appendChild(navigation);
                } else {
                    designSurface.appendChild(navigation);
                }
            }
        }

        function removeRuntimePageNavigationElement() {
            if (workArea) {
                workArea.classList.remove('runtime-pages-visible');
                workArea.querySelectorAll('.runtime-page-navigation').forEach(element => element.remove());
            }
            designSurface.querySelectorAll('.runtime-page-navigation').forEach(element => element.remove());
        }

        window.onVisualizationLdJsonResult = ldMonitor.onLdJsonResult;

        function renderButtonWidget(widget) {
            const themeDefaults = getThemeColorDefaults();
            const element = document.createElement('div');
            element.className = 'design-widget design-widget-button';
            const isRuntimePressed = runtimePressedWidgetIds.has(widget.id);
            if (!isWidgetDisplayVisible(widget)) {
                element.classList.add('display-hidden');
            }
            if (isWidgetSelected(widget)) {
                element.classList.add('selected');
            }
            if (isRuntimePressed) {
                element.classList.add('runtime-pressed');
            }

            element.dataset.widgetId = widget.id;
            applyWidgetBounds(element, widget);
            const buttonInset = 4;
            const baseLeft = parseFloat(element.style.left || '0');
            const baseTop = parseFloat(element.style.top || '0');
            const baseWidth = parseFloat(element.style.width || '0');
            const baseHeight = parseFloat(element.style.height || '0');
            const nextWidth = Math.max(8, baseWidth - buttonInset * 2);
            const nextHeight = Math.max(8, baseHeight - buttonInset * 2);
            element.style.left = `${baseLeft + buttonInset}px`;
            element.style.top = `${baseTop + buttonInset}px`;
            element.style.width = `${nextWidth}px`;
            element.style.height = `${nextHeight}px`;
            if (isRuntimePressed) {
                element.style.left = `${parseFloat(element.style.left || '0') + 1}px`;
                element.style.top = `${parseFloat(element.style.top || '0') + 1}px`;
                element.style.background = darkenCssColor(widget.properties.BackColor || themeDefaults.buttonBack, 0.78);
            } else {
                element.style.background = widget.properties.BackColor || themeDefaults.buttonBack;
            }
            element.style.color = widget.properties.ForeColor || themeDefaults.buttonFore;
            element.style.borderRadius = isRoundEnabled(widget.properties.Round) ? '14px' : '3px';
            element.style.fontSize = `${toNumber(widget.properties['Text Size'], 12)}px`;
            element.style.fontWeight = '700';
            element.style.lineHeight = '1.1';

            const label = document.createElement('span');
            label.textContent = widget.properties.Text || widget.properties.Name || 'Button';
            element.appendChild(label);

            const lampMode = normalizeButtonLampMode(widget.properties.Lamp);
            if (lampMode === 'On') {
                const lamp = document.createElement('span');
                lamp.className = 'button-lamp-indicator';
                const lampColor = normalizeCssColor(widget.properties.LampColor || themeDefaults.buttonLamp) || themeDefaults.buttonLamp;
                const lampAddress = getButtonLampRuntimeAddress(widget);
                const lampValue = lampAddress && runtimeValues.has(lampAddress)
                    ? Number(runtimeValues.get(lampAddress))
                    : 0;
                const lampOn = runtimeRunning && Number.isFinite(lampValue) && lampValue !== 0;
                lamp.style.setProperty('--lamp-color', lampColor);
                lamp.classList.toggle('is-on', lampOn);
                element.appendChild(lamp);
            }

            if (isWidgetSelected(widget)) {
                const outline = document.createElement('div');
                outline.className = 'selection-outline';
                element.appendChild(outline);

                if (selectedWidgetIds.length === 1) {
                    ['nw', 'ne', 'sw', 'se'].forEach(position => {
                        const handle = document.createElement('div');
                        handle.className = `resize-handle ${position}`;
                        handle.dataset.handle = position;
                        handle.addEventListener('pointerdown', event => beginResize(event, widget, position));
                        element.appendChild(handle);
                    });
                }
            }

            element.addEventListener('click', event => {
                event.stopPropagation();
                if (runtimeRunning) {
                    event.preventDefault();
                    return;
                }

                if (event.shiftKey || event.ctrlKey || event.metaKey) {
                    if (isWidgetSelected(widget)) {
                        removeSelectedWidget(widget.id);
                    } else {
                        addSelectedWidget(widget.id);
                    }
                } else {
                    setSelectedWidgets([widget.id]);
                }
                renderWidgets();
            });

            element.addEventListener('pointerdown', event => {
                if (runtimeRunning) {
                    beginRuntimeMomentaryButton(event, widget, element);
                    return;
                }

                if (event.target.classList.contains('resize-handle')) {
                    return;
                }

                const now = window.performance.now();
                const isDoubleClick = lastWidgetPointerDown.widgetId === widget.id &&
                    now - lastWidgetPointerDown.time <= 500;
                lastWidgetPointerDown = { widgetId: widget.id, time: now };

                if (event.shiftKey || event.ctrlKey || event.metaKey) {
                    if (isWidgetSelected(widget)) {
                        removeSelectedWidget(widget.id);
                    } else {
                        addSelectedWidget(widget.id);
                    }
                    renderWidgets();
                    return;
                }

                if (!isWidgetSelected(widget)) {
                    setSelectedWidgets([widget.id]);
                } else {
                    selectedWidgetId = widget.id;
                }

                if (isDoubleClick) {
                    event.preventDefault();
                    renderWidgets();
                    requestAddressInput(widget);
                    return;
                }

                beginMove(event, widget);
            });

            element.addEventListener('mousedown', event => {
                if (!runtimeRunning || event.button !== 0) {
                    return;
                }

                beginRuntimeMomentaryButton(event, widget, element);
            });

            element.addEventListener('touchstart', event => {
                if (!runtimeRunning) {
                    return;
                }

                beginRuntimeMomentaryButton(event, widget, element);
            }, { passive: false });

            return element;
        }

        function renderGaugeWidget(widget) {
            const themeDefaults = getThemeColorDefaults();
            const isLightTheme = currentThemeMode === 'light';
            const runtimeValue = getRuntimeWidgetValue(widget);
            if (runtimeRunning && runtimeValue !== null) {
                widget.properties.Value = String(runtimeValue);
            }

            normalizeSliderRangeProperties(widget);
            const gaugeType = normalizeGaugeType(widget.properties['Gauge Type']);
            widget.properties['Gauge Type'] = gaugeType;

            const element = document.createElement('div');
            element.className = 'design-widget design-widget-gauge';
            if (isWidgetSelected(widget)) {
                element.classList.add('selected');
            }

            element.dataset.widgetId = widget.id;
            applyWidgetBounds(element, widget);

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('gauge-face');
            svg.setAttribute('viewBox', '0 0 120 120');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.setAttribute('aria-hidden', 'true');

            const minimum = getSliderMinimum(widget);
            const maximum = getSliderMaximum(widget);
            const value = getSliderValue(widget);
            const gaugeUnit = normalizeNumberUnit(widget.properties.Unit);
            const ratio = maximum <= minimum ? 0 : Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)));

            if (gaugeType === 'Line') {
                const gaugeColor = normalizeCssColor(widget.properties.Color || widget.properties.DisplayColor) || themeDefaults.gaugeDisplay;
                const centerX = 60;
                const centerY = 60;
                const startAngle = 140;
                const endAngle = 400;
                const angleSpan = endAngle - startAngle;
                const trackRadius = 47;

                const angleToPoint = (angleDeg, radius) => {
                    const angle = (Math.PI / 180) * angleDeg;
                    return {
                        x: centerX + (Math.cos(angle) * radius),
                        y: centerY + (Math.sin(angle) * radius)
                    };
                };

                const createArcPath = (fromAngle, toAngle, radius) => {
                    const from = angleToPoint(fromAngle, radius);
                    const to = angleToPoint(toAngle, radius);
                    const largeArcFlag = Math.abs(toAngle - fromAngle) > 180 ? 1 : 0;
                    const sweepFlag = toAngle >= fromAngle ? 1 : 0;
                    return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${to.x} ${to.y}`;
                };

                const track = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                track.setAttribute('d', createArcPath(startAngle, endAngle, trackRadius));
                track.setAttribute('fill', 'none');
                track.setAttribute('stroke', isLightTheme ? '#cfd4da' : '#aab0b7');
                track.setAttribute('stroke-width', '2.2');
                track.setAttribute('stroke-linecap', 'round');
                svg.appendChild(track);

                const valueAngleDeg = startAngle + (angleSpan * ratio);
                if (ratio > 0) {
                    const activeTrack = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    activeTrack.setAttribute('d', createArcPath(startAngle, valueAngleDeg, trackRadius));
                    activeTrack.setAttribute('fill', 'none');
                    activeTrack.setAttribute('stroke', gaugeColor);
                    activeTrack.setAttribute('stroke-width', '2.2');
                    activeTrack.setAttribute('stroke-linecap', 'round');
                    svg.appendChild(activeTrack);
                }

                [0, 0.5, 1].forEach(t => {
                    const tickAngleDeg = startAngle + (angleSpan * t);
                    const outer = angleToPoint(tickAngleDeg, 50);
                    const inner = angleToPoint(tickAngleDeg, 42);
                    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    tick.setAttribute('x1', String(inner.x));
                    tick.setAttribute('y1', String(inner.y));
                    tick.setAttribute('x2', String(outer.x));
                    tick.setAttribute('y2', String(outer.y));
                    tick.setAttribute('stroke', 'color-mix(in srgb, var(--text) 78%, transparent)');
                    tick.setAttribute('stroke-width', '1.6');
                    tick.setAttribute('stroke-linecap', 'round');
                    svg.appendChild(tick);
                });

                const valuePoint = angleToPoint(valueAngleDeg, 35);
                const basePoint = angleToPoint(valueAngleDeg, 8);
                const valueAngle = (Math.PI / 180) * valueAngleDeg;
                const px = -Math.sin(valueAngle);
                const py = Math.cos(valueAngle);
                const halfWidth = 3.1;
                const needle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                needle.setAttribute('points', `${valuePoint.x},${valuePoint.y} ${basePoint.x + (px * halfWidth)},${basePoint.y + (py * halfWidth)} ${basePoint.x - (px * halfWidth)},${basePoint.y - (py * halfWidth)}`);
                needle.setAttribute('fill', gaugeColor);
                svg.appendChild(needle);

                const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                center.setAttribute('cx', String(centerX));
                center.setAttribute('cy', String(centerY));
                center.setAttribute('r', '3.1');
                center.setAttribute('fill', 'color-mix(in srgb, var(--text) 85%, transparent)');
                svg.appendChild(center);

                const minLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                minLabel.setAttribute('x', '3');
                minLabel.setAttribute('y', '102');
                minLabel.setAttribute('text-anchor', 'start');
                minLabel.setAttribute('fill', 'color-mix(in srgb, var(--text) 84%, transparent)');
                minLabel.setAttribute('font-size', '9');
                minLabel.setAttribute('font-weight', '700');
                minLabel.textContent = formatProgressRangeLabel(minimum);
                svg.appendChild(minLabel);

                const maxLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                maxLabel.setAttribute('x', '117');
                maxLabel.setAttribute('y', '102');
                maxLabel.setAttribute('text-anchor', 'end');
                maxLabel.setAttribute('fill', 'color-mix(in srgb, var(--text) 84%, transparent)');
                maxLabel.setAttribute('font-size', '9');
                maxLabel.setAttribute('font-weight', '700');
                maxLabel.textContent = formatProgressRangeLabel(maximum);
                svg.appendChild(maxLabel);

                const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                valueText.setAttribute('x', String(centerX));
                valueText.setAttribute('y', '116');
                valueText.setAttribute('text-anchor', 'middle');
                valueText.setAttribute('fill', 'color-mix(in srgb, var(--text) 96%, transparent)');
                valueText.setAttribute('font-size', '16');
                valueText.setAttribute('font-weight', '700');
                valueText.textContent = formatValueWithUnit(Math.round(value * 10) / 10, gaugeUnit);
                svg.appendChild(valueText);

                element.appendChild(svg);
                appendWidgetSelectionChrome(element, widget);
                attachWidgetInteractionHandlers(element, widget);
                return element;
            }

            if (gaugeType === 'Simple') {
                svg.setAttribute('viewBox', '0 0 120 98');
                const gaugeColor = normalizeCssColor(widget.properties.Color || widget.properties.DisplayColor) || themeDefaults.gaugeDisplay;
                const simpleTrackColor = isLightTheme ? '#d4d8dd' : '#c2c4c7';
                const simpleFillColor = isLightTheme ? '#22c55e' : '#14cf14';
                const arcCenterX = 60;
                const arcCenterY = 70;
                const arcRadius = 52;
                const arcLeftX = arcCenterX - arcRadius;
                const arcRightX = arcCenterX + arcRadius;
                const simpleTrack = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                simpleTrack.setAttribute('d', `M ${arcLeftX} ${arcCenterY} A ${arcRadius} ${arcRadius} 0 0 1 ${arcRightX} ${arcCenterY}`);
                simpleTrack.setAttribute('fill', 'none');
                simpleTrack.setAttribute('stroke', simpleTrackColor);
                simpleTrack.setAttribute('stroke-width', '17');
                simpleTrack.setAttribute('stroke-linecap', 'butt');
                simpleTrack.setAttribute('pathLength', '100');
                svg.appendChild(simpleTrack);

                const simpleValue = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                simpleValue.setAttribute('d', `M ${arcLeftX} ${arcCenterY} A ${arcRadius} ${arcRadius} 0 0 1 ${arcRightX} ${arcCenterY}`);
                simpleValue.setAttribute('fill', 'none');
                simpleValue.setAttribute('stroke', simpleFillColor);
                simpleValue.setAttribute('stroke-width', '17');
                simpleValue.setAttribute('stroke-linecap', 'butt');
                simpleValue.setAttribute('pathLength', '100');
                simpleValue.setAttribute('stroke-dasharray', `${Math.max(0.001, ratio * 100)} 100`);
                svg.appendChild(simpleValue);

                const angle = Math.PI - (Math.PI * ratio);
                const tipRadius = arcRadius;
                const nx = arcCenterX + (Math.cos(angle) * tipRadius);
                const ny = arcCenterY - (Math.sin(angle) * tipRadius);
                const vx = Math.cos(angle);
                const vy = -Math.sin(angle);
                const px = -vy;
                const py = vx;
                const baseDistance = 9;
                const baseHalfWidth = 1.5;
                const bx = arcCenterX + (vx * baseDistance);
                const by = arcCenterY + (vy * baseDistance);

                const needle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                needle.setAttribute('points', `${nx},${ny} ${bx + (px * baseHalfWidth)},${by + (py * baseHalfWidth)} ${bx - (px * baseHalfWidth)},${by - (py * baseHalfWidth)}`);
                needle.setAttribute('fill', gaugeColor);
                svg.appendChild(needle);

                const hub = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                hub.setAttribute('cx', String(arcCenterX));
                hub.setAttribute('cy', String(arcCenterY));
                hub.setAttribute('r', '1.9');
                hub.setAttribute('fill', 'color-mix(in srgb, var(--text) 90%, transparent)');
                svg.appendChild(hub);

                const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                valueText.setAttribute('x', String(arcCenterX));
                valueText.setAttribute('y', '96');
                valueText.setAttribute('text-anchor', 'middle');
                valueText.setAttribute('fill', 'color-mix(in srgb, var(--text) 96%, transparent)');
                valueText.setAttribute('font-size', '14');
                valueText.setAttribute('font-weight', '700');
                valueText.textContent = formatValueWithUnit(Math.round(value * 10) / 10, gaugeUnit);
                svg.appendChild(valueText);

                const minLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                minLabel.setAttribute('x', String(arcLeftX + 1));
                minLabel.setAttribute('y', '80');
                minLabel.setAttribute('text-anchor', 'start');
                minLabel.setAttribute('fill', 'color-mix(in srgb, var(--text) 80%, transparent)');
                minLabel.setAttribute('font-size', '9');
                minLabel.setAttribute('font-weight', '700');
                minLabel.textContent = String(Math.round(minimum));
                svg.appendChild(minLabel);

                const maxLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                maxLabel.setAttribute('x', String(arcRightX + 3));
                maxLabel.setAttribute('y', '80');
                maxLabel.setAttribute('text-anchor', 'end');
                maxLabel.setAttribute('fill', 'color-mix(in srgb, var(--text) 80%, transparent)');
                maxLabel.setAttribute('font-size', '9');
                maxLabel.setAttribute('font-weight', '700');
                maxLabel.textContent = String(Math.round(maximum));
                svg.appendChild(maxLabel);

                element.appendChild(svg);
                appendWidgetSelectionChrome(element, widget);
                attachWidgetInteractionHandlers(element, widget);
                return element;
            }

            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

            const rimGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            rimGradient.setAttribute('id', `gaugeRim-${widget.id}`);
            rimGradient.setAttribute('cx', '38%');
            rimGradient.setAttribute('cy', '30%');
            rimGradient.setAttribute('r', '72%');

            const rimStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            rimStop1.setAttribute('offset', '0%');
            rimStop1.setAttribute('stop-color', isLightTheme ? '#ffffff' : '#f6f6f6');
            rimGradient.appendChild(rimStop1);

            const rimStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            rimStop2.setAttribute('offset', '34%');
            rimStop2.setAttribute('stop-color', isLightTheme ? '#d5dae0' : '#bfc3c7');
            rimGradient.appendChild(rimStop2);

            const rimStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            rimStop3.setAttribute('offset', '72%');
            rimStop3.setAttribute('stop-color', isLightTheme ? '#aab2bc' : '#8c9197');
            rimGradient.appendChild(rimStop3);

            const rimStop4 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            rimStop4.setAttribute('offset', '100%');
            rimStop4.setAttribute('stop-color', isLightTheme ? '#eef2f6' : '#d8dcdf');
            rimGradient.appendChild(rimStop4);
            defs.appendChild(rimGradient);

            const dialGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
            dialGradient.setAttribute('id', `gaugeDial-${widget.id}`);
            dialGradient.setAttribute('cx', '42%');
            dialGradient.setAttribute('cy', '34%');
            dialGradient.setAttribute('r', '78%');

            const dialStop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            dialStop1.setAttribute('offset', '0%');
            dialStop1.setAttribute('stop-color', isLightTheme ? '#fafbfc' : '#b7b9bc');
            dialGradient.appendChild(dialStop1);

            const dialStop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            dialStop2.setAttribute('offset', '58%');
            dialStop2.setAttribute('stop-color', isLightTheme ? '#e5e9ee' : '#92959a');
            dialGradient.appendChild(dialStop2);

            const dialStop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            dialStop3.setAttribute('offset', '100%');
            dialStop3.setAttribute('stop-color', isLightTheme ? '#d2d9e0' : '#83878d');
            dialGradient.appendChild(dialStop3);
            defs.appendChild(dialGradient);

            svg.appendChild(defs);

            const rim = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            rim.setAttribute('cx', '60');
            rim.setAttribute('cy', '60');
            rim.setAttribute('r', '56');
            rim.setAttribute('fill', `url(#gaugeRim-${widget.id})`);
            rim.setAttribute('stroke', isLightTheme ? '#cfd6dd' : '#eceff2');
            rim.setAttribute('stroke-width', '1.2');
            svg.appendChild(rim);

            const dial = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dial.setAttribute('cx', '60');
            dial.setAttribute('cy', '60');
            dial.setAttribute('r', '48');
            dial.setAttribute('fill', `url(#gaugeDial-${widget.id})`);
            dial.setAttribute('stroke', isLightTheme ? '#c4ccd5' : '#6f747b');
            dial.setAttribute('stroke-width', '0.8');
            svg.appendChild(dial);

            const dialInnerShade = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dialInnerShade.setAttribute('cx', '60');
            dialInnerShade.setAttribute('cy', '60');
            dialInnerShade.setAttribute('r', '34');
            dialInnerShade.setAttribute('fill', isLightTheme ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.08)');
            svg.appendChild(dialInnerShade);

            const startAngle = 140;
            const endAngle = 400;
            const angleSpan = endAngle - startAngle;

            for (let i = 0; i <= 12; i += 1) {
                const t = i / 12;
                const angleDeg = startAngle + (angleSpan * t);
                const angle = (Math.PI / 180) * angleDeg;
                const x1 = 60 + (Math.cos(angle) * 38);
                const y1 = 60 + (Math.sin(angle) * 38);
                const x2 = 60 + (Math.cos(angle) * 47);
                const y2 = 60 + (Math.sin(angle) * 47);

                const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                tick.setAttribute('x1', String(x1));
                tick.setAttribute('y1', String(y1));
                tick.setAttribute('x2', String(x2));
                tick.setAttribute('y2', String(y2));
                tick.setAttribute('stroke', 'color-mix(in srgb, var(--text) 78%, transparent)');
                tick.setAttribute('stroke-width', i % 2 === 0 ? '2.2' : '1.3');
                tick.setAttribute('stroke-linecap', 'round');
                svg.appendChild(tick);

                const labelValue = minimum + ((maximum - minimum) * t);
                const lx = 60 + (Math.cos(angle) * 30);
                const ly = 60 + (Math.sin(angle) * 30) + 2;
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', String(lx));
                label.setAttribute('y', String(ly + 4));
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('fill', isLightTheme ? '#1f2a36' : '#111111');
                label.setAttribute('font-size', '6');
                const roundedLabelValue = Math.round(labelValue * 10) / 10;
                label.textContent = maximum >= 200
                    ? String(Math.round(labelValue))
                    : Number.isInteger(roundedLabelValue)
                    ? String(roundedLabelValue)
                    : roundedLabelValue.toFixed(1);
                svg.appendChild(label);
            }

            const valueAngle = (Math.PI / 180) * (startAngle + (angleSpan * ratio));
            const nx = 60 + (Math.cos(valueAngle) * 33);
            const ny = 60 + (Math.sin(valueAngle) * 33);

            const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            needle.setAttribute('x1', '60');
            needle.setAttribute('y1', '60');
            needle.setAttribute('x2', String(nx));
            needle.setAttribute('y2', String(ny));
            needle.setAttribute('stroke', normalizeCssColor(widget.properties.Color || widget.properties.DisplayColor) || themeDefaults.gaugeDisplay);
            needle.setAttribute('stroke-width', '2.4');
            needle.setAttribute('stroke-linecap', 'round');
            svg.appendChild(needle);

            const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            center.setAttribute('cx', '60');
            center.setAttribute('cy', '60');
            center.setAttribute('r', '3.2');
            center.setAttribute('fill', 'color-mix(in srgb, var(--text) 85%, transparent)');
            svg.appendChild(center);

            const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            valueText.setAttribute('x', '60');
            valueText.setAttribute('y', '96');
            valueText.setAttribute('text-anchor', 'middle');
            valueText.setAttribute('fill', 'var(--text)');
            valueText.setAttribute('font-size', '10');
            valueText.textContent = formatValueWithUnit(value, gaugeUnit);
            svg.appendChild(valueText);

            element.appendChild(svg);
            appendWidgetSelectionChrome(element, widget);
            attachWidgetInteractionHandlers(element, widget);

            return element;
        }

        function renderLampWidget(widget) {
            const themeDefaults = getThemeColorDefaults();
            const isLightTheme = currentThemeMode === 'light';
            const element = document.createElement('div');
            element.className = 'design-widget design-widget-lamp';
            const runtimeValue = getRuntimeWidgetValue(widget);
            if (!isWidgetDisplayVisible(widget)) {
                element.classList.add('display-hidden');
            }
            if (isWidgetSelected(widget)) {
                element.classList.add('selected');
            }

            element.dataset.widgetId = widget.id;
            applyWidgetBounds(element, widget);

            const lampContent = document.createElement('div');
            lampContent.className = 'lamp-content';
            if (isLampBorderEnabled(widget.properties.Border)) {
                lampContent.classList.add('border-on');
                lampContent.style.backgroundColor = getWidgetBorderBackColor(widget);
            }

            const text = String(widget.properties.Text || '').trim();
            if (text) {
                const label = document.createElement('div');
                label.className = 'lamp-label';
                label.textContent = text;
                label.style.fontSize = `${toNumber(widget.properties['Text Size'], 16)}px`;
                lampContent.appendChild(label);
            }

            const plate = document.createElement('div');
            plate.className = 'lamp-plate';

            const bulb = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            bulb.classList.add('lamp-bulb');
            bulb.setAttribute('viewBox', '0 0 100 100');
            bulb.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            bulb.setAttribute('aria-hidden', 'true');
            const lampColor = normalizeCssColor(widget.properties.DisplayColor) || themeDefaults.lampDisplay;
            const lampSize = parseLampSizePercent(widget.properties['Lamp Size']);
            bulb.style.setProperty('--lamp-size-scale', String(lampSize / 100));
            const isRuntimeOn = runtimeRunning && runtimeValue !== null && runtimeValue !== 0;
            if (isRuntimeOn) {
                plate.classList.add('runtime-on');
                plate.style.setProperty('--lamp-size-scale', String(lampSize / 100));
                plate.style.setProperty('--lamp-glow-color', lampColor);
                bulb.classList.add('runtime-on');
                bulb.style.setProperty('--lamp-glow-color', lampColor);
            }

            if (isRuntimeOn) {
                const gradientId = `lampGradient-${String(widget.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
                const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
                gradient.setAttribute('id', gradientId);
                gradient.setAttribute('cx', isLightTheme ? '46%' : '38%');
                gradient.setAttribute('cy', isLightTheme ? '40%' : '30%');
                gradient.setAttribute('r', isLightTheme ? '70%' : '74%');

                const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                highlight.setAttribute('offset', '0%');
                highlight.setAttribute('stop-color', isLightTheme ? `color-mix(in srgb, ${lampColor} 96%, #ffffff 4%)` : '#ffffff');
                highlight.setAttribute('stop-opacity', isLightTheme ? '0.14' : '1');
                gradient.appendChild(highlight);

                const glow = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                glow.setAttribute('offset', '18%');
                glow.setAttribute('stop-color', isLightTheme ? `color-mix(in srgb, ${lampColor} 94%, #ffffff 6%)` : '#fff7d6');
                glow.setAttribute('stop-opacity', isLightTheme ? '0.05' : '0.88');
                gradient.appendChild(glow);

                const mid = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                mid.setAttribute('offset', '48%');
                mid.setAttribute('stop-color', lampColor);
                mid.setAttribute('stop-opacity', '1');
                gradient.appendChild(mid);

                const edge = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                edge.setAttribute('offset', '100%');
                edge.setAttribute('stop-color', lampColor);
                edge.setAttribute('stop-opacity', isLightTheme ? '0.78' : '0.86');
                gradient.appendChild(edge);

                defs.appendChild(gradient);
                bulb.appendChild(defs);
            }

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.classList.add('lamp-bulb-circle');
            circle.setAttribute('cx', '50');
            circle.setAttribute('cy', '50');
            circle.setAttribute('r', '47');
            const lampOffFill = isLightTheme
                ? `color-mix(in srgb, ${lampColor} 24%, #8f8f8f 76%)`
                : `color-mix(in srgb, ${lampColor} 24%, #202020 76%)`;
            circle.setAttribute('fill', isRuntimeOn ? `url(#lampGradient-${String(widget.id).replace(/[^a-zA-Z0-9_-]/g, '')})` : lampOffFill);
            circle.setAttribute('fill-opacity', runtimeRunning && runtimeValue !== null && runtimeValue === 0 ? '0.68' : '1');
            bulb.appendChild(circle);
            plate.appendChild(bulb);
            lampContent.appendChild(plate);
            element.appendChild(lampContent);

            appendWidgetSelectionChrome(element, widget);
            attachWidgetInteractionHandlers(element, widget);

            return element;
        }

        function renderToggleWidget(widget) {
            const themeDefaults = getThemeColorDefaults();
            const element = document.createElement('div');
            element.className = 'design-widget design-widget-toggle';
            const runtimeValue = getRuntimeWidgetValue(widget);
            const isRuntimeOff = runtimeRunning && runtimeValue !== null && runtimeValue === 0;
            if (isWidgetSelected(widget)) {
                element.classList.add('selected');
            }

            element.dataset.widgetId = widget.id;
            applyWidgetBounds(element, widget);

            const toggleContent = document.createElement('div');
            toggleContent.className = 'toggle-content';
            if (isLampBorderEnabled(widget.properties.Border)) {
                toggleContent.classList.add('border-on');
                toggleContent.style.backgroundColor = getWidgetBorderBackColor(widget);
            }

            const text = String(widget.properties.Text || '').trim();
            if (text) {
                const label = document.createElement('div');
                label.className = 'toggle-label';
                label.textContent = text;
                label.style.fontSize = `${toNumber(widget.properties['Text Size'], 16)}px`;
                toggleContent.appendChild(label);
            }

            const plate = document.createElement('div');
            plate.className = 'toggle-plate';

            const body = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            body.classList.add('toggle-body');
            body.setAttribute('viewBox', '0 0 56 28');
            body.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            body.setAttribute('aria-hidden', 'true');

            const track = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            track.setAttribute('x', '0');
            track.setAttribute('y', '0');
            track.setAttribute('width', '56');
            track.setAttribute('height', '28');
            track.setAttribute('rx', '14');
            track.setAttribute('fill', isRuntimeOff ? 'color-mix(in srgb, var(--text) 45%, transparent)' : (normalizeCssColor(widget.properties.DisplayColor) || themeDefaults.toggleDisplay));
            track.setAttribute('opacity', '1');
            body.appendChild(track);

            const knob = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            knob.classList.add('toggle-knob');
            knob.setAttribute('cx', isRuntimeOff ? '14' : '42');
            knob.setAttribute('cy', '14');
            knob.setAttribute('r', '12');
            body.appendChild(knob);
            plate.appendChild(body);
            toggleContent.appendChild(plate);
            element.appendChild(toggleContent);

            appendWidgetSelectionChrome(element, widget);
            attachWidgetInteractionHandlers(element, widget);

            return element;
        }

        function renderNumberWidget(widget) {
            const themeDefaults = getThemeColorDefaults();
            const element = document.createElement('div');
            element.className = 'design-widget design-widget-number';
            if (!isWidgetDisplayVisible(widget)) {
                element.classList.add('display-hidden');
            }
            if (isWidgetSelected(widget)) {
                element.classList.add('selected');
            }

            element.dataset.widgetId = widget.id;
            applyWidgetBounds(element, widget);

            const marker = document.createElement('div');
            marker.className = 'number-marker';
            if (isNumberEditableEnabled(widget.properties.Editable)) {
                marker.classList.add('editable');
            }

            const value = document.createElement('span');
            value.className = 'number-value';
            const runtimeValue = getRuntimeWidgetValue(widget);
            value.textContent = runtimeRunning && runtimeValue !== null ? String(runtimeValue) : (widget.properties.Text || '123');
            value.style.color = normalizeCssColor(widget.properties.DisplayColor) || themeDefaults.numberDisplay;
            value.style.fontSize = `${toNumber(widget.properties['Text Size'], 24)}px`;
            marker.appendChild(value);

            const unitText = normalizeNumberUnit(widget.properties.Unit);
            if (unitText) {
                const unit = document.createElement('span');
                unit.className = 'number-unit';
                unit.textContent = `${isNumberUnitNoSpace(unitText) ? '' : ' '}${unitText}`;
                unit.style.color = normalizeCssColor(widget.properties.DisplayColor) || themeDefaults.numberDisplay;
                unit.style.fontSize = `${Math.max(4, toNumber(widget.properties['Text Size'], 24) * 0.8)}px`;
                marker.appendChild(unit);
            }

            element.appendChild(marker);
            element.addEventListener('pointerdown', event => {
                if (!runtimeRunning || !isNumberEditableEnabled(widget.properties.Editable)) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                showRuntimeNumberInput(widget);
            });

            appendWidgetSelectionChrome(element, widget);
            attachWidgetInteractionHandlers(element, widget);

            return element;
        }

        function renderTextWidget(widget) {
            const themeDefaults = getThemeColorDefaults();
            const element = document.createElement('div');
            element.className = 'design-widget design-widget-text';
            if (!isWidgetDisplayVisible(widget)) {
                element.classList.add('display-hidden');
            }
            if (isWidgetSelected(widget)) {
                element.classList.add('selected');
            }

            element.dataset.widgetId = widget.id;
            applyWidgetBounds(element, widget);
            if (isLampBorderEnabled(widget.properties.Border)) {
                element.style.backgroundColor = normalizeCssColor(widget.properties['Border Color']) || themeDefaults.textBorder;
                element.style.border = '1px solid transparent';
            } else {
                element.style.backgroundColor = 'transparent';
                element.style.border = '1px solid transparent';
            }

            const label = document.createElement('div');
            label.className = 'text-widget-label';
            label.textContent = widget.properties.Text || '';
            label.style.color = normalizeCssColor(widget.properties.DisplayColor) || themeDefaults.textDisplay;
            label.style.fontSize = `${toNumber(widget.properties['Text Size'], 18)}px`;
            label.style.textAlign = getTextCssAlignment(widget.properties.Alignment);
            label.style.justifyContent = getTextCssAlignment(widget.properties.Alignment);
            label.style.alignItems = getTextCssLocation(widget.properties.Location);
            element.appendChild(label);

            appendWidgetSelectionChrome(element, widget);
            attachWidgetInteractionHandlers(element, widget);

            return element;
        }

        function renderSliderWidget(widget) {
            const runtimeValue = getRuntimeWidgetValue(widget);
            if (runtimeRunning && runtimeValue !== null) {
                widget.properties.Value = String(runtimeValue);
            }

            const element = document.createElement('div');
            element.className = 'design-widget design-widget-slider';
            if (isWidgetSelected(widget)) {
                element.classList.add('selected');
            }

            element.dataset.widgetId = widget.id;
            applyWidgetBounds(element, widget);

            const direction = normalizeSliderDirection(widget.properties.Direction);
            element.classList.add(direction === 'Vertical' ? 'vertical' : 'horizontal');

            const track = document.createElement('div');
            track.className = 'slider-track';

            const fill = document.createElement('div');
            fill.className = 'slider-fill';
            const ratio = getSliderRatio(widget);
            if (direction === 'Vertical') {
                fill.style.height = `${ratio * 100}%`;
            } else {
                fill.style.width = `${ratio * 100}%`;
            }
            track.appendChild(fill);

            const knob = document.createElement('div');
            knob.className = 'slider-knob';
            if (direction === 'Vertical') {
                knob.style.bottom = getSliderKnobPositionStyle(ratio);
            } else {
                knob.style.left = getSliderKnobPositionStyle(ratio);
            }

            knob.addEventListener('pointerdown', event => beginRuntimeSliderDrag(event, widget, element));
            track.addEventListener('pointerdown', event => beginRuntimeSliderDrag(event, widget, element));
            element.addEventListener('pointerdown', event => {
                if (!runtimeRunning || event.target === track || event.target === knob) {
                    return;
                }

                if (isPointerNearSliderTrack(track, direction, event)) {
                    beginRuntimeSliderDrag(event, widget, element);
                }
            });

            element.appendChild(track);
            element.appendChild(knob);

            appendWidgetSelectionChrome(element, widget);
            attachWidgetInteractionHandlers(element, widget);

            return element;
        }

        function renderProgressBarWidget(widget) {
            const themeDefaults = getThemeColorDefaults();
            const runtimeValue = getRuntimeWidgetValue(widget);
            if (runtimeRunning && runtimeValue !== null) {
                widget.properties.Value = String(runtimeValue);
            }

            normalizeSliderRangeProperties(widget);

            const element = document.createElement('div');
            element.className = 'design-widget design-widget-progress';
            if (isWidgetSelected(widget)) {
                element.classList.add('selected');
            }

            element.dataset.widgetId = widget.id;
            applyWidgetBounds(element, widget);

            const direction = normalizeSliderDirection(widget.properties.Direction);
            const marking = normalizeProgressBarMarking(widget.properties.Marking);
            element.classList.add(direction === 'Vertical' ? 'vertical' : 'horizontal');
            element.classList.add(marking === 'Off' ? 'marking-off' : 'marking-on');

            const minimumText = formatProgressRangeLabel(widget.properties.Minimum);
            const maximumText = formatProgressRangeLabel(widget.properties.Maximum);
            const midText = formatProgressRangeLabel((toNumber(widget.properties.Minimum, 0) + toNumber(widget.properties.Maximum, 100)) / 2);
            const minLabel = document.createElement('span');
            minLabel.className = 'progress-range-label progress-range-min';
            minLabel.textContent = minimumText;
            const midLabel = document.createElement('span');
            midLabel.className = 'progress-range-label progress-range-mid';
            midLabel.textContent = midText;
            const maxLabel = document.createElement('span');
            maxLabel.className = 'progress-range-label progress-range-max';
            maxLabel.textContent = maximumText;

            const bar = document.createElement('div');
            bar.className = 'progress-bar-body';

            const fill = document.createElement('div');
            fill.className = 'progress-bar-fill';
            fill.style.backgroundColor = normalizeCssColor(widget.properties.DisplayColor) || themeDefaults.progressDisplay;
            const ratio = getSliderRatio(widget);
            if (direction === 'Vertical') {
                fill.style.height = `${ratio * 100}%`;
            } else {
                fill.style.width = `${ratio * 100}%`;
            }

            bar.appendChild(fill);
            element.appendChild(bar);
            if (marking === 'On') {
                element.appendChild(minLabel);
                element.appendChild(midLabel);
                element.appendChild(maxLabel);
            }

            appendWidgetSelectionChrome(element, widget);
            attachWidgetInteractionHandlers(element, widget);

            return element;
        }

        function formatProgressRangeLabel(value) {
            const numericValue = Number(value);
            if (!Number.isFinite(numericValue)) {
                return String(value || '0');
            }

            return Number.isInteger(numericValue) ? String(numericValue) : String(Math.round(numericValue * 10) / 10);
        }

        function appendWidgetSelectionChrome(element, widget) {
            if (!isWidgetSelected(widget)) {
                return;
            }

            const outline = document.createElement('div');
            outline.className = 'selection-outline';
            element.appendChild(outline);

            if (selectedWidgetIds.length === 1) {
                ['nw', 'ne', 'sw', 'se'].forEach(position => {
                    const handle = document.createElement('div');
                    handle.className = `resize-handle ${position}`;
                    handle.dataset.handle = position;
                    handle.addEventListener('pointerdown', event => beginResize(event, widget, position));
                    element.appendChild(handle);
                });
            }
        }

        function attachWidgetInteractionHandlers(element, widget) {
            element.addEventListener('click', event => {
                event.stopPropagation();
                if (deployedRuntimeMode && !runtimeRunning) {
                    return;
                }
                if (runtimeRunning) {
                    handleRuntimeWidgetClick(widget);
                    return;
                }

                if (event.shiftKey || event.ctrlKey || event.metaKey) {
                    if (isWidgetSelected(widget)) {
                        removeSelectedWidget(widget.id);
                    } else {
                        addSelectedWidget(widget.id);
                    }
                } else {
                    setSelectedWidgets([widget.id]);
                }
                renderWidgets();
            });

            element.addEventListener('pointerdown', event => {
                if (deployedRuntimeMode && !runtimeRunning) {
                    return;
                }
                if (runtimeRunning) {
                    if (widget.kind === 'Toggle') {
                        event.preventDefault();
                        event.stopPropagation();
                        handleRuntimeWidgetClick(widget);
                    } else if (widget.kind === 'Number' && isNumberEditableEnabled(widget.properties.Editable)) {
                        event.preventDefault();
                        event.stopPropagation();
                        showRuntimeNumberInput(widget);
                    }

                    return;
                }

                if (event.target.classList.contains('resize-handle')) {
                    return;
                }

                const now = window.performance.now();
                const isDoubleClick = lastWidgetPointerDown.widgetId === widget.id &&
                    now - lastWidgetPointerDown.time <= 500;
                lastWidgetPointerDown = { widgetId: widget.id, time: now };

                if (event.shiftKey || event.ctrlKey || event.metaKey) {
                    if (isWidgetSelected(widget)) {
                        removeSelectedWidget(widget.id);
                    } else {
                        addSelectedWidget(widget.id);
                    }
                    renderWidgets();
                    return;
                }

                if (!isWidgetSelected(widget)) {
                    setSelectedWidgets([widget.id]);
                } else {
                    selectedWidgetId = widget.id;
                }

                if (isDoubleClick) {
                    event.preventDefault();
                    renderWidgets();
                    requestAddressInput(widget);
                    return;
                }

                beginMove(event, widget);
            });
        }

        function beginMove(event, widget) {
            event.preventDefault();
            event.stopPropagation();

            const movingWidgets = getCurrentPage().widgets
                .filter(item => selectedWidgetIds.includes(item.id))
                .map(item => ({
                    widgetId: item.id,
                    startCellX: item.cellX,
                    startCellY: item.cellY
                }));

            activeMove = {
                hasChanged: false,
                beforeSnapshot: createHistorySnapshot(),
                widgetId: widget.id,
                startPointerX: event.clientX,
                startPointerY: event.clientY,
                startCellX: widget.cellX,
                startCellY: widget.cellY,
                widgets: movingWidgets.length > 0 ? movingWidgets : [{ widgetId: widget.id, startCellX: widget.cellX, startCellY: widget.cellY }],
                snappedDeltaX: 0,
                snappedDeltaY: 0
            };

            event.currentTarget.setPointerCapture(event.pointerId);
            window.addEventListener('pointermove', moveSelectedWidget);
            window.addEventListener('pointerup', endMoveSelectedWidget, { once: true });
        }

        function moveSelectedWidget(event) {
            if (!activeMove) {
                return;
            }

            const widget = getCurrentPage().widgets.find(item => item.id === activeMove.widgetId);
            if (!widget) {
                return;
            }

            const rect = designSurface.getBoundingClientRect();
            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            const cellWidth = rect.width / gridX;
            const cellHeight = rect.height / gridY;
            const snappedDeltaX = Math.round((event.clientX - activeMove.startPointerX) / cellWidth);
            const snappedDeltaY = Math.round((event.clientY - activeMove.startPointerY) / cellHeight);
            activeMove.snappedDeltaX = snappedDeltaX;
            activeMove.snappedDeltaY = snappedDeltaY;

            const widgetWidth = Math.max(1, widget.cellWidth);
            const widgetHeight = Math.max(1, widget.cellHeight);
            const nextX = Math.max(0, Math.min(gridX - widgetWidth, activeMove.startCellX + snappedDeltaX));
            const nextY = Math.max(0, Math.min(gridY - widgetHeight, activeMove.startCellY + snappedDeltaY));
            const boundedDeltaX = nextX - activeMove.startCellX;
            const boundedDeltaY = nextY - activeMove.startCellY;

            if (nextX === widget.cellX && nextY === widget.cellY) {
                return;
            }

            if (!canMoveWidgets(activeMove.widgets, boundedDeltaX, boundedDeltaY)) {
                return;
            }

            activeMove.widgets.forEach(moveItem => {
                const movingWidget = getCurrentPage().widgets.find(item => item.id === moveItem.widgetId);
                if (!movingWidget) {
                    return;
                }

                const movedX = moveItem.startCellX + boundedDeltaX;
                const movedY = moveItem.startCellY + boundedDeltaY;
                movingWidget.cellX = movedX;
                movingWidget.cellY = movedY;
                movingWidget.properties.X = String(movedX);
                movingWidget.properties.Y = String(movedY);
            });

            activeMove.hasChanged = true;

            renderWidgets();
        }

        function canMoveWidgets(moveItems, deltaX, deltaY) {
            const page = getCurrentPage();
            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            const movingIds = new Set(moveItems.map(item => item.widgetId));
            const movedRects = [];

            for (const moveItem of moveItems) {
                const widget = page.widgets.find(item => item.id === moveItem.widgetId);
                if (!widget) {
                    return false;
                }

                const rect = {
                    id: widget.id,
                    x: moveItem.startCellX + deltaX,
                    y: moveItem.startCellY + deltaY,
                    width: Math.max(1, widget.cellWidth),
                    height: Math.max(1, widget.cellHeight)
                };

                if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > gridX || rect.y + rect.height > gridY) {
                    return false;
                }

                if (page.widgets.some(other => {
                    if (movingIds.has(other.id)) {
                        return false;
                    }

                    return rectanglesOverlap(rect, {
                        x: other.cellX,
                        y: other.cellY,
                        width: Math.max(1, other.cellWidth),
                        height: Math.max(1, other.cellHeight)
                    });
                })) {
                    return false;
                }

                if (movedRects.some(other => rectanglesOverlap(rect, other))) {
                    return false;
                }

                movedRects.push(rect);
            }

            return true;
        }

        function rectanglesOverlap(first, second) {
            return first.x < second.x + second.width &&
                first.x + first.width > second.x &&
                first.y < second.y + second.height &&
                first.y + first.height > second.y;
        }

        function endMoveSelectedWidget() {
            if (activeMove && activeMove.hasChanged) {
                pushUndoSnapshot(activeMove.beforeSnapshot);
            }
            activeMove = null;
            window.removeEventListener('pointermove', moveSelectedWidget);
        }

        function beginResize(event, widget, handle) {
            event.preventDefault();
            event.stopPropagation();

            selectedWidgetId = widget.id;
            activeResize = {
                beforeSnapshot: createHistorySnapshot(),
                hasChanged: false,
                widgetId: widget.id,
                handle,
                startPointerX: event.clientX,
                startPointerY: event.clientY,
                startCellX: widget.cellX,
                startCellY: widget.cellY,
                startCellWidth: Math.max(1, widget.cellWidth),
                startCellHeight: Math.max(1, widget.cellHeight),
                snappedDeltaX: 0,
                snappedDeltaY: 0
            };

            resizeDragIndicator = document.createElement('div');
            resizeDragIndicator.className = 'resize-drag-indicator';
            document.body.appendChild(resizeDragIndicator);
            updateResizeDragIndicator(event);

            event.currentTarget.setPointerCapture(event.pointerId);
            window.addEventListener('pointermove', resizeSelectedWidget);
            window.addEventListener('pointerup', endResizeSelectedWidget, { once: true });
        }

        function resizeSelectedWidget(event) {
            if (!activeResize) {
                return;
            }

            updateResizeDragIndicator(event);

            const widget = getCurrentPage().widgets.find(item => item.id === activeResize.widgetId);
            if (!widget) {
                return;
            }

            const rect = designSurface.getBoundingClientRect();
            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            const cellWidth = rect.width / gridX;
            const cellHeight = rect.height / gridY;
            const snappedDeltaX = getSnappedDragDelta((event.clientX - activeResize.startPointerX) / cellWidth, activeResize.snappedDeltaX);
            const snappedDeltaY = getSnappedDragDelta((event.clientY - activeResize.startPointerY) / cellHeight, activeResize.snappedDeltaY);
            activeResize.snappedDeltaX = snappedDeltaX;
            activeResize.snappedDeltaY = snappedDeltaY;

            let left = activeResize.startCellX;
            let top = activeResize.startCellY;
            let right = activeResize.startCellX + activeResize.startCellWidth;
            let bottom = activeResize.startCellY + activeResize.startCellHeight;

            if (activeResize.handle.includes('w')) {
                left = Math.max(0, Math.min(activeResize.startCellX + snappedDeltaX, right - 1));
            }
            if (activeResize.handle.includes('e')) {
                right = Math.max(left + 1, Math.min(activeResize.startCellX + activeResize.startCellWidth + snappedDeltaX, gridX));
            }
            if (activeResize.handle.includes('n')) {
                top = Math.max(0, Math.min(activeResize.startCellY + snappedDeltaY, bottom - 1));
            }
            if (activeResize.handle.includes('s')) {
                bottom = Math.max(top + 1, Math.min(activeResize.startCellY + activeResize.startCellHeight + snappedDeltaY, gridY));
            }

            const nextWidth = right - left;
            const nextHeight = bottom - top;
            if (wouldOverlap(widget, left, top, nextWidth, nextHeight)) {
                return;
            }

            widget.cellX = left;
            widget.cellY = top;
            widget.cellWidth = nextWidth;
            widget.cellHeight = nextHeight;
            widget.properties.X = String(left);
            widget.properties.Y = String(top);
            activeResize.hasChanged = true;

            renderWidgets();
        }

        function getSnappedDragDelta(value, previousDelta) {
            const nearestDelta = Math.round(value);
            const snapThreshold = 0.16;

            if (Math.abs(value - nearestDelta) <= snapThreshold) {
                return nearestDelta;
            }

            return previousDelta;
        }

        function endResizeSelectedWidget() {
            if (activeResize && activeResize.hasChanged) {
                pushUndoSnapshot(activeResize.beforeSnapshot);
            }
            activeResize = null;
            if (resizeDragIndicator) {
                resizeDragIndicator.remove();
                resizeDragIndicator = null;
            }
            window.removeEventListener('pointermove', resizeSelectedWidget);
        }

        function updateResizeDragIndicator(event) {
            if (!resizeDragIndicator) {
                return;
            }

            resizeDragIndicator.style.left = `${event.clientX}px`;
            resizeDragIndicator.style.top = `${event.clientY}px`;
        }

        function beginMarqueeSelection(event) {
            if (runtimeRunning) {
                if (event.target.closest('.runtime-page-navigation')) {
                    return;
                }

                event.preventDefault();
                selectedCell = null;
                setSelectedWidgets([]);
                removeCellCursorElement();
                removeSelectionMarqueeElement();
                return;
            }

            if (event.button !== 0 || activeMove || activeResize || activePropertyPanelResize) {
                return;
            }

            if (event.target !== designSurface) {
                return;
            }

            event.preventDefault();
            const point = getSurfacePoint(event);
            activeMarquee = {
                startX: point.x,
                startY: point.y,
                currentX: point.x,
                currentY: point.y,
                additive: event.shiftKey || event.ctrlKey || event.metaKey,
                baseSelection: [...selectedWidgetIds],
                hasDragged: false
            };

            if (!activeMarquee.additive) {
                setSelectedWidgets([]);
                renderWidgets();
            }

            designSurface.setPointerCapture(event.pointerId);
            window.addEventListener('pointermove', updateMarqueeSelection);
            window.addEventListener('pointerup', endMarqueeSelection, { once: true });
        }

        function updateMarqueeSelection(event) {
            if (!activeMarquee) {
                return;
            }

            const point = getSurfacePoint(event);
            activeMarquee.currentX = point.x;
            activeMarquee.currentY = point.y;

            const dragDistance = Math.max(
                Math.abs(activeMarquee.currentX - activeMarquee.startX),
                Math.abs(activeMarquee.currentY - activeMarquee.startY));
            activeMarquee.hasDragged = dragDistance >= 4;
            updateSelectionMarqueeElement();
        }

        function endMarqueeSelection() {
            if (!activeMarquee) {
                return;
            }

            if (activeMarquee.hasDragged) {
                const marqueeRect = getMarqueeRect();
                const matchedIds = getCurrentPage().widgets
                    .filter(widget => rectanglesOverlap(marqueeRect, getWidgetSurfaceRect(widget)))
                    .map(widget => widget.id);

                setSelectedWidgets(activeMarquee.additive
                    ? [...activeMarquee.baseSelection, ...matchedIds]
                    : matchedIds);
            } else if (!activeMarquee.additive) {
                const cell = getSurfaceCellFromPoint({ x: activeMarquee.startX, y: activeMarquee.startY });
                if (!isCellOccupied(cell.x, cell.y)) {
                    setSelectedCell(cell);
                } else {
                    setSelectedWidgets([]);
                }
            }

            activeMarquee = null;
            removeSelectionMarqueeElement();
            window.removeEventListener('pointermove', updateMarqueeSelection);
            renderWidgets();
        }

        function getSurfacePoint(event) {
            const rect = designSurface.getBoundingClientRect();
            return {
                x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
                y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
            };
        }

        function getSurfaceCellFromPoint(point) {
            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            const cellWidth = designSurface.clientWidth / gridX;
            const cellHeight = designSurface.clientHeight / gridY;
            return {
                x: Math.max(0, Math.min(gridX - 1, Math.floor(point.x / cellWidth))),
                y: Math.max(0, Math.min(gridY - 1, Math.floor(point.y / cellHeight)))
            };
        }

        function getMarqueeRect() {
            if (!activeMarquee) {
                return { x: 0, y: 0, width: 0, height: 0 };
            }

            const x = Math.min(activeMarquee.startX, activeMarquee.currentX);
            const y = Math.min(activeMarquee.startY, activeMarquee.currentY);
            return {
                x,
                y,
                width: Math.abs(activeMarquee.currentX - activeMarquee.startX),
                height: Math.abs(activeMarquee.currentY - activeMarquee.startY)
            };
        }

        function getWidgetSurfaceRect(widget) {
            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            const cellWidth = designSurface.clientWidth / gridX;
            const cellHeight = designSurface.clientHeight / gridY;
            return {
                x: widget.cellX * cellWidth,
                y: widget.cellY * cellHeight,
                width: Math.max(1, widget.cellWidth) * cellWidth,
                height: Math.max(1, widget.cellHeight) * cellHeight
            };
        }

        function updateSelectionMarqueeElement() {
            if (!activeMarquee || !activeMarquee.hasDragged) {
                removeSelectionMarqueeElement();
                return;
            }

            let element = designSurface.querySelector('.selection-marquee');
            if (!element) {
                element = document.createElement('div');
                element.className = 'selection-marquee';
                designSurface.appendChild(element);
            }

            const rect = getMarqueeRect();
            element.style.left = `${rect.x}px`;
            element.style.top = `${rect.y}px`;
            element.style.width = `${rect.width}px`;
            element.style.height = `${rect.height}px`;
        }

        function removeSelectionMarqueeElement() {
            designSurface.querySelectorAll('.selection-marquee').forEach(element => element.remove());
        }

        function renderCellCursor() {
            if (runtimeRunning || !selectedCell) {
                return;
            }

            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            if (selectedCell.x < 0 || selectedCell.y < 0 || selectedCell.x >= gridX || selectedCell.y >= gridY) {
                selectedCell = null;
                return;
            }

            const element = document.createElement('div');
            element.className = 'cell-cursor';
            const cellWidth = designSurface.clientWidth / gridX;
            const cellHeight = designSurface.clientHeight / gridY;
            element.style.left = `${selectedCell.x * cellWidth}px`;
            element.style.top = `${selectedCell.y * cellHeight}px`;
            element.style.width = `${cellWidth}px`;
            element.style.height = `${cellHeight}px`;
            designSurface.appendChild(element);
        }

        function removeCellCursorElement() {
            designSurface.querySelectorAll('.cell-cursor').forEach(element => element.remove());
        }

        function applyWidgetBounds(element, widget) {
            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            const cellWidth = designSurface.clientWidth / gridX;
            const cellHeight = designSurface.clientHeight / gridY;
            const surfaceWidth = designSurface.clientWidth;
            const surfaceHeight = designSurface.clientHeight;

            let left = widget.cellX * cellWidth;
            let top = widget.cellY * cellHeight;
            let width = Math.max(1, Math.max(1, widget.cellWidth) * cellWidth);
            let height = Math.max(1, Math.max(1, widget.cellHeight) * cellHeight);

            if (left < 0) {
                width = Math.max(1, width + left);
                left = 0;
            }

            if (top < 0) {
                height = Math.max(1, height + top);
                top = 0;
            }

            if (left + width > surfaceWidth) {
                width = Math.max(1, surfaceWidth - left);
            }

            if (top + height > surfaceHeight) {
                height = Math.max(1, surfaceHeight - top);
            }

            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
            element.style.width = `${width}px`;
            element.style.height = `${height}px`;
        }

        function renderProperties() {
            const widget = getCurrentPage().widgets.find(item => item.id === selectedWidgetId);
            const resources = getVisualizationResources();
            if (selectedWidgetIds.length > 1) {
                if (propertyPanelTitle) {
                    propertyPanelTitle.textContent = resources.properties;
                }
                propertyGridBody.innerHTML = `
                    <tr><th>${escapeHtml(resources.select)}</th><td>${selectedWidgetIds.length}${escapeHtml(resources.controls)}</td></tr>
                    <tr><th>${escapeHtml(getPropertyDisplayName('Name'))}</th><td>-</td></tr>
                    <tr><th>${escapeHtml(getPropertyDisplayName('Address'))}</th><td>-</td></tr>`;
                return;
            }

            if (selectedCell) {
                if (propertyPanelTitle) {
                    propertyPanelTitle.textContent = resources.properties;
                }
                propertyGridBody.innerHTML = `
                    <tr><th>${escapeHtml(resources.select)}</th><td>${escapeHtml(resources.emptyCell)}</td></tr>
                    <tr><th>X</th><td>${selectedCell.x}</td></tr>
                    <tr><th>Y</th><td>${selectedCell.y}</td></tr>`;
                return;
            }

            if (!widget) {
                if (propertyPanelTitle) {
                    propertyPanelTitle.textContent = resources.properties;
                }
                propertyGridBody.innerHTML = `
                    <tr><th>${escapeHtml(getPropertyDisplayName('Name'))}</th><td>-</td></tr>
                    <tr><th>${escapeHtml(getPropertyDisplayName('Address'))}</th><td>-</td></tr>`;
                return;
            }

            if (propertyPanelTitle) {
                propertyPanelTitle.textContent = useKoreanLanguage
                    ? `${widget.kind || 'Widget'} ${resources.properties}`
                    : `${resources.properties} - ${widget.kind || 'Widget'}`;
            }

            const rows = getWidgetPropertyRows(widget);

            propertyGridBody.innerHTML = rows
                .map(row => {
                    const valueHtml = row.editable
                        ? renderPropertyEditor(row.key, row.value)
                        : escapeHtml(row.value);
                    const rowClass = row.editable ? '' : ' class="property-row-disabled"';
                    return `<tr${rowClass}><th>${escapeHtml(getPropertyDisplayName(row.key))}</th><td class="property-value">${valueHtml}</td></tr>`;
                })
                .join('');
        }

        function getWidgetPropertyRows(widget) {
            if (widget.kind === 'Lamp') {
                return [
                    { key: 'Name', value: widget.properties.Name || '', editable: true },
                    { key: 'Address', value: widget.properties.Address || '', editable: true },
                    { key: 'Display', value: normalizeWidgetDisplayMode(widget.properties.Display), editable: true },
                    { key: 'Display Address', value: widget.properties['Display Address'] || '', editable: normalizeWidgetDisplayMode(widget.properties.Display) === 'Address' },
                    { key: 'Border', value: widget.properties.Border || 'Off', editable: true },
                    { key: 'Border Color', value: getWidgetBorderBackColor(widget), editable: true },
                    { key: 'Lamp Size', value: widget.properties['Lamp Size'] || '100', editable: true },
                    { key: 'DisplayColor', value: widget.properties.DisplayColor || '#FFC850', editable: true },
                    { key: 'X', value: widget.properties.X || String(widget.cellX), editable: true },
                    { key: 'Y', value: widget.properties.Y || String(widget.cellY), editable: true },
                    { key: 'Text Size', value: widget.properties['Text Size'] || '16', editable: true },
                    { key: 'Text', value: widget.properties.Text || '', editable: true }
                ];
            }

            if (widget.kind === 'Number') {
                return [
                    { key: 'Name', value: widget.properties.Name || '', editable: true },
                    { key: 'Address', value: widget.properties.Address || '', editable: true },
                    { key: 'Display', value: normalizeWidgetDisplayMode(widget.properties.Display), editable: true },
                    { key: 'Display Address', value: widget.properties['Display Address'] || '', editable: normalizeWidgetDisplayMode(widget.properties.Display) === 'Address' },
                    { key: 'DisplayColor', value: widget.properties.DisplayColor || '#DCDCDC', editable: true },
                    { key: 'X', value: widget.properties.X || String(widget.cellX), editable: true },
                    { key: 'Y', value: widget.properties.Y || String(widget.cellY), editable: true },
                    { key: 'Editable', value: widget.properties.Editable || 'Disable', editable: true },
                    { key: 'Unit', value: widget.properties.Unit || '', editable: true },
                    { key: 'Text Size', value: widget.properties['Text Size'] || '24', editable: true },
                    { key: 'Text', value: widget.properties.Text || '123', editable: true }
                ];
            }

            if (widget.kind === 'Text') {
                return [
                    { key: 'Name', value: widget.properties.Name || '', editable: true },
                    { key: 'Address', value: widget.properties.Address || '', editable: true },
                    { key: 'Display', value: normalizeWidgetDisplayMode(widget.properties.Display), editable: true },
                    { key: 'Display Address', value: widget.properties['Display Address'] || '', editable: normalizeWidgetDisplayMode(widget.properties.Display) === 'Address' },
                    { key: 'Border', value: widget.properties.Border || 'Off', editable: true },
                    { key: 'Border Color', value: widget.properties['Border Color'] || '#DCDCDC', editable: true },
                    { key: 'X', value: widget.properties.X || String(widget.cellX), editable: true },
                    { key: 'Y', value: widget.properties.Y || String(widget.cellY), editable: true },
                    { key: 'DisplayColor', value: widget.properties.DisplayColor || '#DCDCDC', editable: true },
                    { key: 'Position', value: getTextPositionValue(widget), editable: true },
                    { key: 'Text Size', value: widget.properties['Text Size'] || '18', editable: true },
                    { key: 'Text', value: widget.properties.Text || 'Text', editable: true }
                ];
            }

            if (widget.kind === 'Slider') {
                normalizeSliderRangeProperties(widget);
                return [
                    { key: 'Name', value: widget.properties.Name || '', editable: true },
                    { key: 'Address', value: widget.properties.Address || '', editable: true },
                    { key: 'Direction', value: widget.properties.Direction || 'Horizontal', editable: true },
                    { key: 'X', value: widget.properties.X || String(widget.cellX), editable: true },
                    { key: 'Y', value: widget.properties.Y || String(widget.cellY), editable: true },
                    { key: 'Minimum', value: widget.properties.Minimum || '0', editable: true },
                    { key: 'Maximum', value: widget.properties.Maximum || '100', editable: true },
                    { key: 'Value', value: widget.properties.Value || '0', editable: true }
                ];
            }

            if (widget.kind === 'ProgressBar') {
                normalizeSliderRangeProperties(widget);
                return [
                    { key: 'Name', value: widget.properties.Name || '', editable: true },
                    { key: 'Address', value: widget.properties.Address || '', editable: true },
                    { key: 'Direction', value: widget.properties.Direction || 'Horizontal', editable: true },
                    { key: 'Marking', value: normalizeProgressBarMarking(widget.properties.Marking), editable: true },
                    { key: 'X', value: widget.properties.X || String(widget.cellX), editable: true },
                    { key: 'Y', value: widget.properties.Y || String(widget.cellY), editable: true },
                    { key: 'Minimum', value: widget.properties.Minimum || '0', editable: true },
                    { key: 'Maximum', value: widget.properties.Maximum || '100', editable: true },
                    { key: 'DisplayColor', value: widget.properties.DisplayColor || '#50AAF5', editable: true },
                    { key: 'Value', value: widget.properties.Value || '0', editable: true }
                ];
            }

            if (widget.kind === 'Gauge') {
                normalizeSliderRangeProperties(widget);
                return [
                    { key: 'Name', value: widget.properties.Name || '', editable: true },
                    { key: 'Address', value: widget.properties.Address || '', editable: true },
                    { key: 'Gauge Type', value: normalizeGaugeType(widget.properties['Gauge Type']), editable: true },
                    { key: 'X', value: widget.properties.X || String(widget.cellX), editable: true },
                    { key: 'Y', value: widget.properties.Y || String(widget.cellY), editable: true },
                    { key: 'Minimum', value: widget.properties.Minimum || '0', editable: true },
                    { key: 'Maximum', value: widget.properties.Maximum || '60', editable: true },
                    { key: 'Color', value: widget.properties.Color || widget.properties.DisplayColor || '#F0B000', editable: true },
                    { key: 'Unit', value: normalizeNumberUnit(widget.properties.Unit), editable: true },
                    { key: 'Value', value: widget.properties.Value || '0', editable: true }
                ];
            }

            if (widget.kind === 'Toggle') {
                return [
                    { key: 'Name', value: widget.properties.Name || '', editable: true },
                    { key: 'Address', value: widget.properties.Address || '', editable: true },
                    { key: 'Border', value: widget.properties.Border || 'Off', editable: true },
                    { key: 'Border Color', value: getWidgetBorderBackColor(widget), editable: true },
                    { key: 'DisplayColor', value: widget.properties.DisplayColor || '#466E3C', editable: true },
                    { key: 'X', value: widget.properties.X || String(widget.cellX), editable: true },
                    { key: 'Y', value: widget.properties.Y || String(widget.cellY), editable: true },
                    { key: 'Text Size', value: widget.properties['Text Size'] || '16', editable: true },
                    { key: 'Text', value: widget.properties.Text || '', editable: true }
                ];
            }

            return [
                { key: 'Name', value: widget.properties.Name || '', editable: true },
                { key: 'Address', value: widget.properties.Address || '', editable: true },
                { key: 'Display', value: normalizeWidgetDisplayMode(widget.properties.Display), editable: true },
                { key: 'Display Address', value: widget.properties['Display Address'] || '', editable: normalizeWidgetDisplayMode(widget.properties.Display) === 'Address' },
                { key: 'Lamp', value: normalizeButtonLampMode(widget.properties.Lamp), editable: true },
                { key: 'Lamp Address', value: widget.properties['Lamp Address'] || '', editable: true },
                { key: 'LampColor', value: widget.properties.LampColor || '', editable: true },
                { key: 'X', value: widget.properties.X || String(widget.cellX), editable: true },
                { key: 'Y', value: widget.properties.Y || String(widget.cellY), editable: true },
                { key: 'BackColor', value: widget.properties.BackColor || '', editable: true },
                { key: 'ForeColor', value: widget.properties.ForeColor || '', editable: true },
                { key: 'Round', value: widget.properties.Round || '', editable: true },
                { key: 'Text Size', value: widget.properties['Text Size'] || '', editable: true },
                { key: 'Text', value: widget.properties.Text || '', editable: true }
            ];
        }

        function renderPropertyEditor(key, value) {
            const widget = getCurrentPage().widgets.find(item => item.id === selectedWidgetId);
            if (widget && widget.kind === 'Number' && key === 'Text Size') {
                return renderTextSizeStepper(key, value);
            }

            if (key === 'Lamp') {
                const normalizedValue = normalizeButtonLampMode(value);
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="On" ${normalizedValue === 'On' ? 'selected' : ''}>On</option>
                    <option value="Off" ${normalizedValue === 'Off' ? 'selected' : ''}>Off</option>
                </select>`;
            }

            if (widget && (widget.kind === 'Button' || widget.kind === 'Lamp' || widget.kind === 'Text' || widget.kind === 'Number') && key === 'Display') {
                const normalizedValue = normalizeWidgetDisplayMode(value);
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="On" ${normalizedValue === 'On' ? 'selected' : ''}>On</option>
                    <option value="Off" ${normalizedValue === 'Off' ? 'selected' : ''}>Off</option>
                    <option value="Address" ${normalizedValue === 'Address' ? 'selected' : ''}>Address</option>
                </select>`;
            }

            if (widget && widget.kind === 'Text' && key === 'Position') {
                return renderTextPositionPicker(widget);
            }

            if (key === 'Round') {
                const normalizedValue = isRoundEnabled(value) ? 'Yes' : 'No';
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="Yes" ${normalizedValue === 'Yes' ? 'selected' : ''}>Yes</option>
                    <option value="No" ${normalizedValue === 'No' ? 'selected' : ''}>No</option>
                </select>`;
            }

            if (key === 'Direction') {
                const normalizedValue = normalizeSliderDirection(value);
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="Horizontal" ${normalizedValue === 'Horizontal' ? 'selected' : ''}>Horizontal</option>
                    <option value="Vertical" ${normalizedValue === 'Vertical' ? 'selected' : ''}>Vertical</option>
                </select>`;
            }

            if (widget && widget.kind === 'ProgressBar' && key === 'Marking') {
                const normalizedValue = normalizeProgressBarMarking(value);
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="On" ${normalizedValue === 'On' ? 'selected' : ''}>On</option>
                    <option value="Off" ${normalizedValue === 'Off' ? 'selected' : ''}>Off</option>
                </select>`;
            }

            if (key === 'Gauge Type') {
                const normalizedValue = normalizeGaugeType(value);
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="Default" ${normalizedValue === 'Default' ? 'selected' : ''}>Default</option>
                    <option value="Simple" ${normalizedValue === 'Simple' ? 'selected' : ''}>Simple</option>
                    <option value="Line" ${normalizedValue === 'Line' ? 'selected' : ''}>Line</option>
                </select>`;
            }

            if (key === 'Alignment') {
                const normalizedValue = normalizeTextAlignment(value);
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="Left" ${normalizedValue === 'Left' ? 'selected' : ''}>Left</option>
                    <option value="Center" ${normalizedValue === 'Center' ? 'selected' : ''}>Center</option>
                    <option value="Right" ${normalizedValue === 'Right' ? 'selected' : ''}>Right</option>
                </select>`;
            }

            if (key === 'Location') {
                const normalizedValue = normalizeTextLocation(value);
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="Top" ${normalizedValue === 'Top' ? 'selected' : ''}>Top</option>
                    <option value="Middle" ${normalizedValue === 'Middle' ? 'selected' : ''}>Middle</option>
                    <option value="Bottom" ${normalizedValue === 'Bottom' ? 'selected' : ''}>Bottom</option>
                </select>`;
            }

            if (key === 'Border') {
                const normalizedValue = isLampBorderEnabled(value) ? 'On' : 'Off';
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="On" ${normalizedValue === 'On' ? 'selected' : ''}>On</option>
                    <option value="Off" ${normalizedValue === 'Off' ? 'selected' : ''}>Off</option>
                </select>`;
            }

            if (key === 'Editable') {
                const normalizedValue = isNumberEditableEnabled(value) ? 'Enable' : 'Disable';
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    <option value="Enable" ${normalizedValue === 'Enable' ? 'selected' : ''}>Enable</option>
                    <option value="Disable" ${normalizedValue === 'Disable' ? 'selected' : ''}>Disable</option>
                </select>`;
            }

            if (widget && (widget.kind === 'Number' || widget.kind === 'Gauge') && key === 'Unit') {
                const normalizedValue = normalizeNumberUnit(value);
                const options = getNumberUnitOptions();
                return `<select class="property-select" data-property-key="${escapeHtml(key)}">
                    ${options.map(option => `<option value="${escapeHtml(option.value)}" ${normalizedValue === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
                </select>`;
            }

            if (isColorProperty(key)) {
                const color = normalizeCssColor(value);
                const swatchClass = color ? 'property-color-swatch is-valid' : 'property-color-swatch';
                const swatchStyle = color ? ` style="background-color: ${escapeHtml(color)}"` : '';
                return `<div class="property-color-editor">
                    <input class="property-input" data-property-key="${escapeHtml(key)}" value="${escapeHtml(value)}" />
                    <button class="property-color-button" type="button" data-color-property-key="${escapeHtml(key)}" title="${escapeHtml(value)}">
                        <span class="${swatchClass}"${swatchStyle}></span>
                    </button>
                </div>`;
            }

            const addressClass = (key === 'Address' || key === 'Display Address' || key === 'Lamp Address') ? ' property-address-input' : '';
            const disabledAttribute = widget && (widget.kind === 'Button' || widget.kind === 'Lamp' || widget.kind === 'Text' || widget.kind === 'Number') && key === 'Display Address' && normalizeWidgetDisplayMode(widget.properties.Display) !== 'Address'
                ? ' disabled'
                : '';
            return `<input class="property-input${addressClass}" data-property-key="${escapeHtml(key)}" value="${escapeHtml(value)}"${disabledAttribute} />`;
        }

        function renderTextSizeStepper(key, value) {
            return `<div class="property-stepper">
                <input class="property-input property-stepper-input" data-property-key="${escapeHtml(key)}" value="${escapeHtml(value)}" />
                <div class="property-stepper-buttons" aria-hidden="true">
                    <button class="property-stepper-button" type="button" data-step-property-key="${escapeHtml(key)}" data-step-delta="1">▲</button>
                    <button class="property-stepper-button" type="button" data-step-property-key="${escapeHtml(key)}" data-step-delta="-1">▼</button>
                </div>
            </div>`;
        }

        function renderTextPositionPicker(widget) {
            const selected = getTextPositionValue(widget);
            const positions = [
                ['TopLeft', '↖'], ['TopCenter', '↑'], ['TopRight', '↗'],
                ['MiddleLeft', '←'], ['MiddleCenter', '•'], ['MiddleRight', '→'],
                ['BottomLeft', '↙'], ['BottomCenter', '↓'], ['BottomRight', '↘']
            ];

            return `<div class="property-position-picker" role="group" aria-label="Text position">
                ${positions.map(([value, label]) => `<button class="property-position-button ${selected === value ? 'selected' : ''}" type="button" data-position-value="${value}" title="${value}">${label}</button>`).join('')}
            </div>`;
        }

        function updateSelectedWidgetProperty(propertyKey, value) {
            const widget = getCurrentPage().widgets.find(item => item.id === selectedWidgetId);
            if (!widget) {
                return;
            }

            if (propertyKey === 'X' || propertyKey === 'Y') {
                const gridX = toNumber(gridXSlider.value, 10);
                const gridY = toNumber(gridYSlider.value, 9);
                const nextX = propertyKey === 'X'
                    ? Math.max(0, Math.min(gridX - Math.max(1, widget.cellWidth), Math.floor(toNumber(value, widget.cellX))))
                    : widget.cellX;
                const nextY = propertyKey === 'Y'
                    ? Math.max(0, Math.min(gridY - Math.max(1, widget.cellHeight), Math.floor(toNumber(value, widget.cellY))))
                    : widget.cellY;

                if (wouldOverlap(widget, nextX, nextY, Math.max(1, widget.cellWidth), Math.max(1, widget.cellHeight))) {
                    renderWidgets();
                    return;
                }

                if (widget.cellX === nextX && widget.cellY === nextY) {
                    renderWidgets();
                    return;
                }

                pushUndoState();
                widget.cellX = nextX;
                widget.cellY = nextY;
                widget.properties.X = String(nextX);
                widget.properties.Y = String(nextY);
            } else {
                const normalizedValue = normalizeWidgetPropertyValue(widget, propertyKey, value);
                if (String(widget.properties[propertyKey] || '') === String(normalizedValue || '')) {
                    renderWidgets();
                    return;
                }

                pushUndoState();
                widget.properties[propertyKey] = normalizedValue;
            }

            renderWidgets();
        }

        function normalizeWidgetPropertyValue(widget, propertyKey, value) {
            if (widget.kind === 'Text' && propertyKey === 'Position') {
                return normalizeTextPosition(value);
            }

            if ((widget.kind === 'Lamp' || widget.kind === 'Toggle' || widget.kind === 'Text') && propertyKey === 'Border') {
                return isLampBorderEnabled(value) ? 'On' : 'Off';
            }

            if (widget.kind === 'Lamp' && propertyKey === 'Lamp Size') {
                return String(parseLampSizePercent(value));
            }

            if (widget.kind === 'Number' && propertyKey === 'Editable') {
                return isNumberEditableEnabled(value) ? 'Enable' : 'Disable';
            }

            if ((widget.kind === 'Number' || widget.kind === 'Gauge') && propertyKey === 'Unit') {
                return normalizeNumberUnit(value);
            }

            if (widget.kind === 'Number' && propertyKey === 'Text Size') {
                return String(clampNumberTextSize(value));
            }

            if (widget.kind === 'Button' && propertyKey === 'Lamp') {
                return normalizeButtonLampMode(value);
            }

            if ((widget.kind === 'Button' || widget.kind === 'Lamp' || widget.kind === 'Text' || widget.kind === 'Number') && propertyKey === 'Display') {
                return normalizeWidgetDisplayMode(value);
            }

            if (widget.kind === 'Text' && propertyKey === 'Alignment') {
                return normalizeTextAlignment(value);
            }

            if (widget.kind === 'Text' && propertyKey === 'Location') {
                return normalizeTextLocation(value);
            }

            if ((widget.kind === 'Slider' || widget.kind === 'ProgressBar') && propertyKey === 'Direction') {
                return normalizeSliderDirection(value);
            }

            if (widget.kind === 'Gauge' && propertyKey === 'Gauge Type') {
                return normalizeGaugeType(value);
            }

            if ((widget.kind === 'Slider' || widget.kind === 'ProgressBar') && (propertyKey === 'Minimum' || propertyKey === 'Maximum' || propertyKey === 'Value')) {
                const preview = { ...widget, properties: { ...widget.properties, [propertyKey]: String(Math.round(toNumber(value, propertyKey === 'Maximum' ? 100 : 0))) } };
                normalizeSliderRangeProperties(preview);
                return preview.properties[propertyKey];
            }

            return value;
        }

        function updateTextWidgetPosition(widget, positionValue) {
            if (!widget || widget.kind !== 'Text') {
                return;
            }

            const position = normalizeTextPosition(positionValue);
            const next = textPositionToAlignmentLocation(position);
            const currentAlignment = normalizeTextAlignment(widget.properties.Alignment);
            const currentLocation = normalizeTextLocation(widget.properties.Location);
            if (currentAlignment === next.alignment && currentLocation === next.location) {
                renderWidgets();
                return;
            }

            pushUndoState();
            widget.properties.Alignment = next.alignment;
            widget.properties.Location = next.location;
            renderWidgets();
        }

        function copySelectedWidgets() {
            const page = getCurrentPage();
            copiedWidgets = selectedWidgetIds
                .map(widgetId => page.widgets.find(widget => widget.id === widgetId))
                .filter(Boolean)
                .map(widget => cloneWidgetForClipboard(widget));
        }

        function pasteCopiedWidgets() {
            if (copiedWidgets.length === 0) {
                return;
            }

            const pasteWidgets = buildPasteWidgets();
            if (pasteWidgets.length === 0) {
                return;
            }

            pushUndoState();
            const page = getCurrentPage();
            pasteWidgets.forEach(widget => page.widgets.push(widget));
            setSelectedWidgets(pasteWidgets.map(widget => widget.id));
            renderWidgets();
        }

        function deleteSelectedWidgets() {
            if (selectedWidgetIds.length === 0) {
                return;
            }

            const selectedIds = new Set(selectedWidgetIds);
            const page = getCurrentPage();
            const nextWidgets = page.widgets.filter(widget => !selectedIds.has(widget.id));
            if (nextWidgets.length === page.widgets.length) {
                return;
            }

            pushUndoState();
            page.widgets = nextWidgets;
            setSelectedWidgets([]);
            selectedCell = null;
            renderWidgets();
        }

        function cloneWidgetForClipboard(widget) {
            return {
                kind: widget.kind,
                cellX: widget.cellX,
                cellY: widget.cellY,
                cellWidth: Math.max(1, widget.cellWidth),
                cellHeight: Math.max(1, widget.cellHeight),
                properties: { ...widget.properties }
            };
        }

        function buildPasteWidgets() {
            const minX = Math.min(...copiedWidgets.map(widget => widget.cellX));
            const minY = Math.min(...copiedWidgets.map(widget => widget.cellY));
            const selectedAnchorWidget = getCurrentPage().widgets.find(widget => widget.id === selectedWidgetId);
            const baseX = selectedCell ? selectedCell.x : (selectedAnchorWidget ? selectedAnchorWidget.cellX + 1 : minX + 1);
            const baseY = selectedCell ? selectedCell.y : (selectedAnchorWidget ? selectedAnchorWidget.cellY + 1 : minY + 1);
            const maxOffset = Math.max(toNumber(gridXSlider.value, 10), toNumber(gridYSlider.value, 9));

            for (let offset = 0; offset <= maxOffset; offset += 1) {
                const anchor = { x: baseX + offset, y: baseY + offset };
                const widgets = tryCreatePasteWidgetsAt(anchor, minX, minY);
                if (widgets.length > 0) {
                    return widgets;
                }
            }

            for (let y = 0; y < toNumber(gridYSlider.value, 9); y += 1) {
                for (let x = 0; x < toNumber(gridXSlider.value, 10); x += 1) {
                    const widgets = tryCreatePasteWidgetsAt({ x, y }, minX, minY);
                    if (widgets.length > 0) {
                        return widgets;
                    }
                }
            }

            return [];
        }

        function tryCreatePasteWidgetsAt(anchor, minX, minY) {
            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            const page = getCurrentPage();
            const pasteWidgets = [];

            for (const copiedWidget of copiedWidgets) {
                const cellX = anchor.x + (copiedWidget.cellX - minX);
                const cellY = anchor.y + (copiedWidget.cellY - minY);
                const cellWidth = Math.max(1, copiedWidget.cellWidth);
                const cellHeight = Math.max(1, copiedWidget.cellHeight);

                if (cellX < 0 || cellY < 0 || cellX + cellWidth > gridX || cellY + cellHeight > gridY) {
                    return [];
                }

                const rect = { x: cellX, y: cellY, width: cellWidth, height: cellHeight };
                if (page.widgets.some(widget => rectanglesOverlap(rect, {
                    x: widget.cellX,
                    y: widget.cellY,
                    width: Math.max(1, widget.cellWidth),
                    height: Math.max(1, widget.cellHeight)
                }))) {
                    return [];
                }

                if (pasteWidgets.some(widget => rectanglesOverlap(rect, {
                    x: widget.cellX,
                    y: widget.cellY,
                    width: Math.max(1, widget.cellWidth),
                    height: Math.max(1, widget.cellHeight)
                }))) {
                    return [];
                }

                const widget = {
                    id: `w${nextWidgetId++}`,
                    kind: copiedWidget.kind,
                    cellX,
                    cellY,
                    cellWidth,
                    cellHeight,
                    properties: { ...copiedWidget.properties }
                };

                widget.properties.Name = createCopiedWidgetName(copiedWidget);
                widget.properties.X = String(cellX);
                widget.properties.Y = String(cellY);
                pasteWidgets.push(widget);
            }

            return pasteWidgets;
        }

        function createCopiedWidgetName(widget) {
            const page = getCurrentPage();
            const baseName = String(widget.properties.Name || widget.kind || 'Widget').replace(/\s+Copy(?:\s+\d+)?$/i, '');
            let index = 1;
            let name = `${baseName} Copy`;
            const existingNames = new Set(page.widgets.map(item => String(item.properties.Name || '')));
            while (existingNames.has(name)) {
                index += 1;
                name = `${baseName} Copy ${index}`;
            }

            return name;
        }

        function handleDesignerKeyDown(event) {
            if (deployedRuntimeMode) {
                return;
            }

            const target = event.target;
            const isTextEditing = target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.tagName === 'SELECT' ||
                target.isContentEditable);

            if (runtimeRunning) {
                if (event.key === 'Escape') {
                    stopRuntime();
                    event.preventDefault();
                }

                return;
            }

            if (isTextEditing) {
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                if (event.shiftKey) {
                    window.alert('이 화면에서는 Ctrl+Shift+S를 사용할 수 없습니다. 상단 툴바의 Save As 메뉴를 사용해 주세요.');
                } else {
                    window.alert('이 화면에서는 Ctrl+S를 사용할 수 없습니다. 상단 툴바의 디스크 아이콘을 눌러 저장해 주세요.');
                }
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
                event.preventDefault();
                window.alert('이 화면에서는 Ctrl+R을 사용할 수 없습니다. 상단 툴바의 다운로드 아이콘을 눌러 실행해 주세요.');
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
                copySelectedWidgets();
                event.preventDefault();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                undoEdit();
                event.preventDefault();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
                redoEdit();
                event.preventDefault();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
                pasteCopiedWidgets();
                event.preventDefault();
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
                setSelectedWidgets(getCurrentPage().widgets.map(widget => widget.id));
                renderWidgets();
                event.preventDefault();
                return;
            }

            if (event.key === 'Delete') {
                deleteSelectedWidgets();
                event.preventDefault();
            }
        }

        function visualizationEditCommand(command) {
            switch (String(command || '').toLowerCase()) {
                case 'undo':
                    undoEdit();
                    break;
                case 'redo':
                    redoEdit();
                    break;
                case 'copy':
                    copySelectedWidgets();
                    break;
                case 'paste':
                    pasteCopiedWidgets();
                    break;
                case 'delete':
                    deleteSelectedWidgets();
                    break;
                case 'selectall':
                    setSelectedWidgets(getCurrentPage().widgets.map(widget => widget.id));
                    renderWidgets();
                    break;
            }
        }

        window.visualizationEditCommand = visualizationEditCommand;

        function isDataAddressWidget(widget) {
            return !!widget && (widget.kind === 'Number' || widget.kind === 'Slider' || widget.kind === 'ProgressBar' || widget.kind === 'Gauge');
        }

        function normalizeButtonLampMode(value) {
            return String(value || '').trim().toLowerCase() === 'on' ? 'On' : 'Off';
        }

        function normalizeWidgetDisplayMode(value) {
            const text = String(value || '').trim().toLowerCase();
            if (text === 'off') {
                return 'Off';
            }

            if (text === 'address') {
                return 'Address';
            }

            return 'On';
        }

        function getWidgetDisplayRuntimeAddress(widget) {
            if (!widget || !widget.properties || normalizeWidgetDisplayMode(widget.properties.Display) !== 'Address') {
                return '';
            }

            return String(widget.properties['Display Address'] || '').trim();
        }

        function normalizeVisualizationAddressKey(address) {
            return String(address || '').replace(/\s+/g, '').toUpperCase();
        }

        function setVisualizationAddressAliases(aliases) {
            visualizationAddressAliases = new Map();
            visualizationAddressAliasRefreshRequested = false;
            visualizationAddressAliasesLoaded = true;
            if (aliases && typeof aliases === 'object') {
                Object.keys(aliases).forEach(address => {
                    const key = normalizeVisualizationAddressKey(address);
                    const alias = String(aliases[address] || '').trim();
                    if (key && alias) {
                        visualizationAddressAliases.set(key, alias);
                    }
                });
            }

            if (!runtimeRunning && selectedWidgetIds.length === 1) {
                renderWidgets();
            }
        }

        window.setVisualizationAddressAliases = setVisualizationAddressAliases;

        function requestVisualizationAddressAliasRefresh(force = false) {
            if (visualizationAddressAliasRefreshRequested || (!force && visualizationAddressAliasesLoaded) || !window.chrome || !window.chrome.webview) {
                return;
            }

            visualizationAddressAliasRefreshRequested = true;
            window.chrome.webview.postMessage({ type: 'visualization-address-alias-refresh-request' });
        }

        function getVisualizationAliasLookupKeys(address) {
            const key = normalizeVisualizationAddressKey(address);
            if (!key) {
                return [];
            }

            const keys = [key];
            const match = key.match(/^([A-Z]+)(\d+)$/);
            if (match) {
                const prefix = match[1];
                const index = match[2];
                if (prefix === 'TS') {
                    keys.push(`T${index}`);
                } else if (prefix === 'T') {
                    keys.push(`TS${index}`);
                } else if (prefix === 'CS') {
                    keys.push(`C${index}`);
                } else if (prefix === 'C') {
                    keys.push(`CS${index}`);
                }
            }

            return keys;
        }

        function lookupVisualizationAddressAlias(address) {
            for (const key of getVisualizationAliasLookupKeys(address)) {
                const alias = visualizationAddressAliases.get(key);
                if (alias) {
                    return alias;
                }
            }

            return '';
        }

        function getVisualizationAddressType(address) {
            const key = normalizeVisualizationAddressKey(address);
            const match = key.match(/^([A-Z]+)\d+$/);
            if (!match) {
                return '';
            }

            switch (match[1]) {
                case 'I':
                case 'Q':
                case 'X':
                case 'Y':
                case 'M':
                case 'S':
                case 'TS':
                case 'CS':
                case 'R':
                    return 'Bit';
                case 'D':
                case 'SD':
                case 'RD':
                    return 'Word';
                case 'T':
                case 'C':
                case 'DD':
                case 'RDD':
                    return 'Dword';
                case 'DF':
                case 'RDF':
                    return 'Float';
                default:
                    return '';
            }
        }

        function formatSelectedWidgetAddressInfo(item) {
            const addressText = item.alias ? `${item.address} (${item.alias})` : item.address;
            return item.type ? `${addressText} · ${item.type}` : addressText;
        }

        function collectSelectedWidgetAddressInfo(widget) {
            if (!widget || !widget.properties) {
                return [];
            }

            const items = [];
            const seen = new Set();
            const addAddress = address => {
                const normalizedAddress = String(address || '').trim();
                const key = normalizeVisualizationAddressKey(normalizedAddress);
                if (!normalizedAddress || !key || seen.has(key)) {
                    return;
                }

                seen.add(key);
                items.push({
                    address: normalizedAddress,
                    alias: lookupVisualizationAddressAlias(normalizedAddress),
                    type: getVisualizationAddressType(normalizedAddress)
                });
            };

            addAddress(widget.properties.Address);
            addAddress(getWidgetDisplayRuntimeAddress(widget));
            addAddress(getButtonLampRuntimeAddress(widget));
            return items;
        }

        function renderSelectedWidgetAddressPopup(widgetElement, widget) {
            if (runtimeRunning || !isWidgetSelected(widget) || selectedWidgetIds.length !== 1) {
                return;
            }

            const items = collectSelectedWidgetAddressInfo(widget);
            if (items.length === 0) {
                return;
            }

            const selectionAliasKey = `${widget.id}|${items.map(item => normalizeVisualizationAddressKey(item.address)).join('|')}`;
            if (visualizationAddressAliasSelectionKey !== selectionAliasKey) {
                visualizationAddressAliasSelectionKey = selectionAliasKey;
                requestVisualizationAddressAliasRefresh(true);
            } else if (items.some(item => !item.alias)) {
                requestVisualizationAddressAliasRefresh();
            }

            const popup = document.createElement('div');
            popup.className = 'selected-widget-address-popup';

            const nameRow = document.createElement('div');
            nameRow.className = 'selected-widget-address-popup-row selected-widget-name-popup-row';

            const nameValue = document.createElement('span');
            nameValue.className = 'selected-widget-address-popup-value';
            nameValue.textContent = String(widget?.properties?.Name || widget?.kind || '');
            nameRow.appendChild(nameValue);

            popup.appendChild(nameRow);

            items.forEach(item => {
                const row = document.createElement('div');
                row.className = 'selected-widget-address-popup-row';

                const value = document.createElement('span');
                value.className = 'selected-widget-address-popup-value';
                value.textContent = formatSelectedWidgetAddressInfo(item);
                row.appendChild(value);

                popup.appendChild(row);
            });

            designSurface.appendChild(popup);

            const surfaceRect = designSurface.getBoundingClientRect();
            const widgetRect = widgetElement.getBoundingClientRect();
            const popupRect = popup.getBoundingClientRect();
            let left = widgetRect.left - surfaceRect.left;
            let top = widgetRect.bottom - surfaceRect.top + 8;

            if (left + popupRect.width > designSurface.clientWidth - 4) {
                left = designSurface.clientWidth - popupRect.width - 4;
            }

            if (top + popupRect.height > designSurface.clientHeight - 4) {
                top = widgetRect.top - surfaceRect.top - popupRect.height - 8;
            }

            popup.style.left = `${Math.max(4, left)}px`;
            popup.style.top = `${Math.max(4, top)}px`;
        }

        function isWidgetDisplayVisible(widget) {
            const mode = normalizeWidgetDisplayMode(widget?.properties?.Display);
            if (mode === 'Off') {
                return false;
            }

            if (mode !== 'Address') {
                return true;
            }

            const address = getWidgetDisplayRuntimeAddress(widget);
            if (!runtimeRunning) {
                return true;
            }

            if (!address || !runtimeValues.has(address)) {
                return false;
            }

            const value = Number(runtimeValues.get(address));
            return Number.isFinite(value) && value !== 0;
        }

        function requestAddressInput(widget, propertyKey = 'Address') {
            if (!window.chrome || !window.chrome.webview) {
                return;
            }

            const normalizedPropertyKey = String(propertyKey || 'Address');
            const currentAddress = normalizedPropertyKey === 'Lamp Address'
                ? (widget.properties['Lamp Address'] || '')
                : (normalizedPropertyKey === 'Display Address'
                ? (widget.properties['Display Address'] || '')
                : (widget.properties.Address || ''));
            const requestType = normalizedPropertyKey === 'Lamp Address' || normalizedPropertyKey === 'Display Address'
                ? 'visualization-bit-address-request'
                : (isDataAddressWidget(widget) ? 'visualization-data-address-request' : 'visualization-bit-address-request');

            window.chrome.webview.postMessage({
                type: requestType,
                widgetId: widget.id,
                address: currentAddress,
                propertyKey: normalizedPropertyKey
            });
        }

        function applyVisualizationWidgetAddress(widgetId, address, propertyKey) {
            const widget = getCurrentPage().widgets.find(item => item.id === widgetId);
            if (!widget) {
                return;
            }

            const targetPropertyKey = String(propertyKey || 'Address');
            if (targetPropertyKey === 'Lamp Address') {
                widget.properties['Lamp Address'] = address || '';
            } else if (targetPropertyKey === 'Display Address') {
                widget.properties['Display Address'] = address || '';
            } else {
                widget.properties.Address = address || '';
            }
            pushUndoState();
            setSelectedWidgets([widget.id]);
            renderWidgets();
        }

        window.applyVisualizationWidgetAddress = applyVisualizationWidgetAddress;

        function updatePlaceholderVisibility() {
            const placeholder = designSurface.querySelector('.placeholder');
            if (placeholder) {
                if (deployedRuntimeMode) {
                    placeholder.style.display = 'none';
                } else {
                    placeholder.style.display = getCurrentPage().widgets.length === 0 ? 'block' : 'none';
                }
            }
        }

        function getDropCell(event) {
            const rect = designSurface.getBoundingClientRect();
            const gridX = toNumber(gridXSlider.value, 10);
            const gridY = toNumber(gridYSlider.value, 9);
            const x = Math.max(0, Math.min(rect.width - 1, event.clientX - rect.left));
            const y = Math.max(0, Math.min(rect.height - 1, event.clientY - rect.top));

            return {
                x: Math.max(0, Math.min(gridX - 1, Math.floor(x / (rect.width / gridX)))),
                y: Math.max(0, Math.min(gridY - 1, Math.floor(y / (rect.height / gridY))))
            };
        }

        function isCellOccupied(cellX, cellY) {
            return getCurrentPage().widgets.some(widget =>
                cellX >= widget.cellX &&
                cellX < widget.cellX + Math.max(1, widget.cellWidth) &&
                cellY >= widget.cellY &&
                cellY < widget.cellY + Math.max(1, widget.cellHeight));
        }

        function wouldOverlap(targetWidget, cellX, cellY, cellWidth, cellHeight) {
            const right = cellX + cellWidth;
            const bottom = cellY + cellHeight;

            return getCurrentPage().widgets.some(widget => {
                if (widget.id === targetWidget.id) {
                    return false;
                }

                const otherRight = widget.cellX + Math.max(1, widget.cellWidth);
                const otherBottom = widget.cellY + Math.max(1, widget.cellHeight);
                return cellX < otherRight && right > widget.cellX && cellY < otherBottom && bottom > widget.cellY;
            });
        }

        function isRoundEnabled(value) {
            const text = String(value || '').trim().toLowerCase();
            return text === 'yes' || text === 'enable' || text === 'true' || text === '1';
        }

        function isLampBorderEnabled(value) {
            const text = String(value || '').trim().toLowerCase();
            return text === 'on' || text === 'yes' || text === 'enable' || text === 'true' || text === '1';
        }

        function isNumberEditableEnabled(value) {
            const text = String(value || '').trim().toLowerCase();
            return text === 'enable' || text === 'yes' || text === 'true' || text === '1';
        }

        function normalizeNumberUnit(value) {
            const text = String(value || '').trim();
            if (!text || text.toLowerCase() === 'none' || text === '없음') {
                return '';
            }

            const normalized = text.toLowerCase();
            if (normalized === '섭씨' || normalized === 'celsius' || normalized === '℃') {
                return '°C';
            }
            if (normalized === '화씨' || normalized === 'fahrenheit') {
                return '°F';
            }

            const option = getNumberUnitOptions().find(item => item.value.toLowerCase() === normalized);
            if (option) {
                return option.value;
            }

            return text;
        }

        function isNumberUnitNoSpace(unitText) {
            const text = String(unitText || '').trim().toLowerCase();
            return text === '%' || text === '°c' || text === '°f';
        }

        function formatValueWithUnit(value, unitText) {
            const normalizedUnit = normalizeNumberUnit(unitText);
            if (!normalizedUnit) {
                return String(value);
            }

            const spacer = isNumberUnitNoSpace(normalizedUnit) ? '' : ' ';
            return `${value}${spacer}${normalizedUnit}`;
        }

        function getNumberUnitOptions() {
            return [
                { value: '', label: '없음' },
                { value: '°C', label: '섭씨 (°C)' },
                { value: '°F', label: '화씨 (°F)' },
                { value: '%', label: '퍼센트 (%)' },
                { value: 'bar', label: '압력 (bar)' },
                { value: 'kPa', label: '압력 (kPa)' },
                { value: 'MPa', label: '압력 (MPa)' },
                { value: 'V', label: '전압 (V)' },
                { value: 'A', label: '전류 (A)' },
                { value: 'mA', label: '전류 (mA)' },
                { value: 'Hz', label: '주파수 (Hz)' },
                { value: 'rpm', label: '회전수 (rpm)' },
                { value: 'mm', label: '길이 (mm)' },
                { value: 'L/min', label: '유량 (L/min)' },
                { value: 'm³/h', label: '유량 (m³/h)' },
                { value: 'ms', label: '시간 (ms)' },
                { value: 's', label: '시간 (s)' }
            ];
        }

        function normalizeTextAlignment(value) {
            const text = String(value || '').trim().toLowerCase();
            if (text === 'left') {
                return 'Left';
            }
            if (text === 'right') {
                return 'Right';
            }
            return 'Center';
        }

        function normalizeTextLocation(value) {
            const text = String(value || '').trim().toLowerCase();
            if (text === 'top') {
                return 'Top';
            }
            if (text === 'bottom') {
                return 'Bottom';
            }
            return 'Middle';
        }

        function getTextPositionValue(widget) {
            if (!widget) {
                return 'MiddleCenter';
            }

            const location = normalizeTextLocation(widget.properties.Location);
            const alignment = normalizeTextAlignment(widget.properties.Alignment);
            return `${location}${alignment}`;
        }

        function normalizeTextPosition(value) {
            const text = String(value || '').replace(/\s+/g, '').toLowerCase();
            const map = {
                topleft: 'TopLeft',
                topcenter: 'TopCenter',
                topright: 'TopRight',
                middleleft: 'MiddleLeft',
                middlecenter: 'MiddleCenter',
                middleright: 'MiddleRight',
                bottomleft: 'BottomLeft',
                bottomcenter: 'BottomCenter',
                bottomright: 'BottomRight'
            };

            return map[text] || 'MiddleCenter';
        }

        function textPositionToAlignmentLocation(positionValue) {
            const position = normalizeTextPosition(positionValue);
            let location = 'Middle';
            let alignment = 'Center';

            if (position.startsWith('Top')) {
                location = 'Top';
            } else if (position.startsWith('Bottom')) {
                location = 'Bottom';
            }

            if (position.endsWith('Left')) {
                alignment = 'Left';
            } else if (position.endsWith('Right')) {
                alignment = 'Right';
            }

            return { alignment, location };
        }

        function normalizeSliderDirection(value) {
            const text = String(value || '').trim().toLowerCase();
            return text === 'vertical' || text === '세로' ? 'Vertical' : 'Horizontal';
        }

        function normalizeProgressBarMarking(value) {
            const text = String(value || '').trim().toLowerCase();
            return text === 'off' ? 'Off' : 'On';
        }

        function normalizeGaugeType(value) {
            const text = String(value || '').trim().toLowerCase();
            if (text === 'simple') {
                return 'Simple';
            }

            if (text === 'line') {
                return 'Line';
            }

            return 'Default';
        }

        function getSliderMinimum(widget) {
            return Math.round(toNumber(widget && widget.properties ? widget.properties.Minimum : 0, 0));
        }

        function getSliderMaximum(widget) {
            const minimum = getSliderMinimum(widget);
            let maximum = Math.round(toNumber(widget && widget.properties ? widget.properties.Maximum : 100, 100));
            if (maximum <= minimum) {
                maximum = minimum + 1;
            }

            return maximum;
        }

        function getSliderValue(widget) {
            const minimum = getSliderMinimum(widget);
            const maximum = getSliderMaximum(widget);
            const value = Math.round(toNumber(widget && widget.properties ? widget.properties.Value : minimum, minimum));
            return Math.max(minimum, Math.min(maximum, value));
        }

        function getSliderRatio(widget) {
            const minimum = getSliderMinimum(widget);
            const maximum = getSliderMaximum(widget);
            if (maximum <= minimum) {
                return 0;
            }

            return Math.max(0, Math.min(1, (getSliderValue(widget) - minimum) / (maximum - minimum)));
        }

        function getSliderValueFromPointer(widget, element, event) {
            const track = element.querySelector('.slider-track');
            const rect = (track || element).getBoundingClientRect();
            const minimum = getSliderMinimum(widget);
            const maximum = getSliderMaximum(widget);
            const direction = normalizeSliderDirection(widget.properties.Direction);
            let ratio;

            if (direction === 'Vertical') {
                ratio = (rect.bottom - event.clientY) / Math.max(1, rect.height);
            } else {
                ratio = (event.clientX - rect.left) / Math.max(1, rect.width);
            }

            ratio = Math.max(0, Math.min(1, ratio));
            return Math.round(minimum + ((maximum - minimum) * ratio));
        }

        function isPointerNearSliderTrack(track, direction, event) {
            if (!track) {
                return false;
            }

            const rect = track.getBoundingClientRect();
            const alongPadding = 12;
            const crossPadding = 18;

            if (direction === 'Vertical') {
                return event.clientX >= rect.left - crossPadding &&
                    event.clientX <= rect.right + crossPadding &&
                    event.clientY >= rect.top - alongPadding &&
                    event.clientY <= rect.bottom + alongPadding;
            }

            return event.clientX >= rect.left - alongPadding &&
                event.clientX <= rect.right + alongPadding &&
                event.clientY >= rect.top - crossPadding &&
                event.clientY <= rect.bottom + crossPadding;
        }

        function getSliderKnobPositionStyle(ratio) {
            const clampedRatio = Math.max(0, Math.min(1, ratio));
            const inset = getSliderKnobInset();
            return `calc(${inset}px + (100% - ${inset * 2}px) * ${clampedRatio})`;
        }

        function getSliderKnobInset() {
            return 17;
        }

        function beginRuntimeSliderDrag(event, widget, element) {
            if (!runtimeRunning || !widget || widget.kind !== 'Slider' || typeof event.button === 'number' && event.button !== 0) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            try {
                if (typeof event.pointerId === 'number') {
                    element.setPointerCapture(event.pointerId);
                }
            } catch {
            }

            runtimeDraggingSliderIds.add(widget.id);
            let lastValue = null;
            let latestRuntimeWriteValue = null;
            let lastSentRuntimeWriteValue = null;
            let runtimeWritePromise = Promise.resolve();
            const direction = normalizeSliderDirection(widget.properties.Direction);
            const fill = element.querySelector('.slider-fill');
            const knob = element.querySelector('.slider-knob');

            const updateSliderElement = value => {
                widget.properties.Value = String(value);
                const minimum = getSliderMinimum(widget);
                const maximum = getSliderMaximum(widget);
                const ratio = maximum <= minimum ? 0 : Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)));
                if (fill) {
                    if (direction === 'Vertical') {
                        fill.style.height = `${ratio * 100}%`;
                    } else {
                        fill.style.width = `${ratio * 100}%`;
                    }
                }
                if (knob) {
                    if (direction === 'Vertical') {
                        knob.style.bottom = getSliderKnobPositionStyle(ratio);
                    } else {
                        knob.style.left = getSliderKnobPositionStyle(ratio);
                    }
                }
            };

            const sendLatestRuntimeWrite = () => {
                if (latestRuntimeWriteValue === null || latestRuntimeWriteValue === lastSentRuntimeWriteValue) {
                    return;
                }

                const valueToWrite = latestRuntimeWriteValue;
                lastSentRuntimeWriteValue = valueToWrite;
                runtimeWritePromise = runtimeWritePromise
                    .catch(() => { })
                    .then(() => writeRuntimeWidgetValue(widget, valueToWrite, false));
            };

            const runtimeWriteTimer = window.setInterval(sendLatestRuntimeWrite, 100);

            const applyPointerValue = pointerEvent => {
                const nextValue = getSliderValueFromPointer(widget, element, pointerEvent);
                if (nextValue === lastValue) {
                    return;
                }

                lastValue = nextValue;
                const address = getWidgetRuntimeAddress(widget);
                if (address) {
                    runtimeValues.set(address, nextValue);
                    runtimeLocalValueOverrides.set(address, {
                        value: nextValue,
                        expiresAt: window.performance.now() + 700
                    });
                }
                updateSliderElement(nextValue);
                latestRuntimeWriteValue = nextValue;
            };

            const endDrag = async pointerEvent => {
                applyPointerValue(pointerEvent);
                runtimeDraggingSliderIds.delete(widget.id);
                window.clearInterval(runtimeWriteTimer);
                const finalValue = lastValue ?? getSliderValue(widget);
                latestRuntimeWriteValue = finalValue;
                const address = getWidgetRuntimeAddress(widget);
                if (address) {
                    runtimeValues.set(address, finalValue);
                    runtimeLocalValueOverrides.set(address, {
                        value: finalValue,
                        expiresAt: window.performance.now() + 700
                    });
                }
                try {
                    await runtimeWritePromise;
                } catch {
                }
                await writeRuntimeWidgetValue(widget, finalValue, true);
                window.removeEventListener('pointermove', applyPointerValue);
                window.removeEventListener('pointerup', endDrag);
                window.removeEventListener('pointercancel', endDrag);
            };

            applyPointerValue(event);
            window.addEventListener('pointermove', applyPointerValue);
            window.addEventListener('pointerup', endDrag, { once: true });
            window.addEventListener('pointercancel', endDrag, { once: true });
        }

        function normalizeSliderRangeProperties(widget) {
            if (!widget || !widget.properties) {
                return;
            }

            const minimum = getSliderMinimum(widget);
            const maximum = getSliderMaximum(widget);
            const value = getSliderValue(widget);
            widget.properties.Minimum = String(minimum);
            widget.properties.Maximum = String(maximum);
            widget.properties.Value = String(value);
            widget.properties.Direction = normalizeSliderDirection(widget.properties.Direction);
        }

        function getWidgetRuntimeAddress(widget) {
            if (!widget || !widget.properties) {
                return '';
            }

            const address = String(widget.properties.Address || '').trim();
            return address;
        }

        function getButtonLampRuntimeAddress(widget) {
            if (!widget || widget.kind !== 'Button' || !widget.properties || normalizeButtonLampMode(widget.properties.Lamp) !== 'On') {
                return '';
            }

            return String(widget.properties['Lamp Address'] || '').trim();
        }

        function getRuntimeWidgetValue(widget) {
            const address = getWidgetRuntimeAddress(widget);
            if (!address || !runtimeValues.has(address)) {
                return null;
            }

            const value = Number(runtimeValues.get(address));
            return Number.isFinite(value) ? value : null;
        }

        function collectRuntimeAddresses() {
            const addresses = [];
            const seen = new Set();
            normalizeVisualizationDocumentPages();
            documentModel.pages.forEach(page => {
                (page.widgets || []).forEach(widget => {
                    const address = getWidgetRuntimeAddress(widget);
                    if (!address || seen.has(address)) {
                    } else {
                        seen.add(address);
                        addresses.push({ address, widgetId: widget.id, kind: widget.kind });
                    }

                    const lampAddress = getButtonLampRuntimeAddress(widget);
                    if (lampAddress && !seen.has(lampAddress)) {
                        seen.add(lampAddress);
                        addresses.push({ address: lampAddress, widgetId: `${widget.id}_lamp`, kind: 'ButtonLamp' });
                    }

                    const displayAddress = getWidgetDisplayRuntimeAddress(widget);
                    if (!displayAddress || seen.has(displayAddress)) {
                        return;
                    }

                    seen.add(displayAddress);
                    addresses.push({ address: displayAddress, widgetId: `${widget.id}_display`, kind: 'WidgetDisplay' });
                });
            });

            return addresses;
        }

        function getLinkTransportMode() {
            return String(linkTransportSelect?.value || 'USB').trim();
        }

        function updateLinkTransportRows() {
            const transport = getLinkTransportMode();
            const showEthernet = transport === 'Ethernet';
            if (linkComPortRow) {
                linkComPortRow.style.display = showEthernet ? 'none' : '';
            }
            if (linkEthernetIpRow) {
                linkEthernetIpRow.style.display = showEthernet ? '' : 'none';
            }
            if (linkEthernetPortRow) {
                linkEthernetPortRow.style.display = showEthernet ? '' : 'none';
            }
        }

        function updateUsbConnectionUi(connectionState) {
            const isConnected = !!(connectionState && connectionState.isConnected);
            const portName = connectionState && connectionState.portName ? String(connectionState.portName) : '';
            usbCdcConnectionState = { isConnected, portName };
            const disconnectedText = useKoreanLanguage ? '연결 안됨' : 'Disconnected';
            const connectedText = useKoreanLanguage
                ? `연결됨${portName ? ` (${portName})` : ''}`
                : `Connected${portName ? ` (${portName})` : ''}`;

            if (usbConnectionState) {
                usbConnectionState.textContent = isConnected ? connectedText : disconnectedText;
            }
            if (usbConnectButton) {
                usbConnectButton.textContent = isConnected
                    ? (useKoreanLanguage ? '연결 해제' : 'Disconnect')
                    : (useKoreanLanguage ? '연결' : 'Connect');
            }
        }

        function fillComPortOptions(ports, selectedPortName) {
            if (!linkComPortSelect) {
                return;
            }

            const previous = String(selectedPortName || linkComPortSelect.value || '').trim();
            const normalizedPorts = Array.isArray(ports)
                ? ports.map(item => String(item || '').trim()).filter(Boolean)
                : [];
            const activeValue = previous && normalizedPorts.includes(previous)
                ? previous
                : (normalizedPorts[0] || '');

            linkComPortSelect.innerHTML = '';
            if (normalizedPorts.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = useKoreanLanguage ? '포트 없음' : 'No ports';
                linkComPortSelect.appendChild(option);
                return;
            }

            normalizedPorts.forEach(port => {
                const option = document.createElement('option');
                option.value = port;
                option.textContent = port;
                linkComPortSelect.appendChild(option);
            });
            linkComPortSelect.value = activeValue;
        }

        async function loadUsbCdcPorts(preferredPortName) {
            try {
                const response = await fetch('/api/usb-cdc/ports', { method: 'GET' });
                if (!response.ok) {
                    throw new Error(`USB-CDC ports request failed: ${response.status}`);
                }

                const payload = await response.json();
                fillComPortOptions(payload && payload.ports, preferredPortName || payload?.portName || '');
                updateUsbConnectionUi({
                    isConnected: !!payload?.isConnected,
                    portName: payload?.portName || ''
                });
            } catch (error) {
                fillComPortOptions([], '');
                updateUsbConnectionUi({ isConnected: false, portName: '' });
                console.warn(error);
            }
        }

        async function toggleUsbCdcConnection() {
            const currentlyConnected = !!usbCdcConnectionState.isConnected;
            if (currentlyConnected) {
                try {
                    await fetch('/api/usb-cdc/disconnect', { method: 'POST' });
                } catch (error) {
                    console.warn(error);
                }
                await loadUsbCdcPorts('');
                return;
            }

            const selectedPortName = String(linkComPortSelect?.value || '').trim();
            if (!selectedPortName) {
                await loadUsbCdcPorts('');
                alert(useKoreanLanguage ? '먼저 COM 포트를 선택하세요.' : 'Please select a COM port first.');
                return;
            }

            try {
                const response = await fetch('/api/usb-cdc/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        device: String(linkModelSelect?.value || 'CUBLOC2'),
                        portName: selectedPortName,
                        baudRate: 115200
                    })
                });

                if (!response.ok) {
                    throw new Error(`USB-CDC connect failed: ${response.status}`);
                }

                const payload = await response.json();
                await loadUsbCdcPorts(payload?.portName || selectedPortName);
            } catch (error) {
                console.warn(error);
                alert(useKoreanLanguage ? 'USB-CDC 연결에 실패했습니다.' : 'Failed to connect USB-CDC.');
                await loadUsbCdcPorts(selectedPortName);
            }
        }

        function createRuntimeHubConnection() {
            const recordSeparator = String.fromCharCode(0x1e);
            let socket = null;
            let nextInvocationId = 1;
            const handlers = new Map();
            const pendingInvocations = new Map();
            const closeHandlers = [];

            function dispatchMessage(message) {
                if (!message) {
                    return;
                }

                if (message.type === 1 && message.target) {
                    const targetHandlers = handlers.get(message.target) || [];
                    targetHandlers.forEach(handler => handler(...(message.arguments || [])));
                    return;
                }

                if (message.type === 3 && message.invocationId) {
                    const pending = pendingInvocations.get(message.invocationId);
                    if (!pending) {
                        return;
                    }

                    pendingInvocations.delete(message.invocationId);
                    if (message.error) {
                        pending.reject(new Error(message.error));
                    } else {
                        pending.resolve(message.result);
                    }
                }
            }

            async function negotiateRuntimeHub() {
                const response = await fetch(`${runtimeServerOrigin}/runtimeHub/negotiate?negotiateVersion=1`, { method: 'POST' });
                if (!response.ok) {
                    throw new Error(`SignalR negotiate failed: ${response.status}`);
                }

                return response.json();
            }

            return {
                state: 'Disconnected',
                on(target, handler) {
                    const targetHandlers = handlers.get(target) || [];
                    targetHandlers.push(handler);
                    handlers.set(target, targetHandlers);
                },
                onclose(handler) {
                    closeHandlers.push(handler);
                },
                async start() {
                    if (this.state === 'Connected') {
                        return;
                    }

                    const negotiate = await negotiateRuntimeHub();
                    const token = encodeURIComponent(negotiate.connectionToken || negotiate.connectionId || '');
                    const serverUrl = new URL(runtimeServerOrigin);
                    const scheme = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';
                    const hubPath = `${scheme}//${serverUrl.host}/runtimeHub?id=${token}`;

                    await new Promise((resolve, reject) => {
                        let handshakeComplete = false;
                        socket = new WebSocket(hubPath);
                        socket.onopen = () => {
                            socket.send(JSON.stringify({ protocol: 'json', version: 1 }) + recordSeparator);
                        };
                        socket.onerror = () => reject(new Error('SignalR WebSocket connection failed.'));
                        socket.onclose = () => {
                            this.state = 'Disconnected';
                            pendingInvocations.forEach(pending => pending.reject(new Error('SignalR connection closed.')));
                            pendingInvocations.clear();
                            closeHandlers.forEach(handler => handler());
                        };
                        socket.onmessage = event => {
                            String(event.data)
                                .split(recordSeparator)
                                .filter(Boolean)
                                .forEach(part => {
                                    const message = JSON.parse(part);
                                    if (!handshakeComplete && !Object.prototype.hasOwnProperty.call(message, 'type')) {
                                        handshakeComplete = true;
                                        this.state = 'Connected';
                                        resolve();
                                        return;
                                    }

                                    dispatchMessage(message);
                                });
                        };
                    });
                },
                invoke(target, argument) {
                    if (!socket || this.state !== 'Connected') {
                        return Promise.reject(new Error('SignalR connection is not connected.'));
                    }

                    const invocationId = String(nextInvocationId++);
                    const message = {
                        type: 1,
                        invocationId,
                        target,
                        arguments: argument === undefined ? [] : [argument]
                    };

                    return new Promise((resolve, reject) => {
                        pendingInvocations.set(invocationId, { resolve, reject });
                        socket.send(JSON.stringify(message) + recordSeparator);
                    });
                }
            };
        }

        async function ensureRuntimeConnection() {
            if (!runtimeConnection) {
                runtimeConnection = createRuntimeHubConnection();

                runtimeConnection.on('RuntimeValuesChanged', payload => applyRuntimeValues(payload));
                runtimeConnection.on('RuntimeStateChanged', payload => applyRuntimeState(payload));
                runtimeConnection.onclose(() => {
                    runtimeRunning = false;
                    renderWidgets();
                });
            }

            if (runtimeConnection.state === 'Disconnected') {
                await runtimeConnection.start();
            }

            return runtimeConnection;
        }

        function applyRuntimeValues(payload) {
            runtimeValues = new Map();
            const values = payload && payload.values ? payload.values : {};
            Object.keys(values).forEach(address => runtimeValues.set(address, values[address]));
            const now = window.performance.now();
            runtimeLocalValueOverrides.forEach((override, address) => {
                if (!override || override.expiresAt <= now) {
                    runtimeLocalValueOverrides.delete(address);
                    return;
                }

                runtimeValues.set(address, override.value);
            });
            if (runtimeDraggingSliderIds.size === 0 && !activeNumberInputPopup) {
                renderWidgets();
                if (ldMonitor.isSplitMode()) {
                    ldMonitor.renderDiagram();
                }
            }
        }

        function applyRuntimeState(payload) {
            runtimeStarting = false;
            const wasRuntimeRunning = runtimeRunning;
            runtimeRunning = !!(payload && payload.running);
            if (deployedRuntimeMode) {
                if (runtimeRunning) {
                    document.documentElement.classList.remove('deployed-runtime-booting');
                } else if (payload && payload.error) {
                    document.documentElement.classList.remove('deployed-runtime-booting');
                }
            }
            document.body.classList.toggle('runtime-running', runtimeRunning);
            designSurface.classList.toggle('runtime-running', runtimeRunning);
            applyGridVisibility();
            if (runtimeRunning) {
                selectedCell = null;
                setSelectedWidgets([]);
                removeCellCursorElement();
                removeSelectionMarqueeElement();
            }
            updateRuntimeButtons();
            if (payload && payload.error) {
                console.warn(payload.error);
                alert(payload.error);
            }

            if (!runtimeRunning && runtimeStartPageName && getPageByName(runtimeStartPageName)) {
                activePageName = runtimeStartPageName;
                runtimeStartPageName = '';
            }

            updateGridControlsFromCurrentPage();
            renderWidgets();
            if (!wasRuntimeRunning && runtimeRunning) {
                ldMonitor.subscribeAddresses();
            }
        }

        async function startRuntime() {
            runtimeStarting = true;
            runtimeRunning = false;
            runtimeStartPageName = activePageName;
            if (!deployedRuntimeMode) {
                document.body.classList.remove('runtime-running');
            }
            updateRuntimeButtons();
            if (!deployedRuntimeMode) {
                renderWidgets();
            }

            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage({ type: 'visualization-runtime-start-request' });
                return;
            }

            await continueVisualizationRuntimeStart();
        }

        async function continueVisualizationRuntimeStart() {
            if (!runtimeStarting || runtimeRunning) {
                return;
            }

            try {
                const connection = await ensureRuntimeConnection();
                if (!connection) {
                    return;
                }

                const state = await withRuntimeTimeout(
                    connection.invoke('Start', {
                        addresses: collectRuntimeAddresses(),
                        pollingIntervalMs: 100
                    }),
                    8000,
                    useKoreanLanguage ? '시각화 실행 시작 시간이 초과되었습니다.' : 'Visualization runtime start timed out.'
                );
                applyRuntimeState(state);
            } catch (error) {
                runtimeStarting = false;
                const message = error && error.message ? error.message : String(error);
                applyRuntimeState({
                    running: false,
                    error: message === 'Failed to fetch'
                        ? '시각화 서버에 연결할 수 없습니다. 잠시 후 다시 실행하거나 시각화 페이지를 다시 열어주세요.'
                        : message
                });
            }
        }

        window.continueVisualizationRuntimeStart = continueVisualizationRuntimeStart;

        function failVisualizationRuntimeStart(message) {
            runtimeStarting = false;
            runtimeRunning = false;
            runtimeStartPageName = '';
            document.body.classList.remove('runtime-running');
            designSurface.classList.remove('runtime-running');
            updateRuntimeButtons();
            renderWidgets();

            if (message) {
                alert(message);
            }
        }

        window.failVisualizationRuntimeStart = failVisualizationRuntimeStart;

        async function stopRuntime() {
            if (!runtimeStarting && !runtimeRunning) {
                return;
            }

            try {
                runtimeStarting = false;
                if (runtimeConnection && runtimeConnection.state === 'Connected') {
                    await runtimeConnection.invoke('Stop');
                }
            } catch (error) {
                console.warn(error);
            }

            runtimeRunning = false;
            runtimeValues = new Map();
            runtimeLocalValueOverrides.clear();
            runtimePressedWidgetIds.clear();
            ldMonitor.stop();
            document.body.classList.remove('runtime-running');
            designSurface.classList.remove('runtime-running');
            if (runtimeStartPageName && getPageByName(runtimeStartPageName)) {
                activePageName = runtimeStartPageName;
            }
            runtimeStartPageName = '';
            updateRuntimeButtons();
            updateGridControlsFromCurrentPage();
            renderWidgets();
        }

        window.stopVisualizationRuntimeForHost = stopRuntime;

        function withRuntimeTimeout(promise, timeoutMs, message) {
            let timeoutId = 0;
            const timeout = new Promise((_, reject) => {
                timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
            });

            return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
        }

        function updateRuntimeButtons() {
            if (deployedRuntimeMode) {
                return;
            }

            const resources = useKoreanLanguage ? visualizationTextResources.ko : visualizationTextResources.en;
            const runKey = runtimeStarting ? 'starting' : (runtimeRunning ? 'stop' : 'run');
            runButton.textContent = resources[runKey];
            runButton.dataset.i18n = runKey;
            runButton.disabled = runtimeStarting;
        }

        async function handleRuntimeWidgetClick(widget) {
            if (!widget) {
                return;
            }

            if (widget.kind === 'Number') {
                showRuntimeNumberInput(widget);
                return;
            }

            if (widget.kind !== 'Toggle') {
                return;
            }

            const address = getWidgetRuntimeAddress(widget);
            if (!address) {
                return;
            }

            const currentValue = getRuntimeWidgetValue(widget);
            const nextValue = widget.kind === 'Toggle' && currentValue !== null && currentValue !== 0 ? 0 : 1;
            writeRuntimeWidgetValue(widget, nextValue, true);
        }

        function showRuntimeNumberInput(widget) {
            if (!runtimeRunning || !widget || widget.kind !== 'Number' || !isNumberEditableEnabled(widget.properties.Editable)) {
                return;
            }

            const address = getWidgetRuntimeAddress(widget);
            if (!address) {
                return;
            }

            closeRuntimeNumberInputPopup();

            const widgetElement = Array.from(designSurface.querySelectorAll('.design-widget'))
                .find(element => element.dataset.widgetId === widget.id);
            const widgetRect = widgetElement ? widgetElement.getBoundingClientRect() : designSurface.getBoundingClientRect();
            const currentValue = getRuntimeWidgetValue(widget);
            const initialValue = currentValue !== null ? currentValue : toNumber(widget.properties.Text, 0);

            const popup = document.createElement('div');
            popup.className = 'runtime-number-popup';
            const stopPopupPointerEvent = event => {
                event.stopPropagation();
            };
            popup.addEventListener('pointerdown', stopPopupPointerEvent);
            popup.addEventListener('mousedown', stopPopupPointerEvent);
            popup.addEventListener('click', stopPopupPointerEvent);

            const input = document.createElement('input');
            input.className = 'runtime-number-input';
            input.type = 'text';
            input.inputMode = 'decimal';
            input.value = String(initialValue);
            popup.appendChild(input);

            const keypad = document.createElement('div');
            keypad.className = 'runtime-number-keypad';
            const keys = [
                ['Clear', '⌫'],
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['-', '0', '.'],
                ['Esc', 'Enter']
            ];
            keys.forEach(rowKeys => {
                const row = document.createElement('div');
                row.className = 'runtime-number-keypad-row';
                if (rowKeys.includes('Esc') && rowKeys.includes('Enter')) {
                    row.classList.add('runtime-number-keypad-row-actions');
                }
                rowKeys.forEach(key => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'runtime-number-key';
                    button.dataset.key = key;
                    button.textContent = key;
                    row.appendChild(button);
                });
                keypad.appendChild(row);
            });
            popup.appendChild(keypad);

            document.body.appendChild(popup);

            const popupRect = popup.getBoundingClientRect();
            const margin = 8;
            const left = Math.max(margin, Math.min(window.innerWidth - popupRect.width - margin, widgetRect.left + ((widgetRect.width - popupRect.width) / 2)));
            const top = Math.max(margin, Math.min(window.innerHeight - popupRect.height - margin, widgetRect.bottom + margin));
            popup.style.left = `${left}px`;
            popup.style.top = `${top}px`;

            const close = () => closeRuntimeNumberInputPopup();
            const commit = () => {
                const value = Number(input.value);
                if (!Number.isFinite(value)) {
                    input.focus();
                    input.select();
                    return;
                }

                const nextValue = Math.round(value);
                runtimeValues.set(address, nextValue);
                runtimeLocalValueOverrides.set(address, {
                    value: nextValue,
                    expiresAt: window.performance.now() + 700
                });
                writeRuntimeWidgetValue(widget, nextValue, true);
                closeRuntimeNumberInputPopup();
                renderWidgets();
            };

            const appendKey = key => {
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? input.value.length;
                input.value = `${input.value.slice(0, start)}${key}${input.value.slice(end)}`;
                const nextPosition = start + key.length;
                input.focus();
                input.setSelectionRange(nextPosition, nextPosition);
            };

            const backspace = () => {
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? input.value.length;
                if (start !== end) {
                    input.value = `${input.value.slice(0, start)}${input.value.slice(end)}`;
                    input.setSelectionRange(start, start);
                } else if (start > 0) {
                    input.value = `${input.value.slice(0, start - 1)}${input.value.slice(start)}`;
                    input.setSelectionRange(start - 1, start - 1);
                }

                input.focus();
            };

            const onKeypadClick = event => {
                const button = event.target.closest('.runtime-number-key');
                if (!button) {
                    return;
                }

                const key = button.dataset.key;
                if (key === 'Clear') {
                    input.value = '';
                    input.focus();
                } else if (key === '⌫') {
                    backspace();
                } else if (key === 'Esc') {
                    close();
                } else if (key === 'Enter') {
                    commit();
                } else if (key) {
                    appendKey(key);
                }
            };

            const onKeypadPointerDown = event => {
                if (event.target.closest('.runtime-number-key')) {
                    event.preventDefault();
                }
            };

            const onKeyDown = event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    commit();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    close();
                }
            };

            const onDocumentPointerDown = event => {
                if (!popup.contains(event.target)) {
                    close();
                }
            };

            keypad.addEventListener('click', onKeypadClick);
            keypad.addEventListener('pointerdown', onKeypadPointerDown);
            input.addEventListener('keydown', onKeyDown);
            window.setTimeout(() => document.addEventListener('pointerdown', onDocumentPointerDown), 0);

            activeNumberInputPopup = {
                element: popup,
                cleanup() {
                    document.removeEventListener('pointerdown', onDocumentPointerDown);
                    popup.removeEventListener('pointerdown', stopPopupPointerEvent);
                    popup.removeEventListener('mousedown', stopPopupPointerEvent);
                    popup.removeEventListener('click', stopPopupPointerEvent);
                    input.removeEventListener('keydown', onKeyDown);
                    keypad.removeEventListener('click', onKeypadClick);
                    keypad.removeEventListener('pointerdown', onKeypadPointerDown);
                    popup.remove();
                }
            };

            input.focus();
            input.select();
        }

        function closeRuntimeNumberInputPopup() {
            if (!activeNumberInputPopup) {
                return;
            }

            activeNumberInputPopup.cleanup();
            activeNumberInputPopup = null;
        }

        function beginRuntimeMomentaryButton(event, widget, element) {
            if (!widget || widget.kind !== 'Button') {
                return;
            }

            if (typeof event.button === 'number' && event.button !== 0) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (runtimePressedWidgetIds.has(widget.id)) {
                return;
            }

            selectedCell = null;
            setSelectedWidgets([]);
            removeCellCursorElement();
            removeSelectionMarqueeElement();

            runtimePressedWidgetIds.add(widget.id);
            element.classList.add('runtime-pressed');
            try {
                if (typeof event.pointerId === 'number') {
                    element.setPointerCapture(event.pointerId);
                }
            } catch {
            }

            writeRuntimeWidgetValue(widget, 1, false);

            const endPress = () => {
                runtimePressedWidgetIds.delete(widget.id);
                element.classList.remove('runtime-pressed');
                writeRuntimeWidgetValue(widget, 0, true);
                window.removeEventListener('pointerup', endPress);
                window.removeEventListener('mouseup', endPress);
                window.removeEventListener('touchend', endPress);
            };

            window.addEventListener('pointerup', endPress, { once: true });
            window.addEventListener('mouseup', endPress, { once: true });
            window.addEventListener('touchend', endPress, { once: true });
        }

        async function writeRuntimeWidgetValue(widget, value, applyStateResponse = true) {
            const address = getWidgetRuntimeAddress(widget);
            if (!address) {
                return;
            }

            try {
                const connection = await ensureRuntimeConnection();
                if (!connection) {
                    return;
                }

                const state = await connection.invoke('WriteBit', { address, value, widgetId: widget.id });
                if (applyStateResponse) {
                    applyRuntimeState(state);
                }
            } catch (error) {
                applyRuntimeState({ running: runtimeRunning, error: error.message || String(error) });
            }
        }

        function getTextCssAlignment(value) {
            const alignment = normalizeTextAlignment(value);
            if (alignment === 'Left') {
                return 'flex-start';
            }
            if (alignment === 'Right') {
                return 'flex-end';
            }
            return 'center';
        }

        function getTextCssLocation(value) {
            const location = normalizeTextLocation(value);
            if (location === 'Top') {
                return 'flex-start';
            }
            if (location === 'Bottom') {
                return 'flex-end';
            }
            return 'center';
        }

        function clampNumberTextSize(value) {
            return Math.max(4, Math.min(200, Math.round(toNumber(value, 24))));
        }

        function parseLampSizePercent(value) {
            const parsed = Math.floor(toNumber(value, 100));
            return Math.max(20, Math.min(200, parsed));
        }

        function isColorProperty(key) {
            return String(key || '').toLowerCase().includes('color');
        }

        function getWidgetBorderBackColor(widget) {
            const themeDefaults = getThemeColorDefaults();
            const raw = String(widget?.properties?.['Border Color'] || '').trim();
            const normalized = normalizeCssColor(raw);
            const fallback = normalizeCssColor(themeDefaults.toggleBorderBack) || themeDefaults.toggleBorderBack;
            const resolved = normalized || fallback;
            const hex = toHexColor(resolved);
            return hex || resolved;
        }

        function normalizeCssColor(value) {
            const text = String(value || '').trim();
            if (!text) {
                return '';
            }

            const probe = document.createElement('span');
            probe.style.color = '';
            probe.style.color = text;
            return probe.style.color ? text : '';
        }

        function darkenCssColor(value, factor) {
            const probe = document.createElement('span');
            probe.style.color = value;
            document.body.appendChild(probe);
            const resolvedColor = getComputedStyle(probe).color;
            probe.remove();

            const match = resolvedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
            if (!match) {
                return value;
            }

            const red = Math.max(0, Math.min(255, Math.round(Number(match[1]) * factor)));
            const green = Math.max(0, Math.min(255, Math.round(Number(match[2]) * factor)));
            const blue = Math.max(0, Math.min(255, Math.round(Number(match[3]) * factor)));
            return `rgb(${red}, ${green}, ${blue})`;
        }

        function toNumber(value, fallback) {
            const number = Number(value);
            return Number.isFinite(number) ? number : fallback;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        }

        function applyVisualizationTheme(theme) {
            const useDarkTheme = theme && typeof theme.useDarkTheme === 'boolean'
                ? theme.useDarkTheme
                : true;
            const nextThemeMode = useDarkTheme ? 'dark' : 'light';
            const previousThemeMode = currentThemeMode;
            document.documentElement.dataset.theme = nextThemeMode;
            applyThemeLinkedColors(previousThemeMode, nextThemeMode);
            currentThemeMode = nextThemeMode;
            if (themeModeSelect) {
                themeModeSelect.value = nextThemeMode;
            }
            updateGridControlsFromCurrentPage();
            renderWidgets();
        }

        function isSameColor(firstColor, secondColor) {
            const firstHex = toHexColor(normalizeCssColor(firstColor) || firstColor);
            const secondHex = toHexColor(normalizeCssColor(secondColor) || secondColor);
            return !!firstHex && !!secondHex && firstHex.toUpperCase() === secondHex.toUpperCase();
        }

        function replaceThemeLinkedColor(container, key, sourceColor, targetColor) {
            if (!container || !key) {
                return;
            }

            const currentValue = container[key];
            if (!currentValue || isSameColor(currentValue, sourceColor)) {
                container[key] = targetColor;
            }
        }

        function applyThemeLinkedColors(previousThemeMode, nextThemeMode) {
            const sourceDefaults = getThemeColorDefaults(previousThemeMode);
            const targetDefaults = getThemeColorDefaults(nextThemeMode);

            normalizeVisualizationDocumentPages();
            (documentModel.pages || []).forEach(page => {
                const pageProperties = page?.properties || {};
                replaceThemeLinkedColor(pageProperties, 'pageBackColorHtml', sourceDefaults.pageBack, targetDefaults.pageBack);

                (page.widgets || []).forEach(widget => {
                    if (!widget || !widget.properties) {
                        return;
                    }

                    if (widget.kind === 'Button') {
                        replaceThemeLinkedColor(widget.properties, 'BackColor', sourceDefaults.buttonBack, targetDefaults.buttonBack);
                        replaceThemeLinkedColor(widget.properties, 'ForeColor', sourceDefaults.buttonFore, targetDefaults.buttonFore);
                        replaceThemeLinkedColor(widget.properties, 'LampColor', sourceDefaults.buttonLamp, targetDefaults.buttonLamp);
                    } else if (widget.kind === 'Lamp') {
                        replaceThemeLinkedColor(widget.properties, 'DisplayColor', sourceDefaults.lampDisplay, targetDefaults.lampDisplay);
                        replaceThemeLinkedColor(widget.properties, 'Border Color', sourceDefaults.toggleBorderBack, targetDefaults.toggleBorderBack);
                    } else if (widget.kind === 'Toggle') {
                        replaceThemeLinkedColor(widget.properties, 'DisplayColor', sourceDefaults.toggleDisplay, targetDefaults.toggleDisplay);
                        replaceThemeLinkedColor(widget.properties, 'Border Color', sourceDefaults.toggleBorderBack, targetDefaults.toggleBorderBack);
                    } else if (widget.kind === 'Number') {
                        replaceThemeLinkedColor(widget.properties, 'DisplayColor', sourceDefaults.numberDisplay, targetDefaults.numberDisplay);
                    } else if (widget.kind === 'Text') {
                        replaceThemeLinkedColor(widget.properties, 'DisplayColor', sourceDefaults.textDisplay, targetDefaults.textDisplay);
                        replaceThemeLinkedColor(widget.properties, 'Border Color', sourceDefaults.textBorder, targetDefaults.textBorder);
                    } else if (widget.kind === 'ProgressBar') {
                        replaceThemeLinkedColor(widget.properties, 'DisplayColor', sourceDefaults.progressDisplay, targetDefaults.progressDisplay);
                    } else if (widget.kind === 'Gauge') {
                        replaceThemeLinkedColor(widget.properties, 'Color', sourceDefaults.gaugeDisplay, targetDefaults.gaugeDisplay);
                        if (widget.properties.DisplayColor && !widget.properties.Color) {
                            widget.properties.Color = widget.properties.DisplayColor;
                        }
                    }
                });
            });
        }

        window.applyVisualizationTheme = applyVisualizationTheme;

        function exportVisualizationDocumentText() {
            return JSON.stringify(documentModel);
        }

        function importVisualizationDocumentText(text) {
            if (!text || !String(text).trim()) {
                return;
            }

            const nextDocumentModel = JSON.parse(text);
            if (!nextDocumentModel || !Array.isArray(nextDocumentModel.pages)) {
                return;
            }

            ldMonitor.setFeatureEnabled(getDeployMonitorOptionFromDocument(nextDocumentModel));
            documentModel.version = nextDocumentModel.version || 1;
            documentModel.pages = nextDocumentModel.pages;
            normalizeVisualizationDocumentPages();
            applyThemeLinkedColors('light', currentThemeMode);
            applyThemeLinkedColors('dark', currentThemeMode);
            activePageName = getPageByName('Page1') ? 'Page1' : (documentModel.pages[0].name || 'Page1');
            selectedWidgetId = null;
            selectedWidgetIds = [];
            selectedCell = null;
            undoStack.length = 0;
            redoStack.length = 0;
            nextWidgetId = getNextWidgetIdFromDocument();
            updateGridControlsFromCurrentPage();
            renderProjectTree();
            renderWidgets();
        }

        function getNextWidgetIdFromDocument() {
            let maxWidgetNumber = 0;
            (documentModel.pages || []).forEach(page => {
                (page.widgets || []).forEach(widget => {
                    const match = String(widget.id || '').match(/^w(\d+)$/);
                    if (match) {
                        maxWidgetNumber = Math.max(maxWidgetNumber, Number(match[1]));
                    }
                });
            });

            return maxWidgetNumber + 1;
        }

        function updateGridControlsFromCurrentPage() {
            const page = getCurrentPage();
            const gridX = Math.max(5, Math.min(49, toNumber(page?.properties?.gridDivisionsX, 49)));
            const gridY = Math.max(5, Math.min(30, toNumber(page?.properties?.gridDivisionsY, 30)));
            const pageBackColor = normalizeCssColor(page?.properties?.pageBackColorHtml) || getThemeColorDefaults().pageBack;
            gridXSlider.value = String(gridX);
            gridYSlider.value = String(gridY);
            designSurface.style.setProperty('--grid-x', String(gridX));
            designSurface.style.setProperty('--grid-y', String(gridY));
            designSurface.style.backgroundColor = pageBackColor;
            if (workArea) {
                workArea.style.backgroundColor = pageBackColor;
            }
            gridXValue.textContent = String(gridX);
            gridYValue.textContent = String(gridY);
            if (pageBackColorSwatch) {
                pageBackColorSwatch.style.backgroundColor = pageBackColor;
            }
            applyGridVisibility();
        }

        function applyAlignmentTooltips(resources) {
            const setTooltip = (element, text) => {
                if (!element || !text) {
                    return;
                }

                element.title = text;
                element.setAttribute('aria-label', text);
            };

            setTooltip(alignTopButton, resources.alignTopTooltip);
            setTooltip(alignBottomButton, resources.alignBottomTooltip);
            setTooltip(alignLeftButton, resources.alignLeftTooltip);
            setTooltip(alignRightButton, resources.alignRightTooltip);
            setTooltip(distributeHorizontalButton, resources.distributeHorizontalTooltip);
            setTooltip(distributeVerticalButton, resources.distributeVerticalTooltip);
            setTooltip(matchSizeButton, resources.matchSizeTooltip);
            setTooltip(arrayDuplicateButton, resources.arrayDuplicateTooltip);
        }

        function closeArrayDuplicateDialog() {
            document.querySelectorAll('.array-duplicate-dialog-overlay').forEach(element => element.remove());
        }

        function applyArrayDuplicate(rows, columns, gapX, gapY) {
            if (runtimeRunning || selectedWidgetIds.length === 0) {
                return;
            }

            const page = getCurrentPage();
            const selected = page.widgets.filter(widget => selectedWidgetIds.includes(widget.id));
            if (selected.length === 0) {
                return;
            }

            const minX = Math.min(...selected.map(widget => widget.cellX));
            const minY = Math.min(...selected.map(widget => widget.cellY));
            const maxX = Math.max(...selected.map(widget => widget.cellX + Math.max(1, widget.cellWidth)));
            const maxY = Math.max(...selected.map(widget => widget.cellY + Math.max(1, widget.cellHeight)));
            const blockWidth = Math.max(1, maxX - minX);
            const blockHeight = Math.max(1, maxY - minY);
            const gridX = toNumber(gridXSlider.value, 54);
            const gridY = toNumber(gridYSlider.value, 30);

            const createdWidgets = [];
            const occupiedRects = page.widgets.map(widget => ({
                x: widget.cellX,
                y: widget.cellY,
                width: Math.max(1, widget.cellWidth),
                height: Math.max(1, widget.cellHeight)
            }));

            for (let row = 0; row < rows; row += 1) {
                for (let col = 0; col < columns; col += 1) {
                    if (row === 0 && col === 0) {
                        continue;
                    }

                    const offsetX = col * (blockWidth + gapX);
                    const offsetY = row * (blockHeight + gapY);
                    for (const source of selected) {
                        const nextX = source.cellX + offsetX;
                        const nextY = source.cellY + offsetY;
                        const nextWidth = Math.max(1, source.cellWidth);
                        const nextHeight = Math.max(1, source.cellHeight);
                        if (nextX < 0 || nextY < 0 || nextX + nextWidth > gridX || nextY + nextHeight > gridY) {
                            continue;
                        }

                        const nextRect = { x: nextX, y: nextY, width: nextWidth, height: nextHeight };
                        if (occupiedRects.some(rect => rectanglesOverlap(rect, nextRect))) {
                            continue;
                        }

                        const widget = {
                            id: `w${nextWidgetId++}`,
                            kind: source.kind,
                            cellX: nextX,
                            cellY: nextY,
                            cellWidth: nextWidth,
                            cellHeight: nextHeight,
                            properties: { ...source.properties }
                        };

                        widget.properties.Name = createCopiedWidgetName(source);
                        widget.properties.X = String(nextX);
                        widget.properties.Y = String(nextY);
                        createdWidgets.push(widget);
                        occupiedRects.push(nextRect);
                    }
                }
            }

            if (createdWidgets.length === 0) {
                return;
            }

            pushUndoState();
            createdWidgets.forEach(widget => page.widgets.push(widget));
            setSelectedWidgets(createdWidgets.map(widget => widget.id));
            renderWidgets();
        }

        function openArrayDuplicateDialog() {
            if (runtimeRunning || selectedWidgetIds.length === 0) {
                return;
            }

            closeArrayDuplicateDialog();
            const resources = useKoreanLanguage ? visualizationTextResources.ko : visualizationTextResources.en;

            const overlay = document.createElement('div');
            overlay.className = 'array-duplicate-dialog-overlay';

            const dialog = document.createElement('div');
            dialog.className = 'array-duplicate-dialog';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('aria-label', resources.arrayDuplicateTitle);

            const title = document.createElement('h3');
            title.className = 'array-duplicate-title';
            title.textContent = resources.arrayDuplicateTitle;

            const fieldGrid = document.createElement('div');
            fieldGrid.className = 'array-duplicate-grid';

            const createNumberField = (labelText, defaultValue) => {
                const field = document.createElement('label');
                field.className = 'array-duplicate-field';
                const label = document.createElement('span');
                label.textContent = labelText;
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '1';
                input.max = '20';
                input.value = String(defaultValue);
                field.appendChild(label);
                field.appendChild(input);
                return { field, input };
            };

            const rowsField = createNumberField(resources.rows, 1);
            const columnsField = createNumberField(resources.columns, 2);
            const gapXField = createNumberField(resources.gapX, 1);
            const gapYField = createNumberField(resources.gapY, 1);
            gapXField.input.min = '0';
            gapYField.input.min = '0';

            fieldGrid.appendChild(rowsField.field);
            fieldGrid.appendChild(columnsField.field);
            fieldGrid.appendChild(gapXField.field);
            fieldGrid.appendChild(gapYField.field);

            const footer = document.createElement('div');
            footer.className = 'array-duplicate-footer';
            const applyButton = document.createElement('button');
            applyButton.type = 'button';
            applyButton.className = 'toolbar-button';
            applyButton.textContent = resources.apply;
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'toolbar-button';
            cancelButton.textContent = resources.cancel;

            applyButton.addEventListener('click', () => {
                const rows = Math.max(1, Math.min(20, Math.floor(toNumber(rowsField.input.value, 1))));
                const columns = Math.max(1, Math.min(20, Math.floor(toNumber(columnsField.input.value, 2))));
                const gapX = Math.max(0, Math.floor(toNumber(gapXField.input.value, 1)));
                const gapY = Math.max(0, Math.floor(toNumber(gapYField.input.value, 1)));
                applyArrayDuplicate(rows, columns, gapX, gapY);
                closeArrayDuplicateDialog();
            });
            cancelButton.addEventListener('click', closeArrayDuplicateDialog);
            overlay.addEventListener('pointerdown', event => {
                if (event.target === overlay) {
                    closeArrayDuplicateDialog();
                }
            });

            footer.appendChild(applyButton);
            footer.appendChild(cancelButton);

            dialog.appendChild(title);
            dialog.appendChild(fieldGrid);
            dialog.appendChild(footer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        }

        window.exportVisualizationDocumentText = exportVisualizationDocumentText;
        window.importVisualizationDocumentText = importVisualizationDocumentText;
        window.setActiveVisualizationPage = setActiveVisualizationPage;
        window.renameVisualizationPage = renameVisualizationPage;
        window.deleteVisualizationPage = deleteVisualizationPage;

        function applyVisualizationLanguage(language) {
            useKoreanLanguage = language && typeof language.useKorean === 'boolean'
                ? language.useKorean
                : true;

            const resources = useKoreanLanguage ? visualizationTextResources.ko : visualizationTextResources.en;
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.dataset.i18n;
                if (Object.prototype.hasOwnProperty.call(resources, key)) {
                    element.textContent = resources[key];
                }
            });
            const projectAddButton = document.getElementById('projectAddPageButton');
            if (projectAddButton) {
                projectAddButton.title = useKoreanLanguage ? '페이지 추가' : 'Add page';
                projectAddButton.setAttribute('aria-label', useKoreanLanguage ? '페이지 추가' : 'Add page');
            }
            applyAlignmentTooltips(resources);
            updateRuntimeButtons();
            if (languageModeSelect) {
                languageModeSelect.value = useKoreanLanguage ? 'ko' : 'en';
            }
            updateActivePageLabel();
            renderProperties();
            updateUsbConnectionUi(usbCdcConnectionState);
        }

        window.applyVisualizationLanguage = applyVisualizationLanguage;

        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.addEventListener('message', event => {
                if (event.data && event.data.type === 'visualization-theme') {
                    applyVisualizationTheme(event.data);
                }
                if (event.data && event.data.type === 'visualization-language') {
                    applyVisualizationLanguage(event.data);
                }
                if (event.data && event.data.type === 'visualization-grid-visible-setting') {
                    applyHostGridVisibilitySetting(event.data);
                }
            });
        }

        function updateGridDivisions() {
            const gridX = gridXSlider.value;
            const gridY = gridYSlider.value;
            const page = getCurrentPage();
            const previousGridX = page.properties.gridDivisionsX;
            const previousGridY = page.properties.gridDivisionsY;
            if ((Number(gridX) !== previousGridX || Number(gridY) !== previousGridY) && previousGridX !== undefined && previousGridY !== undefined) {
                pushUndoState();
            }
            page.properties.gridDivisionsX = Number(gridX);
            page.properties.gridDivisionsY = Number(gridY);
            designSurface.style.setProperty('--grid-x', gridX);
            designSurface.style.setProperty('--grid-y', gridY);
            gridXValue.textContent = gridX;
            gridYValue.textContent = gridY;
            setSelectedWidgets(selectedWidgetIds.filter(widgetId => page.widgets.some(widget => widget.id === widgetId)));
            if (selectedCell && (selectedCell.x >= Number(gridX) || selectedCell.y >= Number(gridY))) {
                selectedCell = null;
            }
            renderWidgets();
        }

        function beginPropertyPanelResize(event) {
            event.preventDefault();
            activePropertyPanelResize = {
                startPointerX: event.clientX,
                startWidth: rightPanel.getBoundingClientRect().width
            };

            propertySplitter.classList.add('is-dragging');
            document.body.classList.add('is-resizing-property-panel');
            propertySplitter.setPointerCapture(event.pointerId);
            window.addEventListener('pointermove', resizePropertyPanel);
            window.addEventListener('pointerup', endPropertyPanelResize, { once: true });
        }

        function resizePropertyPanel(event) {
            if (!activePropertyPanelResize) {
                return;
            }

            const nextWidth = Math.max(180, Math.min(520, activePropertyPanelResize.startWidth - (event.clientX - activePropertyPanelResize.startPointerX)));
            rightPanel.style.flexBasis = `${nextWidth}px`;
            rightPanel.style.width = `${nextWidth}px`;
            renderWidgets();
        }

        function endPropertyPanelResize() {
            activePropertyPanelResize = null;
            propertySplitter.classList.remove('is-dragging');
            document.body.classList.remove('is-resizing-property-panel');
            window.removeEventListener('pointermove', resizePropertyPanel);
        }

        function beginRightPanelResize(event) {
            event.preventDefault();
            const rightPanelRect = rightPanel.getBoundingClientRect();
            activeRightPanelResize = {
                startPointerY: event.clientY,
                startProjectHeight: projectPanel.getBoundingClientRect().height,
                totalHeight: rightPanelRect.height - rightPanelSplitter.getBoundingClientRect().height
            };

            rightPanelSplitter.classList.add('is-dragging');
            document.body.classList.add('is-resizing-right-panel');
            rightPanelSplitter.setPointerCapture(event.pointerId);
            window.addEventListener('pointermove', resizeRightPanel);
            window.addEventListener('pointerup', endRightPanelResize, { once: true });
        }

        function resizeRightPanel(event) {
            if (!activeRightPanelResize) {
                return;
            }

            const minPaneHeight = 80;
            const maxProjectHeight = Math.max(minPaneHeight, activeRightPanelResize.totalHeight - minPaneHeight);
            const nextProjectHeight = Math.max(minPaneHeight, Math.min(maxProjectHeight, activeRightPanelResize.startProjectHeight + (event.clientY - activeRightPanelResize.startPointerY)));
            const nextPropertyHeight = Math.max(minPaneHeight, activeRightPanelResize.totalHeight - nextProjectHeight);
            projectPanel.style.flexBasis = `${nextProjectHeight}px`;
            propertyPanel.style.flexBasis = `${nextPropertyHeight}px`;
            renderWidgets();
        }

        function endRightPanelResize() {
            activeRightPanelResize = null;
            rightPanelSplitter.classList.remove('is-dragging');
            document.body.classList.remove('is-resizing-right-panel');
            window.removeEventListener('pointermove', resizeRightPanel);
        }

        document.querySelectorAll('.widget-tool[data-widget-kind]').forEach(toolButton => {
            toolButton.addEventListener('dragstart', event => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('text/plain', toolButton.dataset.widgetKind || '');
            });
        });

        designSurface.addEventListener('dragover', event => {
            if (deployedRuntimeMode) {
                return;
            }

            const kind = event.dataTransfer.types.includes('text/plain') ? event.dataTransfer.getData('text/plain') : '';
            if (isSupportedWidgetKind(kind) || kind === '') {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                designSurface.classList.add('drag-over');
            }
        });

        designSurface.addEventListener('dragleave', event => {
            if (deployedRuntimeMode) {
                return;
            }

            if (!designSurface.contains(event.relatedTarget)) {
                designSurface.classList.remove('drag-over');
            }
        });

        designSurface.addEventListener('drop', event => {
            if (deployedRuntimeMode) {
                return;
            }

            if (runtimeRunning) {
                return;
            }

            event.preventDefault();
            designSurface.classList.remove('drag-over');

            const kind = event.dataTransfer.getData('text/plain');
            if (!isSupportedWidgetKind(kind)) {
                return;
            }

            const cell = getDropCell(event);
            if (isCellOccupied(cell.x, cell.y)) {
                return;
            }

            const widget = createWidget(kind, cell.x, cell.y);
            pushUndoState();
            getCurrentPage().widgets.push(widget);
            setSelectedWidgets([widget.id]);
            renderWidgets();
        });

        designSurface.addEventListener('pointerdown', beginMarqueeSelection);

        window.addEventListener('resize', renderWidgets);

        propertyGridBody.addEventListener('change', event => {
            if (deployedRuntimeMode) {
                return;
            }

            if (runtimeRunning) {
                return;
            }

            const editor = event.target.closest('.property-input, .property-select');
            if (!editor) {
                return;
            }

            updateSelectedWidgetProperty(editor.dataset.propertyKey, editor.value);
        });

        propertyGridBody.addEventListener('click', event => {
            if (deployedRuntimeMode) {
                return;
            }

            const colorButton = event.target.closest('.property-color-button');
            if (colorButton) {
                openPropertyColorPicker(colorButton.dataset.colorPropertyKey, colorButton);
                return;
            }

            const positionButton = event.target.closest('.property-position-button');
            if (positionButton) {
                const widget = getCurrentPage().widgets.find(item => item.id === selectedWidgetId);
                updateTextWidgetPosition(widget, positionButton.dataset.positionValue);
                return;
            }

            const stepButton = event.target.closest('.property-stepper-button');
            if (stepButton) {
                const propertyKey = stepButton.dataset.stepPropertyKey;
                const delta = toNumber(stepButton.dataset.stepDelta, 0);
                const widget = getCurrentPage().widgets.find(item => item.id === selectedWidgetId);
                if (!widget || !propertyKey) {
                    return;
                }

                const currentValue = toNumber(widget.properties[propertyKey], 24);
                updateSelectedWidgetProperty(propertyKey, String(clampNumberTextSize(currentValue + delta)));
                return;
            }

            const editor = event.target.closest('.property-address-input');
            if (!editor) {
                return;
            }

            const widget = getCurrentPage().widgets.find(item => item.id === selectedWidgetId);
            if (!widget) {
                return;
            }

            requestAddressInput(widget, editor.dataset.propertyKey || 'Address');
        });

        function openPropertyColorPicker(propertyKey, anchorElement) {
            if (!propertyKey || runtimeRunning) {
                return;
            }

            const widget = getCurrentPage().widgets.find(item => item.id === selectedWidgetId);
            if (!widget) {
                return;
            }

            const currentColor = normalizeCssColor(widget.properties[propertyKey]) || '#000000';
            document.querySelectorAll('.property-color-popup').forEach(element => element.remove());

            const popup = document.createElement('div');
            popup.className = 'property-color-popup';

            const header = document.createElement('div');
            header.className = 'property-color-popup-header';

            const title = document.createElement('span');
            title.textContent = propertyKey;
            header.appendChild(title);

            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'property-color-popup-close';
            closeButton.textContent = '×';
            closeButton.setAttribute('aria-label', 'Close');
            header.appendChild(closeButton);

            const picker = document.createElement('input');
            picker.type = 'color';
            picker.value = toHexColor(currentColor) || '#000000';
            picker.className = 'property-color-popup-picker';

            const htmlValueInput = document.createElement('input');
            htmlValueInput.type = 'text';
            htmlValueInput.className = 'property-input property-color-value-input';
            htmlValueInput.value = (toHexColor(currentColor) || '#000000').toUpperCase();
            htmlValueInput.maxLength = 7;

            const palette = document.createElement('div');
            palette.className = 'property-color-palette';
            const selectedHex = picker.value.toUpperCase();
            defaultColorPalette.forEach(color => {
                const swatch = document.createElement('button');
                swatch.type = 'button';
                swatch.className = 'property-color-palette-item';
                if (color.toUpperCase() === selectedHex) {
                    swatch.classList.add('selected');
                }
                swatch.style.backgroundColor = color;
                swatch.title = color;
                swatch.addEventListener('click', () => {
                    picker.value = color;
                    htmlValueInput.value = color.toUpperCase();
                    updateSelectedWidgetProperty(propertyKey, color);
                    closePopup();
                });
                palette.appendChild(swatch);
            });

            picker.addEventListener('input', () => {
                const hex = String(picker.value || '').toUpperCase();
                htmlValueInput.value = hex;
                updateSelectedWidgetProperty(propertyKey, hex);
            });

            htmlValueInput.addEventListener('change', () => {
                const normalized = toHexColor(htmlValueInput.value);
                if (!normalized) {
                    htmlValueInput.value = (toHexColor(picker.value) || '#000000').toUpperCase();
                    return;
                }

                picker.value = normalized;
                htmlValueInput.value = normalized.toUpperCase();
                updateSelectedWidgetProperty(propertyKey, normalized);
            });

            popup.appendChild(header);
            popup.appendChild(htmlValueInput);
            popup.appendChild(picker);
            popup.appendChild(palette);
            document.body.appendChild(popup);

            const anchorRect = anchorElement.getBoundingClientRect();
            const popupRect = popup.getBoundingClientRect();
            const left = Math.max(8, Math.min(window.innerWidth - popupRect.width - 8, anchorRect.right - popupRect.width));
            const top = Math.max(8, Math.min(window.innerHeight - popupRect.height - 8, anchorRect.bottom + 6));
            popup.style.left = `${left}px`;
            popup.style.top = `${top}px`;

            const closePopup = () => popup.remove();

            closeButton.addEventListener('click', closePopup);
        }

        function openPageBackColorPicker(anchorElement) {
            const page = getCurrentPage();
            if (!page || !anchorElement) {
                return;
            }

            const currentColor = normalizeCssColor(page.properties.pageBackColorHtml) || '#202124';
            document.querySelectorAll('.property-color-popup').forEach(element => element.remove());

            const popup = document.createElement('div');
            popup.className = 'property-color-popup';

            const header = document.createElement('div');
            header.className = 'property-color-popup-header';

            const title = document.createElement('span');
            title.textContent = 'Back';
            header.appendChild(title);

            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'property-color-popup-close';
            closeButton.textContent = '×';
            closeButton.setAttribute('aria-label', 'Close');
            header.appendChild(closeButton);

            const picker = document.createElement('input');
            picker.type = 'color';
            picker.value = toHexColor(currentColor) || '#202124';
            picker.className = 'property-color-popup-picker';

            const htmlValueInput = document.createElement('input');
            htmlValueInput.type = 'text';
            htmlValueInput.className = 'property-input property-color-value-input';
            htmlValueInput.value = (toHexColor(currentColor) || '#202124').toUpperCase();
            htmlValueInput.maxLength = 7;

            const palette = document.createElement('div');
            palette.className = 'property-color-palette';
            const selectedHex = picker.value.toUpperCase();
            defaultColorPalette.forEach(color => {
                const swatch = document.createElement('button');
                swatch.type = 'button';
                swatch.className = 'property-color-palette-item';
                if (color.toUpperCase() === selectedHex) {
                    swatch.classList.add('selected');
                }
                swatch.style.backgroundColor = color;
                swatch.title = color;
                swatch.addEventListener('click', () => {
                    picker.value = color;
                    htmlValueInput.value = color.toUpperCase();
                    const normalized = normalizeCssColor(color) || '#202124';
                    page.properties.pageBackColorHtml = normalized;
                    updateGridControlsFromCurrentPage();
                    renderWidgets();
                    closePopup();
                });
                palette.appendChild(swatch);
            });

            picker.addEventListener('input', () => {
                const hex = String(picker.value || '').toUpperCase();
                htmlValueInput.value = hex;
                page.properties.pageBackColorHtml = hex;
                updateGridControlsFromCurrentPage();
                renderWidgets();
            });

            htmlValueInput.addEventListener('change', () => {
                const normalized = toHexColor(htmlValueInput.value);
                if (!normalized) {
                    htmlValueInput.value = (toHexColor(picker.value) || '#202124').toUpperCase();
                    return;
                }

                picker.value = normalized;
                htmlValueInput.value = normalized.toUpperCase();
                page.properties.pageBackColorHtml = normalized;
                updateGridControlsFromCurrentPage();
                renderWidgets();
            });

            popup.appendChild(header);
            popup.appendChild(htmlValueInput);
            popup.appendChild(picker);
            popup.appendChild(palette);
            document.body.appendChild(popup);

            const anchorRect = anchorElement.getBoundingClientRect();
            const popupRect = popup.getBoundingClientRect();
            const left = Math.max(8, Math.min(window.innerWidth - popupRect.width - 8, anchorRect.right - popupRect.width));
            const top = Math.max(8, Math.min(window.innerHeight - popupRect.height - 8, anchorRect.bottom + 6));
            popup.style.left = `${left}px`;
            popup.style.top = `${top}px`;

            const closePopup = () => popup.remove();
            closeButton.addEventListener('click', closePopup);
        }

        function toHexColor(value) {
            const probe = document.createElement('span');
            probe.style.color = value;
            document.body.appendChild(probe);
            const resolvedColor = getComputedStyle(probe).color;
            probe.remove();

            const match = resolvedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
            if (!match) {
                return '';
            }

            return [Number(match[1]), Number(match[2]), Number(match[3])]
                .map(component => Math.max(0, Math.min(255, component)).toString(16).padStart(2, '0'))
                .join('')
                .replace(/^/, '#')
                .toUpperCase();
        }

        gridXSlider.addEventListener('input', updateGridDivisions);
        gridYSlider.addEventListener('input', updateGridDivisions);
        if (gridVisibleCheckbox) {
            gridVisibleCheckbox.addEventListener('change', () => {
                setGridVisible(!!gridVisibleCheckbox.checked, true);
            });
        }
        if (alignTopButton) {
            alignTopButton.addEventListener('click', () => alignSelectedWidgets('top'));
        }
        if (alignBottomButton) {
            alignBottomButton.addEventListener('click', () => alignSelectedWidgets('bottom'));
        }
        if (alignLeftButton) {
            alignLeftButton.addEventListener('click', () => alignSelectedWidgets('left'));
        }
        if (alignRightButton) {
            alignRightButton.addEventListener('click', () => alignSelectedWidgets('right'));
        }
        if (distributeHorizontalButton) {
            distributeHorizontalButton.addEventListener('click', () => distributeSelectedWidgets('horizontal'));
        }
        if (distributeVerticalButton) {
            distributeVerticalButton.addEventListener('click', () => distributeSelectedWidgets('vertical'));
        }
        if (matchSizeButton) {
            matchSizeButton.addEventListener('click', () => matchSelectedWidgetSizes('size'));
        }
        if (arrayDuplicateButton) {
            arrayDuplicateButton.addEventListener('click', () => openArrayDuplicateDialog());
        }
        if (pageBackColorButton) {
            pageBackColorButton.addEventListener('click', event => {
                event.preventDefault();
                openPageBackColorPicker(pageBackColorButton);
            });
        }
        if (deployWebServerButton) {
            deployWebServerButton.addEventListener('click', () => {
                if (deployServerStarting) {
                    return;
                }

                openDeployOptionsDialog();
            });

            setDeployButtonState(false);
        }
        if (themeModeSelect) {
            themeModeSelect.addEventListener('change', () => {
                const nextTheme = themeModeSelect.value === 'light' ? 'light' : 'dark';
                applyVisualizationTheme({ useDarkTheme: nextTheme !== 'light' });
            });
        }
        if (languageModeSelect) {
            languageModeSelect.addEventListener('change', () => {
                const useKorean = languageModeSelect.value !== 'en';
                applyVisualizationLanguage({ useKorean });
            });
        }
        if (projectAddPageButton) {
            projectAddPageButton.addEventListener('click', () => addProjectTreePage());
        }
        if (linkTransportSelect) {
            linkTransportSelect.addEventListener('change', async () => {
                updateLinkTransportRows();
                if (getLinkTransportMode() !== 'Ethernet') {
                    await loadUsbCdcPorts('');
                }
            });
        }
        if (usbConnectButton) {
            usbConnectButton.addEventListener('click', () => {
                toggleUsbCdcConnection();
            });
        }
        propertySplitter.addEventListener('pointerdown', beginPropertyPanelResize);
        if (rightPanelSplitter) {
            rightPanelSplitter.addEventListener('pointerdown', beginRightPanelResize);
        }
        runButton.addEventListener('click', () => {
            if (runtimeStarting) {
                return;
            }

            if (runtimeRunning) {
                stopRuntime();
            } else {
                startRuntime();
            }
        });
        document.addEventListener('keydown', handleDesignerKeyDown);
        applyVisualizationTheme({ useDarkTheme: true });
        applyVisualizationLanguage({ useKorean: true });
        tryLoadStandaloneVisualizationDocument();
        renderProjectTree();
        updateActivePageLabel();
        applyGridVisibility();
        updateGridDivisions();
        updateLinkTransportRows();
        loadUsbCdcPorts('');
