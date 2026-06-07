// ComfileWeb 편집 전용 스크립트
// visualization.js 가 window 에 노출한 문서 입출력 함수를 이용해
// 로컬 웹서버의 REST API(/api/project/*)로 프로젝트를 저장/열기 한다.
(function () {
	'use strict';

	const saveButton = document.getElementById('comfilewebSaveButton');
	const quickSaveButton = document.getElementById('comfilewebQuickSaveButton');
	const openButton = document.getElementById('comfilewebOpenButton');

	let currentProjectName = '';
	let documentDirty = false;
	let documentSavedOnce = false;

	function updateSaveButtonState() {
		if (quickSaveButton) {
			quickSaveButton.disabled = !documentDirty;
			quickSaveButton.textContent = documentDirty || !documentSavedOnce ? '저장' : '저장됨';
		}
	}

	function setDocumentDirty(isDirty) {
		documentDirty = !!isDirty;
		if (documentDirty) {
			documentSavedOnce = false;
		}
		updateSaveButtonState();
	}

	function setDocumentSaved() {
		documentDirty = false;
		documentSavedOnce = true;
		updateSaveButtonState();
	}

	function markDocumentDirty() {
		setDocumentDirty(true);
	}

	function getDocumentText() {
		if (typeof window.exportVisualizationDocumentText !== 'function') {
			return '';
		}

		return window.exportVisualizationDocumentText();
	}

	function setDocumentText(text) {
		if (typeof window.importVisualizationDocumentText === 'function') {
			window.importVisualizationDocumentText(text);
		}
	}

	function clearCurrentProjectName() {
		currentProjectName = '';
		documentSavedOnce = false;
		setDocumentDirty(false);
	}

	window.clearComfileWebCurrentProjectName = clearCurrentProjectName;

	async function saveProject() {
		return saveProjectAs();
	}

	async function quickSaveProject() {
		if (!documentDirty) {
			return;
		}

		if (!currentProjectName) {
			await saveProjectAs();
			return;
		}

		await saveProjectWithName(currentProjectName);
	}

	async function saveProjectAs() {
		const text = getDocumentText();
		if (!text || !text.trim()) {
			window.alert('저장할 화면 내용이 없습니다.');
			return;
		}

		const saveInfo = await showSaveProjectDialog(currentProjectName || 'Untitled');
		if (saveInfo === null) {
			return;
		}

		const trimmed = String(saveInfo.name || '').trim();
		if (!trimmed) {
			window.alert('프로젝트 이름을 입력하세요.');
			return;
		}

		if (saveInfo.projectsDirectory) {
			const applied = await applyProjectSaveDirectory(saveInfo.projectsDirectory);
			if (!applied) {
				return;
			}
		}

		const canOverwrite = await confirmOverwriteIfProjectExists(trimmed);
		if (!canOverwrite) {
			return;
		}

		return saveProjectWithName(trimmed, text);
	}

	async function saveProjectWithName(projectName, documentText) {
		const text = documentText || getDocumentText();
		if (!text || !text.trim()) {
			window.alert('저장할 화면 내용이 없습니다.');
			return;
		}

		let documentValue;
		try {
			documentValue = JSON.parse(text);
		} catch (error) {
			window.alert('화면 문서를 직렬화하지 못했습니다: ' + (error && error.message ? error.message : error));
			return;
		}

		try {
			const response = await fetch('/api/project/save', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: projectName, documentText: text, document: documentValue })
			});

			if (!response.ok) {
				const detail = await readErrorDetail(response);
				window.alert('저장에 실패했습니다. ' + detail);
				return;
			}

			const result = await response.json();
			currentProjectName = result.name || projectName;
			setDocumentSaved();
			return true;
		} catch (error) {
			window.alert('저장 중 오류가 발생했습니다: ' + (error && error.message ? error.message : error));
		}

		return false;
	}

	async function loadProjectSaveDirectory() {
		try {
			const response = await fetch('/api/project/settings', { method: 'GET', cache: 'no-store' });
			if (!response.ok) {
				return '';
			}

			const payload = await response.json();
			return String(payload && payload.projectsDirectory ? payload.projectsDirectory : '');
		} catch {
			return '';
		}
	}

	async function applyProjectSaveDirectory(projectsDirectory) {
		const trimmed = String(projectsDirectory || '').trim();
		if (!trimmed) {
			window.alert('프로젝트 저장 위치를 입력하세요.');
			return false;
		}

		try {
			const response = await fetch('/api/project/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectsDirectory: trimmed })
			});

			if (!response.ok) {
				const detail = await readErrorDetail(response);
				window.alert('프로젝트 저장 위치를 변경하지 못했습니다. ' + detail);
				return false;
			}

			return true;
		} catch (error) {
			window.alert('프로젝트 저장 위치 변경 중 오류가 발생했습니다: ' + (error && error.message ? error.message : error));
			return false;
		}
	}

	async function confirmOverwriteIfProjectExists(projectName) {
		try {
			const response = await fetch('/api/project/list', { cache: 'no-store' });
			if (!response.ok) {
				return true;
			}

			const items = await response.json();
			const exists = Array.isArray(items) && items.some(item => String(item && item.name ? item.name : '').trim().toLowerCase() === String(projectName || '').trim().toLowerCase());
			if (!exists) {
				return true;
			}

			return window.confirm(`'${projectName}' 프로젝트가 이미 있습니다.\n같은 이름으로 덮어쓰시겠습니까?`);
		} catch {
			return true;
		}
	}

	async function openProject() {
		let items;
		try {
			const response = await fetch('/api/project/list', { cache: 'no-store' });
			if (!response.ok) {
				const detail = await readErrorDetail(response);
				window.alert('목록을 불러오지 못했습니다. ' + detail);
				return;
			}

			items = await response.json();
		} catch (error) {
			window.alert('목록을 불러오는 중 오류가 발생했습니다: ' + (error && error.message ? error.message : error));
			return;
		}

		const normalizedItems = Array.isArray(items) ? items : [];
		const selection = await showOpenProjectDialog(normalizedItems);
		if (!selection) {
			return;
		}

		if (selection.kind === 'server') {
			const targetName = selection.name;
			try {
				const response = await fetch('/api/project/load?name=' + encodeURIComponent(targetName), { cache: 'no-store' });
				if (!response.ok) {
					const detail = await readErrorDetail(response);
					window.alert('프로젝트를 불러오지 못했습니다. ' + detail);
					return;
				}

				const text = await response.text();
				if (!text || !text.trim()) {
					window.alert('프로젝트 내용이 비어 있습니다.');
					return;
				}

				setDocumentText(text);
				currentProjectName = targetName;
				documentSavedOnce = false;
				setDocumentDirty(false);
			} catch (error) {
				window.alert('프로젝트를 불러오는 중 오류가 발생했습니다: ' + (error && error.message ? error.message : error));
			}
			return;
		}

		if (selection.kind === 'file') {
			if (!selection.text || !selection.text.trim()) {
				window.alert('프로젝트 내용이 비어 있습니다.');
				return;
			}

			setDocumentText(selection.text);
			currentProjectName = selection.name || currentProjectName;
			documentSavedOnce = false;
			setDocumentDirty(false);
		}
	}

	function showOpenProjectDialog(items) {
		return new Promise(resolve => {
			const visibleItems = Array.isArray(items) ? items.slice(0, 5) : [];
			let selectedIndex = visibleItems.length > 0 ? 0 : -1;
			let selectedFile = null;

			const overlay = document.createElement('div');
			overlay.style.position = 'fixed';
			overlay.style.inset = '0';
			overlay.style.background = 'rgba(0, 0, 0, 0.45)';
			overlay.style.display = 'flex';
			overlay.style.alignItems = 'center';
			overlay.style.justifyContent = 'center';
			overlay.style.zIndex = '3200';

			const dialog = document.createElement('div');
			dialog.style.width = 'min(760px, 92vw)';
			dialog.style.maxHeight = '80vh';
			dialog.style.display = 'flex';
			dialog.style.flexDirection = 'column';
			dialog.style.gap = '10px';
			dialog.style.padding = '14px';
			dialog.style.border = '1px solid #3f3f46';
			dialog.style.borderRadius = '8px';
			dialog.style.background = '#1f1f23';
			dialog.style.color = '#f4f4f5';
			dialog.style.boxSizing = 'border-box';

			const title = document.createElement('div');
			title.textContent = '프로젝트 열기';
			title.style.fontSize = '14px';
			title.style.fontWeight = '700';

			const list = document.createElement('div');
			list.style.display = 'flex';
			list.style.flexDirection = 'column';
			list.style.gap = '6px';
			list.style.minHeight = '120px';
			list.style.maxHeight = '44vh';
			list.style.overflow = 'auto';
			list.style.padding = '6px';
			list.style.border = '1px solid #3f3f46';
			list.style.borderRadius = '4px';

			const fileStatus = document.createElement('div');
			fileStatus.textContent = '';
			fileStatus.style.display = 'none';
			fileStatus.style.fontSize = '12px';
			fileStatus.style.color = '#a1a1aa';

			const footer = document.createElement('div');
			footer.style.display = 'flex';
			footer.style.justifyContent = 'space-between';
			footer.style.gap = '8px';

			const leftButtons = document.createElement('div');
			leftButtons.style.display = 'flex';
			leftButtons.style.gap = '8px';

			const rightButtons = document.createElement('div');
			rightButtons.style.display = 'flex';
			rightButtons.style.gap = '8px';

			const browseButton = document.createElement('button');
			browseButton.type = 'button';
			browseButton.textContent = '파일 선택';
			applyButtonStyle(browseButton);

			const openButton = document.createElement('button');
			openButton.type = 'button';
			openButton.textContent = '열기';
			applyButtonStyle(openButton);

			const cancelButton = document.createElement('button');
			cancelButton.type = 'button';
			cancelButton.textContent = '취소';
			applyButtonStyle(cancelButton);

			function updateOpenEnabled() {
				openButton.disabled = selectedIndex < 0 && !selectedFile;
			}

			function updateFileStatusVisibility() {
				fileStatus.style.display = fileStatus.textContent ? '' : 'none';
			}

			function renderList() {
				list.innerHTML = '';
				if (visibleItems.length === 0) {
					const empty = document.createElement('div');
					empty.textContent = '저장된 프로젝트가 없습니다. 또는 아래 파일 선택으로 직접 파일을 고르세요.';
					empty.style.fontSize = '12px';
					empty.style.color = '#a1a1aa';
					list.appendChild(empty);
					return;
				}

				visibleItems.forEach((item, index) => {
					const row = document.createElement('button');
					row.type = 'button';
					row.style.display = 'flex';
					row.style.flexDirection = 'column';
					row.style.alignItems = 'flex-start';
					row.style.gap = '2px';
					row.style.width = '100%';
					row.style.padding = '8px';
					row.style.border = '1px solid #3f3f46';
					row.style.borderRadius = '4px';
					row.style.background = index === selectedIndex ? '#0f3d69' : '#27272a';
					row.style.color = '#f4f4f5';
					row.style.textAlign = 'left';
					row.style.cursor = 'pointer';

					const name = document.createElement('div');
					name.textContent = item && item.name ? String(item.name) : 'Untitled';
					name.style.fontSize = '13px';
					name.style.fontWeight = '600';

					const path = document.createElement('div');
					path.textContent = item && item.fullPath ? String(item.fullPath) : '';
					path.style.fontSize = '11px';
					path.style.opacity = '0.82';
					path.style.wordBreak = 'break-all';

					row.appendChild(name);
					if (path.textContent) {
						row.appendChild(path);
					}

					row.addEventListener('click', () => {
						selectedIndex = index;
						selectedFile = null;
						fileStatus.textContent = '';
						updateFileStatusVisibility();
						renderList();
						updateOpenEnabled();
					});

					list.appendChild(row);
				});
			};

			function close(result) {
				overlay.remove();
				resolve(result);
			}

			browseButton.addEventListener('click', () => {
				const picker = document.createElement('input');
				picker.type = 'file';
				picker.accept = '.cweb,application/json,.json,text/plain';
				picker.style.display = 'none';
				picker.addEventListener('change', async () => {
					const file = picker.files && picker.files[0] ? picker.files[0] : null;
					picker.remove();
					if (!file) {
						return;
					}

					try {
						const text = await file.text();
						selectedFile = {
							name: String(file.name || '').replace(/\.cweb$/i, '') || 'Untitled',
							text
						};
						selectedIndex = -1;
						fileStatus.textContent = '선택된 파일: ' + file.name;
						updateFileStatusVisibility();
						renderList();
						updateOpenEnabled();
					} catch (error) {
						window.alert('파일을 읽을 수 없습니다: ' + (error && error.message ? error.message : error));
					}
				}, { once: true });

				document.body.appendChild(picker);
				picker.click();
			});

			openButton.addEventListener('click', () => {
				if (selectedFile) {
					close({ kind: 'file', name: selectedFile.name, text: selectedFile.text });
					return;
				}

				if (selectedIndex >= 0 && visibleItems[selectedIndex]) {
					close({ kind: 'server', name: String(visibleItems[selectedIndex].name || '') });
				}
			});

			cancelButton.addEventListener('click', () => close(null));
			overlay.addEventListener('pointerdown', event => {
				if (event.target === overlay) {
					close(null);
				}
			});

			leftButtons.appendChild(browseButton);
			rightButtons.appendChild(openButton);
			rightButtons.appendChild(cancelButton);
			footer.appendChild(leftButtons);
			footer.appendChild(rightButtons);

			dialog.appendChild(title);
			dialog.appendChild(list);
			dialog.appendChild(fileStatus);
			dialog.appendChild(footer);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			renderList();
			updateOpenEnabled();
		});
	}

	function showSaveProjectDialog(initialName) {
		return new Promise(resolve => {
			const overlay = document.createElement('div');
			overlay.style.position = 'fixed';
			overlay.style.inset = '0';
			overlay.style.background = 'rgba(0, 0, 0, 0.45)';
			overlay.style.display = 'flex';
			overlay.style.alignItems = 'center';
			overlay.style.justifyContent = 'center';
			overlay.style.zIndex = '3200';

			const dialog = document.createElement('div');
			dialog.style.width = 'min(640px, 92vw)';
			dialog.style.display = 'flex';
			dialog.style.flexDirection = 'column';
			dialog.style.gap = '10px';
			dialog.style.padding = '14px';
			dialog.style.border = '1px solid #3f3f46';
			dialog.style.borderRadius = '8px';
			dialog.style.background = '#1f1f23';
			dialog.style.color = '#f4f4f5';
			dialog.style.boxSizing = 'border-box';

			const title = document.createElement('div');
			title.textContent = '프로젝트 저장';
			title.style.fontSize = '14px';
			title.style.fontWeight = '700';

			const label = document.createElement('div');
			label.textContent = '프로젝트 이름';
			label.style.fontSize = '12px';
			label.style.color = '#d4d4d8';

			const input = document.createElement('input');
			input.type = 'text';
			input.value = String(initialName || 'Untitled');
			input.style.height = '34px';
			input.style.padding = '0 10px';
			input.style.border = '1px solid #3f3f46';
			input.style.borderRadius = '4px';
			input.style.background = '#111114';
			input.style.color = '#f4f4f5';
			input.style.font = '13px "Segoe UI", "Malgun Gothic", sans-serif';

			const directoryLabel = document.createElement('div');
			directoryLabel.textContent = '프로젝트 저장 위치';
			directoryLabel.style.fontSize = '12px';
			directoryLabel.style.color = '#d4d4d8';

			const directoryRow = document.createElement('div');
			directoryRow.style.display = 'flex';
			directoryRow.style.gap = '8px';

			const directoryInput = document.createElement('input');
			directoryInput.type = 'text';
			directoryInput.placeholder = '예: D:\\ComfileWeb\\Projects';
			directoryInput.style.height = '34px';
			directoryInput.style.padding = '0 10px';
			directoryInput.style.border = '1px solid #3f3f46';
			directoryInput.style.borderRadius = '4px';
			directoryInput.style.background = '#111114';
			directoryInput.style.color = '#f4f4f5';
			directoryInput.style.font = '13px "Segoe UI", "Malgun Gothic", sans-serif';
			directoryInput.style.flex = '1 1 auto';
			directoryInput.style.minWidth = '0';

			const browseButton = document.createElement('button');
			browseButton.type = 'button';
			browseButton.textContent = '...';
			browseButton.title = '폴더 선택';
			applyButtonStyle(browseButton);
			browseButton.style.flex = '0 0 auto';

			const directoryHelp = document.createElement('div');
			directoryHelp.textContent = '경로를 직접 입력하거나 ... 버튼으로 폴더를 선택한 뒤 저장을 누르세요.';
			directoryHelp.style.fontSize = '12px';
			directoryHelp.style.color = '#a1a1aa';

			directoryRow.appendChild(directoryInput);
			directoryRow.appendChild(browseButton);

			const footer = document.createElement('div');
			footer.style.display = 'flex';
			footer.style.justifyContent = 'flex-end';
			footer.style.gap = '8px';

			const saveButton = document.createElement('button');
			saveButton.type = 'button';
			saveButton.textContent = '저장';
			applyButtonStyle(saveButton);

			const cancelButton = document.createElement('button');
			cancelButton.type = 'button';
			cancelButton.textContent = '취소';
			applyButtonStyle(cancelButton);

			function close(result) {
				overlay.remove();
				resolve(result);
			}

			function commit() {
				close({
					name: input.value,
					projectsDirectory: directoryInput.value
				});
			}

			saveButton.addEventListener('click', commit);
			cancelButton.addEventListener('click', () => close(null));
			input.addEventListener('keydown', event => {
				if (event.key === 'Enter') {
					event.preventDefault();
					commit();
					return;
				}
				if (event.key === 'Escape') {
					event.preventDefault();
					close(null);
				}
			});
			directoryInput.addEventListener('keydown', event => {
				if (event.key === 'Enter') {
					event.preventDefault();
					commit();
					return;
				}
				if (event.key === 'Escape') {
					event.preventDefault();
					close(null);
				}
			});
			browseButton.addEventListener('click', () => openProjectSaveDirectoryPicker(directoryInput));
			overlay.addEventListener('pointerdown', event => {
				if (event.target === overlay) {
					close(null);
				}
			});

			footer.appendChild(saveButton);
			footer.appendChild(cancelButton);
			dialog.appendChild(title);
			dialog.appendChild(label);
			dialog.appendChild(input);
			dialog.appendChild(directoryLabel);
			dialog.appendChild(directoryRow);
			dialog.appendChild(directoryHelp);
			dialog.appendChild(footer);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			loadProjectSaveDirectory().then(projectsDirectory => {
				directoryInput.value = projectsDirectory;
			});

			input.focus();
			input.select();
		});
	}

	function openProjectSaveDirectoryPicker(directoryInput) {
		const picker = document.createElement('input');
		picker.type = 'file';
		picker.setAttribute('webkitdirectory', '');
		picker.setAttribute('directory', '');
		picker.style.display = 'none';

		picker.addEventListener('change', () => {
			const files = picker.files;
			if (!files || files.length === 0) {
				picker.remove();
				return;
			}

			const firstFile = files[0];
			const relativePath = String(firstFile.webkitRelativePath || '');
			const firstSlash = relativePath.indexOf('/');
			const folderName = firstSlash > 0 ? relativePath.slice(0, firstSlash) : relativePath;
			if (folderName && directoryInput) {
				const currentText = String(directoryInput.value || '').trim();
				const normalizedCurrent = currentText.replace(/\\/g, '/').replace(/\/+$/, '');
				const segments = normalizedCurrent.split('/').filter(Boolean);
				if (segments.length > 0) {
					segments[segments.length - 1] = folderName;
					directoryInput.value = segments.join(currentText.includes('\\') ? '\\' : '/');
				} else {
					directoryInput.value = folderName;
				}
			}

			picker.remove();
		}, { once: true });

		document.body.appendChild(picker);
		picker.click();
	}

	function applyButtonStyle(button) {
		button.style.height = '30px';
		button.style.padding = '0 12px';
		button.style.border = '1px solid #3f3f46';
		button.style.borderRadius = '4px';
		button.style.background = '#3f3f46';
		button.style.color = '#f4f4f5';
		button.style.cursor = 'pointer';
		button.style.font = '12px "Segoe UI", "Malgun Gothic", sans-serif';
	}

	async function readErrorDetail(response) {
		try {
			const data = await response.json();
			if (data && data.detail) {
				return String(data.detail);
			}
		} catch {
		}

		return '(HTTP ' + response.status + ')';
	}

	if (saveButton) {
		saveButton.addEventListener('click', saveProject);
	}

	if (quickSaveButton) {
		quickSaveButton.addEventListener('click', quickSaveProject);
	}

	window.addEventListener('comfileweb-document-dirty', markDocumentDirty);
	updateSaveButtonState();

	if (openButton) {
		openButton.addEventListener('click', openProject);
	}
})();
