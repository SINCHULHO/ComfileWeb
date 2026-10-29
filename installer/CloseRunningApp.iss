function OpenInstallFile(FileName: String; Access, Share: Cardinal;
  Security: NativeInt; Creation, Flags: Cardinal; Template: THandle): THandle;
  external 'CreateFileW@kernel32.dll stdcall';
function CloseInstallHandle(Handle: THandle): Boolean;
  external 'CloseHandle@kernel32.dll stdcall';

function TargetProcesses: Variant;
var
  Locator, Service: Variant;
begin
  Locator := CreateOleObject('WbemScripting.SWbemLocator');
  Service := Locator.ConnectServer('', 'root\CIMV2');
  Result := Service.ExecQuery('SELECT * FROM Win32_Process WHERE Name = ''ComfileWeb.exe''');
end;

function IsInstalledProcess(Process: Variant): Boolean;
var
  ProcessPath: String;
begin
  // 이름만으로 종료하지 않고 실제 설치 대상의 절대 경로를 비교한다.
  if VarIsNull(Process.ExecutablePath) or VarIsEmpty(Process.ExecutablePath) then
    RaiseException(CustomMessage('CloseFailed'));
  ProcessPath := Process.ExecutablePath;
  Result := CompareText(ProcessPath, ExpandConstant('{app}\ComfileWeb.exe')) = 0;
end;

function HasInstalledProcess: Boolean;
var
  Processes, Process: Variant;
  I: Integer;
begin
  Result := False;
  Processes := TargetProcesses;
  for I := 0 to Processes.Count - 1 do begin
    Process := Processes.ItemIndex(I);
    if IsInstalledProcess(Process) then Result := True;
  end;
end;

function InstallFilesUnlocked: Boolean;
var
  Files: TArrayOfString;
  I: Integer;
  Handle: THandle;
  FileName: String;
begin
  Result := False;
  Files := ['ComfileWeb.exe', 'ComfileWeb.dll', 'clrjit.dll', 'coreclr.dll'];
  for I := 0 to GetArrayLength(Files) - 1 do begin
    FileName := ExpandConstant('{app}\') + Files[I];
    if FileExists(FileName) then begin
      Handle := OpenInstallFile(FileName, $C0000000, 0, 0, 3, 0, 0);
      if Handle = THandle(-1) then Exit;
      CloseInstallHandle(Handle);
    end;
  end;
  Result := True;
end;

function ForceCloseRequested: Boolean;
var
  I: Integer;
begin
  Result := False;
  for I := 1 to ParamCount do
    if CompareText(ParamStr(I), '/CLOSECOMFILEWEB') = 0 then Result := True;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Processes, Process: Variant;
  I, Attempt: Integer;
begin
  Result := CustomMessage('CloseFailed');
  try
    if HasInstalledProcess then begin
      // 무인 설치는 명시적인 종료 옵션이 없으면 안전하게 중단한다.
      if WizardSilent then begin
        if not ForceCloseRequested then begin
          Result := CustomMessage('CloseRequired');
          Exit;
        end;
      end else if TaskDialogMsgBox(CustomMessage('CloseTitle'),
        CustomMessage('CloseWarning'), mbConfirmation, MB_OKCANCEL, [CustomMessage('CloseInstall'), CustomMessage('CloseCancel')], 0) <> IDOK then begin
        Result := CustomMessage('CloseRequired');
        Exit;
      end;
      Processes := TargetProcesses;
      for I := 0 to Processes.Count - 1 do begin
        Process := Processes.ItemIndex(I);
        if IsInstalledProcess(Process) then begin
          Log('Closing installation-folder ComfileWEB, PID ' + IntToStr(Process.ProcessId));
          if Process.Terminate(0) <> 0 then Exit;
        end;
      end;
    end;
    // 프로세스와 런타임 DLL 잠금이 모두 해제된 뒤에만 파일 복사를 허용한다.
    for Attempt := 1 to 40 do begin
      if not HasInstalledProcess then
        if InstallFilesUnlocked then begin
          Result := '';
          Exit;
        end;
      Sleep(250);
    end;
  except
    Log('ComfileWEB pre-install check failed: ' + GetExceptionMessage);
  end;
end;
