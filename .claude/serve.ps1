param(
  [int]$Port = 8080
)

$root = Split-Path -Parent $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "Serving $root at $prefix"

$mimeMap = @{
  ".html" = "text/html"
  ".js"   = "application/javascript"
  ".json" = "application/json"
  ".css"  = "text/css"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".webmanifest" = "application/manifest+json"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  try {
    $isHead = $request.HttpMethod -eq "HEAD"
    $relPath = [Uri]::UnescapeDataString($request.Url.AbsolutePath)
    if ($relPath -eq "/") { $relPath = "/index.html" }
    $filePath = Join-Path $root ($relPath.TrimStart("/"))

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $contentType = $mimeMap[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      if (-not $isHead) { $response.OutputStream.Write($bytes, 0, $bytes.Length) }
    } else {
      $response.StatusCode = 404
      $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $relPath")
      $response.ContentLength64 = $notFound.Length
      if (-not $isHead) { $response.OutputStream.Write($notFound, 0, $notFound.Length) }
    }
  } catch {
    Write-Output "ERROR for $($request.HttpMethod) $($request.Url.AbsolutePath): $($_.Exception.Message)"
    try {
      $response.StatusCode = 500
      $errBytes = [System.Text.Encoding]::UTF8.GetBytes("500: $($_.Exception.Message)")
      $response.ContentLength64 = $errBytes.Length
      if ($request.HttpMethod -ne "HEAD") { $response.OutputStream.Write($errBytes, 0, $errBytes.Length) }
    } catch {}
  } finally {
    $response.OutputStream.Close()
  }
}
