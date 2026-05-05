Write-Host "===========================" -ForegroundColor Cyan
Write-Host "   LAB PROGRAM MATCHER" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
$files = @("", "Mergesort.java", "Quicksort.java", "PrimGreedy.java", "Dijkstras.java", "Knapsack.java", "WarshallAlgorithm.java", "Tsp.java", "NQueens.java")

for ($i = 1; $i -le 8; $i++) {
    Write-Host "  $i) $($files[$i])"
}
Write-Host "===========================" -ForegroundColor Cyan
$choice = Read-Host "Enter number (1-8)"

if ($choice -match "^[1-8]$") {
    $c = [int]$choice
    Write-Host "Downloading $($files[$c])..." -ForegroundColor Yellow
    $url = "https://raw.githubusercontent.com/siddiquikashif8600-arc/study-code/main/gateway/p$c.txt?v=2"
    $dest = "src\$($files[$c])"
    
    # Ensure src directory exists
    if (-not (Test-Path "src")) {
        New-Item -ItemType Directory -Path "src" | Out-Null
    }
    
    iwr $url -OutFile $dest
    Write-Host "✅ Success! File saved inside $dest" -ForegroundColor Green
} else {
    Write-Host "❌ Invalid choice." -ForegroundColor Red
}
