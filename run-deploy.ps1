Set-Location "C:\Users\MY PC\Desktop\chaye-cafe-pos"
$firebase = "C:\Users\MY PC\AppData\Roaming\npm\firebase.cmd"
$output = cmd /c "`"$firebase`" deploy --only hosting 2>&1"
$output | Out-File "deploy-out-new.txt" -Encoding utf8
Write-Host $output
if ($LASTEXITCODE -eq 0) { Write-Host "DEPLOY_OK" } else { Write-Host "DEPLOY_FAILED: $LASTEXITCODE" }
