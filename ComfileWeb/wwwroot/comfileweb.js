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

		const name = window.prompt('프로젝트 이름을 입력하세요.', currentProjectName || 'Untitled');
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
				body: JSON.stringify({ name: trimmed, document: documentValue })
			});

			if (!response.ok) {
				const detail = await readErrorDetail(response);
				window.alert('저장에 실패했습니다. ' + detail);
				return;
			}

			const result = await response.json();
			currentProjectName = result.name || trimmed;
			window.alert('저장되었습니다.\n' + (result.fullPath || (currentProjectName + '.cweb')));
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

		if (!Array.isArray(items) || items.length === 0) {
			window.alert('저장된 프로젝트가 없습니다.');
			return;
		}

		const names = items.map(item => item.name);
		const numbered = names.map((projectName, index) => (index + 1) + '. ' + projectName).join('\n');
		const answer = window.prompt('열 프로젝트 번호를 입력하세요.\n\n' + numbered, '1');
		if (answer === null) {
			return;
		}

		const choice = parseInt(String(answer).trim(), 10);
		if (!Number.isInteger(choice) || choice < 1 || choice > names.length) {
			window.alert('올바른 번호를 입력하세요.');
			return;
		}

		const targetName = names[choice - 1];
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
