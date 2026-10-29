$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# 투명 배경 원본을 Windows 아이콘의 여러 해상도로 변환한다.
$source = [Drawing.Image]::FromFile((Join-Path $PSScriptRoot 'ComfileWEB.png'))
$frames = @()
try {
    foreach ($size in @(16, 24, 32, 48, 64, 128, 256)) {
        $bitmap = [Drawing.Bitmap]::new($size, $size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        $stream = [IO.MemoryStream]::new()
        try {
            $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.DrawImage($source, 0, 0, $size, $size)
            $bitmap.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
            $frames += @{ Size = $size; Data = $stream.ToArray() }
        }
        finally { $graphics.Dispose(); $bitmap.Dispose(); $stream.Dispose() }
    }
}
finally { $source.Dispose() }

$iconPath = Join-Path $PSScriptRoot 'ComfileWEB.ico'
$output = [IO.File]::Create($iconPath)
$writer = [IO.BinaryWriter]::new($output)
try {
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]$frames.Count)
    $offset = 6 + 16 * $frames.Count
    foreach ($frame in $frames) {
        $dimension = if ($frame.Size -eq 256) { 0 } else { $frame.Size }
        $writer.Write([byte]$dimension)
        $writer.Write([byte]$dimension)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]$frame.Data.Length)
        $writer.Write([uint32]$offset)
        $offset += $frame.Data.Length
    }
    foreach ($frame in $frames) { $writer.Write([byte[]]$frame.Data) }
}
finally { $writer.Dispose(); $output.Dispose() }

Copy-Item -LiteralPath $iconPath -Destination (Join-Path $PSScriptRoot '..\..\ComfileWeb\wwwroot\favicon.ico') -Force
Write-Host "Created: $iconPath"
