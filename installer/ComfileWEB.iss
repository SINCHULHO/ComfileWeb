#define AppName "ComfileWEB"
#ifndef AppVersion
  #error AppVersion is required. Run _Build-Installer.cmd.
#endif
#define RepoRoot ".."

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
UninstallDisplayIcon={app}\ComfileWeb.exe
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
Source: "{#RepoRoot}\dist\ComfileWEB\*"; DestDir: "{app}"; Excludes: "*.pdb,appsettings.Development.json"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\ComfileWeb.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\ComfileWeb.exe"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\ComfileWeb.exe"; WorkingDir: "{app}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
