# ComfileWEB MCP 서버

ComfileWEB 실행 파일에 로컬 AI 도구용 stdio MCP 서버가 포함됩니다. 별도 런타임 설치는 필요 없습니다.

## 연결

### Codex 간편 연결 (1935 이상)

1. ComfileWEB을 실행하고 화면 상단의 **AI 연결 설정**을 누릅니다.
2. **Codex 연결 설정**을 누릅니다.
3. 설정 완료 후 Codex를 완전히 종료했다가 다시 실행합니다. ComfileWEB과 브라우저 화면은 열어 둡니다.

Codex는 별도로 설치되어 있어야 합니다. 이 PC의 Codex 설정에 현재 설치 경로를 자동 등록하며 기존 설정과 다른 MCP 서버, 도구 제한은 유지합니다. 기존 파일은 같은 폴더에 `config.toml.comfileweb-*.bak`으로 백업합니다. 기본 설정 파일은 사용자 폴더의 `.codex/config.toml`이며 `CODEX_HOME`이 설정되어 있으면 그 위치를 사용합니다. 프로젝트별 설정이나 조직 정책이 연결을 제한하면 해당 설정을 별도로 확인해야 합니다. 원격 PC에서 연 화면에서는 등록할 수 없습니다.

### 수동 연결 및 다른 AI 프로그램

1. ComfileWEB을 일반 실행하고 같은 PC의 브라우저에서 `http://localhost:5000`을 엽니다.
2. AI 도구에 실행 명령을 등록합니다. 서버와 클라이언트는 같은 Windows 사용자/로그인 세션에서 실행해야 합니다.
3. AI 도구를 다시 연결한 뒤 `list_editors`로 편집할 브라우저 탭을 선택합니다. 탭마다 다른 `editorId`가 있습니다.

현재 작업 폴더의 최신 빌드를 사용하는 Claude Desktop 설정 예:

```json
{
  "mcpServers": {
    "comfileweb": {
      "command": "D:\\ComfileWeb\\dist\\ComfileWEB\\ComfileWeb.exe",
      "args": ["--mcp"]
    }
  }
}
```

설치본을 사용할 때는 command를 설치 폴더의 `ComfileWeb.exe` 절대 경로로 바꿉니다. 기본 설치 위치는 `%LOCALAPPDATA%\Programs\ComfileWEB`입니다. 설정 JSON에는 환경 변수 대신 실제 절대 경로를 넣으세요.

일반 stdio 클라이언트에서도 명령은 `ComfileWeb.exe`, 인수는 `--mcp`입니다. `--mcp`는 웹서버를 새로 시작하지 않으며, 이미 실행 중인 앱에 연결합니다. 표준 출력은 JSON-RPC 전용입니다. 지원 프로토콜: 2024-11-05, 2025-03-26, 2025-06-18, 2025-11-25.

## 화면 편집

`list_editors`, `list_projects`, `get_document`, `get_page`, `get_widget_catalog`, `apply_changes`, `edit_history`, `open_project`, `save_project`를 제공합니다.

먼저 `get_document`와 `get_widget_catalog`를 읽습니다. 편집 요청에는 `editorId`와 최신 `expectedRevision`이 필요합니다. 사람이 화면을 바꾸면 이전 revision 요청은 거절됩니다. 좌표는 0부터 시작하는 격자 칸입니다. 지원 위젯은 Button, Lamp, Toggle, Number, Text, Slider, ProgressBar, Gauge, Tank입니다.

`apply_changes.operations`에는 `create_page`, `set_page`, `add`, `update`, `delete`를 넣습니다. 각 항목은 `pageName`으로 페이지를 지정합니다. `add`는 `kind`, `update`/`delete`는 위젯 `id`를 사용합니다. 위치/크기는 `cellX`, `cellY`, `cellWidth`, `cellHeight`, 위젯 속성은 카탈로그의 정확한 속성명을 `properties`에 넣습니다. `set_page.properties`는 `gridDivisionsX`, `gridDivisionsY`, `mobile`, `pageBackColorHtml`, `pageBackgroundSvg`를 받습니다. `pageBackgroundSvg`는 SVG 원문 문자열(최대 256KB)이며 빈 문자열로 배경을 제거합니다. SVG는 격자 및 위젯 뒤에 이미지로 표시되며 프로젝트에 함께 저장됩니다.

한 요청은 전체 검증 후 한 번에 적용되며 기존 실행 취소로 되돌릴 수 있습니다. 격자 초과나 위젯 겹침은 거절합니다. `dryRun: true`는 화면을 바꾸지 않고 결과를 확인합니다. 편집은 메모리에 반영되므로 파일 저장은 `save_project`로 따로 요청하세요. 기존 파일을 덮어쓸 때는 `overwrite: true`가 필요합니다. 저장하지 않은 문서 열기에는 `discardUnsaved: true`가 필요합니다. 실행 모드에서는 편집이 거절됩니다.

## CFNET 실제 장치

`device_status`, `device_connect`, `device_disconnect`, `device_read`, `device_write`를 제공합니다. `headerAddress`는 CFHEADER 주소 0..7입니다. 먼저 상태를 확인하고 명시적으로 연결하세요. CUBLOC2는 지원하지 않습니다.

- 읽기 주소: `DI.0.0`, `DO.0.0`, `ADC.0.0`, `DAC.0.0` 등의 절대 CFNET 주소를 `addresses` 배열로 전달합니다.
- 쓰기 주소: `address`에 DO 또는 DAC만 지정합니다. DO 값은 0/1, DAC 값은 0..4094입니다.
- 실제 쓰기는 `confirmed: true`가 필수입니다. 화면 디자인 요청만으로 장치 출력을 변경하지 마세요. 사용자가 요청한 주소와 값에만 쓰기를 수행하세요.
- 브라우저 실행 모드 중에는 연결 변경과 출력 쓰기가 거절됩니다. 먼저 실행을 중지하세요.
- 출력 반환값은 드라이버 상태이며 독립적인 물리 센서 확인이 아닙니다. 통신 오류나 시간 초과가 나면 적용 여부가 불명확할 수 있으므로 상태를 읽고 확인한 다음 재시도하세요.

## 연결 문제

`APP_UNAVAILABLE`: 일반 ComfileWEB이 같은 사용자/세션에서 실행 중인지 확인하세요. `list_editors`가 비어 있으면 localhost 브라우저 페이지를 열거나 새로 고침하세요. LAN 주소로 연 탭은 편집 연결에 등록되지 않습니다. 여러 앱 인스턴스를 분리하려면 앱과 MCP 프로세스 양쪽에 동일한 `COMFILEWEB_MCP_INSTANCE` 환경 변수를 지정하세요.

## 개발 검증

`node --test tests/mcp-editor.test.cjs`로 편집의 원자성, revision 충돌, 저장 경쟁, 범위 검사 등을 검증합니다. 실제 장치 출력은 자동 테스트에서 변경하지 않습니다.

## 큰 프로젝트와 안전한 업데이트

프로젝트는 UTF-8 JSON 기준 최대 16 MiB, SVG 배경은 페이지별 최대 256 KiB입니다. 큰 프로젝트의 `get_document`는 `summaryOnly: true`와 페이지 목록을 반환합니다. `get_page`에 `pageName`, `offset`, `limit`(기본 20)을 전달해 위젯을 나눠 읽으세요. 배경이 필요 없으면 `includeBackground: false`로 요청합니다. 응답이 크면 `RESPONSE_TOO_LARGE`가 반환되므로 `limit`를 줄이세요. 수정 응답도 큰 문서는 요약으로 반환합니다.

프로젝트 저장은 임시 파일을 완성한 뒤 교체하고, 이전 내용을 같은 경로의 `.cweb.bak`에 보존합니다. 복구하려면 앱을 멈춘 상태에서 백업을 별도 `.cweb` 파일명으로 복사해 여세요.

새 실행 파일이 이전 서버를 발견하면 버전을 비교하고 업데이트를 등록합니다. 브라우저의 **저장 후 업데이트**는 모든 로컬 편집 탭이 저장되고 실행이 중지된 경우에만 재시작합니다. 기존 탭은 새 서버가 준비되면 저장된 프로젝트를 다시 엽니다. 1934 이전 서버에는 이 기능이 없으므로 처음 한 번은 작업 저장 후 이전 앱을 종료해야 합니다. 개발 테스트는 `--no-browser`로 자동 브라우저 열기를 끌 수 있습니다.

빌드는 실행 중인 배포 폴더를 삭제하지 않습니다. 빌드 성공 후 최신 3개와 실행 중인 폴더, 기본 MCP 경로 `dist/ComfileWEB`, 마지막 성공 빌드를 보존하고 나머지 오래된 배포본을 정리합니다. `installer/Cleanup-Builds.ps1 -WhatIf`로 삭제 후보를 미리 확인할 수 있습니다.
