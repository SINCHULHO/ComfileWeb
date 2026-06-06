// ComfileWeb 편집 전용 스크립트
// visualization.js 가 window 에 노출한 문서 입출력 함수를 이용해
// 로컬 웹서버의 REST API(/api/project/*)로 프로젝트를 저장/열기 한다.
(function () {
	'use strict';

	const saveButton = document.getElementById('comfilewebSaveButton');
	const openButton = document.getElementById('comfilewebOpenButton');

	let currentProjectName = '';

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

	async function saveProject() {
		const text = getDocumentText();
		if (!text || !text.trim()) {
			window.alert('저장할 화면 내용이 없습니다.');
			return;
		}

		const name = await showSaveProjectDialog(currentProjectName || 'Untitled');
		if (name === null) {
			return;
		}

		const trimmed = String(name).trim();
		if (!trimmed) {
			window.alert('프로젝트 이름을 입력하세요.');
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
				body: JSON.stringify({ name: trimmed, documentText: text, document: documentValue })
			});

			if (!response.ok) {
				const detail = await readErrorDetail(response);
				window.alert('저장에 실패했습니다. ' + detail);
				return;
			}

			const result = await response.json();
			currentProjectName = result.name || trimmed;
		} catch (error) {
			window.alert('저장 중 오류가 발생했습니다: ' + (error && error.message ? error.message : error));
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
		}
	}

	function showOpenProjectDialog(items) {
		return new Promise(resolve => {
			let selectedIndex = items.length > 0 ? 0 : -1;
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

			function renderList() {
				list.innerHTML = '';
				if (items.length === 0) {
					const empty = document.createElement('div');
					empty.textContent = '저장된 프로젝트가 없습니다. 또는 아래 파일 선택으로 직접 파일을 고르세요.';
					empty.style.fontSize = '12px';
					empty.style.color = '#a1a1aa';
					list.appendChild(empty);
					return;
				}

				items.forEach((item, index) => {
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

				if (selectedIndex >= 0 && items[selectedIndex]) {
					close({ kind: 'server', name: String(items[selectedIndex].name || '') });
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
			dialog.style.width = 'min(480px, 92vw)';
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

			saveButton.addEventListener('click', () => close(input.value));
			cancelButton.addEventListener('click', () => close(null));
			input.addEventListener('keydown', event => {
				if (event.key === 'Enter') {
					event.preventDefault();
					close(input.value);
					return;
				}
				if (event.key === 'Escape') {
					event.preventDefault();
					close(null);
				}
			});
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
			dialog.appendChild(footer);
			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			input.focus();
			input.select();
		});
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

	if (openButton) {
		openButton.addEventListener('click', openProject);
	}
})();
