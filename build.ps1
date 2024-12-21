Start-Process powershell -Verb RunAs -ArgumentList @"
Set-Location '$PWD'
npm run build
Write-Host '按任意键继续...'
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@ 