namespace ComfileWeb.Models;

public sealed record UsbCdcConnectRequest(string? Device, string? PortName, int? BaudRate);
