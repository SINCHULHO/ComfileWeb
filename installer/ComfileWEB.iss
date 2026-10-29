#define AppName "ComfileWEB"
#ifndef AppVersion
  #error AppVersion is required. Run _Build-Installer.cmd.
#endif
#ifndef AppIconFileName
  #error AppIconFileName is required. Run _Build-Installer.cmd.
#endif
#define RepoRoot ".."
#ifndef PublishDirectory
  #define PublishDirectory "..\dist\ComfileWEB"
#endif

[Setup]
AppId={{D065A4D1-6FC3-4896-AC78-B916D85CED73}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\ComfileWEB
DefaultGroupName={#AppName}
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#RepoRoot}\dist\installer
OutputBaseFilename=ComfileWEB-Setup-{#AppVersion}-win-x64
SetupIconFile={#RepoRoot}\Assets\AppIcon\ComfileWEB.ico
UninstallDisplayIcon={app}\{#AppIconFileName}
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#RepoRoot}\Assets\AppIcon\ComfileWEB.ico"; DestDir: "{app}"; DestName: "{#AppIconFileName}"; Flags: ignoreversion
Source: "{#PublishDirectory}\*"; DestDir: "{app}"; Excludes: "*.pdb,appsettings.Development.json"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\ComfileWeb.exe"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppIconFileName}"; IconIndex: 0
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\ComfileWeb.exe"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppIconFileName}"; IconIndex: 0; Tasks: desktopicon

[Run]
Filename: "{app}\ComfileWeb.exe"; WorkingDir: "{app}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

[CustomMessages]
korean.CloseTitle=ComfileWEB이 실행 중입니다.
korean.CloseWarning=작업을 저장하고 장치 실행을 중지하세요.%n%n계속하면 설치 폴더의 ComfileWEB과 MCP 연결을 강제로 종료합니다. 저장하지 않은 작업이 사라질 수 있으며 장치 통신이 끊깁니다.
korean.CloseInstall=ComfileWEB 종료 후 설치
korean.CloseCancel=취소
korean.CloseRequired=설치를 진행하지 않았습니다. 작업을 저장하고 ComfileWEB을 종료한 뒤 다시 시도하세요.
korean.CloseFailed=ComfileWEB 종료 또는 파일 잠금 해제를 확인할 수 없습니다. 앱과 MCP 연결을 종료한 뒤 다시 시도하세요.
english.CloseTitle=ComfileWEB is running.
english.CloseWarning=Save your work and stop device operation first.%n%nContinuing will forcibly close ComfileWEB and its MCP connections in the installation folder. Unsaved work may be lost and device communication will stop.
english.CloseInstall=Close ComfileWEB and install
english.CloseCancel=Cancel
english.CloseRequired=Installation has not started. Save your work and close ComfileWEB, then retry.
english.CloseFailed=Could not confirm that ComfileWEB stopped and its files are unlocked. Close the app and its MCP connections, then retry.

[Code]
#include "CloseRunningApp.iss"
