ComfileWEB Azure Artifact Signing 빌드
====================================
최초 로그인 또는 인증 만료: 저장소 루트의 _Login-Signing.cmd
이후 빌드: _Build-Installer.cmd
자동화: powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1
PowerShell 7에서도 같은 스크립트를 실행할 수 있습니다.
로그인은 기존 계정과 서명용 토큰 만료를 먼저 확인하고 필요할 때만 실행합니다.
Azure 역할이 부여된 회사 계정으로 브라우저 로그인/MFA를 완료하세요.
브라우저 로그인 대신 필요하면 az login --use-device-code를 사용하세요.
비밀번호, 액세스 토큰, 클라이언트 시크릿은 저장소에 저장하지 않습니다.

출력: dist\installer\ComfileWEB-Setup-<버전>.<빌드번호>-win-x64.exe
버전은 ComfileWebVersion.props를 사용하며 자동 증가하지 않습니다.
검증 성공 후에만 정식 EXE를 원자적으로 교체합니다. 이전 EXE는 해당 빌드 폴더에 보관합니다.
서명/검증 실패 시 새 EXE를 배포하지 않으며 이전 성공본을 보존합니다.
성공 시 기존 방식대로 최신 빌드 바탕화면 바로가기를 갱신합니다.

개별 회사 소유 파일 서명 / 검증:
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\installer\Sign-Artifact.ps1 -FilePath "D:\경로 공백\회사.dll"
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\installer\Sign-Artifact.ps1 -FilePath "D:\경로 공백\회사.dll" -VerifyOnly
이 명령에 타사 미서명 파일을 전달하지 마세요. 소유권은 호출자가 확인해야 합니다.
이미 서명된 파일은 유효한 COMFILE 게시자와 타임스탬프를 검증한 뒤 재사용합니다.
타사 서명 및 유효하지 않은 기존 서명은 덮어쓰지 않고 실패합니다.

기존 리소스: comfile-signing-rg / comfile-signing / comfile-public (Public Trust)
엔드포인트: https://eus.codesigning.azure.net/
Signing.Metadata.json은 AzureCliCredential만 사용합니다. JSON은 UTF-8 BOM 없이 저장합니다.
SHA-256 파일/타임스탬프 해시와 Microsoft RFC 3161 http://timestamp.acs.microsoft.com을 사용합니다.
Windows SDK의 실제 x64 SignTool을 탐색하며 SDK 버전을 경로에 고정하지 않습니다.
필요 시 COMFILEWEB_SIGNTOOL, COMFILEWEB_SIGNING_DLIB에 실제 x64 파일 경로를 지정하세요.
기존 사용자 설치 Artifact Signing Client Tools와 Azure CLI를 재사용하며 자동 설치하지 않습니다.
Client Tools의 runtimeconfig와 설치된 런타임을 그대로 사용합니다.
샌드박스에서 LOCALAPPDATA/로그인 저장소가 달라지면 실제 개발 사용자 환경에서 실행하세요.

ISCC /SComfileAzure=로 도구를 매번 등록합니다. IDE 전역 설정에 의존하지 않습니다.
SignTool=ComfileAzure, SignedUninstaller=yes로 설치본, 임시 실행 이미지, 제거 프로그램을 서명합니다.
$f는 이미 인용된 경로이므로 추가 따옴표를 넣지 않습니다. $q는 따옴표, $$는 달러 문자입니다.
Windows PowerShell 서명 프로세스가 자신의 PSHOME 모듈을 우선하여 PS7 상속 문제를 방지합니다.

회사 소유 서명 목록:
  ComfileWeb.exe / ComfileWeb.dll
  ComfileTech.Cfnet.Cfheader.dll / ComfileTech.Cfnet.Cfheader.Native.dll
CFNET NuGet 2.0.1의 authors/copyright가 COMFILE임을 확인했습니다.
NuGet 캐시는 수정하지 않고 publish 복사본만 서명합니다.
Microsoft 런타임, libusb, Tomlyn 등 다른 EXE/DLL은 서명하지 않으며 전후 해시가 같아야 합니다.
현재 배포는 단일 EXE 번들이 아니므로 번들 전 서명 훅은 필요하지 않습니다.
향후 추출형 단일 EXE로 변경하면 회사 DLL을 번들 전에 서명하도록 별도 구현해야 합니다.

dist\SigningCache: 입력 SHA-256과 메타데이터 SHA-256별 서명 캐시.
재사용 시 기록된 입력/정책/결과 해시, SignTool 신뢰 체인, 게시자, 타임스탬프를 다시 검증합니다.
캐시와 JSON 영수증은 신뢰할 수 있는 로컬 빌드 데이터로 관리하세요.
손상된 캐시는 실패 처리합니다. 해당 캐시 파일과 영수증을 제거한 뒤 다시 빌드하세요.
dist\InstallerBuilds\<빌드ID>: build.log, package-manifest.json, signing-evidence.
매니페스트/서명 증거에는 서명 후 크기와 SHA-256이 기록됩니다.
정식 설치본 옆 .sha256에도 해시를 기록합니다. dist 전체는 Git 제외입니다.

요청 시 설치 검사:
  pwsh -NoProfile -File .\tests\Test-InstallerSigning.ps1 -BuildRoot "dist\InstallerBuilds\<빌드ID>" -IsolatedInstall
정식 EXE는 첫 화면까지만 실행하고 실제 임시 자식 프로세스 서명을 확인합니다.
실제 설치/제거는 같은 payload를 사용하는 별도 AppId의 검사용 변형으로 수행합니다.
변형은 바로가기/자동 실행/앱 종료 코드를 제외하고 저장소 내부에 설치합니다.
설치된 파일 해시, 회사 바이너리와 제거 프로그램 서명, 제거 후 사용자 파일 보존을 확인합니다.
이는 정식 AppId의 기존 설치 업그레이드/제거 테스트가 아닙니다.
하드웨어 기능, SmartScreen 평판, ASR 및 모든 타사 보안 제품 허용 여부는 별도 확인이 필요합니다.
일반 빌드는 설치 검사를 자동 실행하지 않습니다.

공식 참고:
https://learn.microsoft.com/en-us/azure/artifact-signing/how-to-signing-integrations
https://jrsoftware.org/ishelp/topic_setup_signtool.htm
https://jrsoftware.org/ishelp/topic_setup_signeduninstaller.htm
