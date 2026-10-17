# Cria (ou refaz) o atalho "Oratório" no Menu Iniciar, com o ícone do app.
# O atalho abre o Electron direto (sem janela de console): o app sobe o servidor do Oratório sozinho e para ele
# quando a janela fecha. Se o Electron ainda não foi baixado, rode o abrir.bat uma vez (ele instala).
# Rodar de novo se a pasta do projeto mudar de lugar. Com -Remover, tira o atalho.
# Uso: powershell -ExecutionPolicy Bypass -File "<pasta do projeto>\ferramentas\criar-atalho.ps1" [-AreaDeTrabalho] [-Remover]

param([switch]$AreaDeTrabalho, [switch]$Remover)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$destinos = @(Join-Path ([Environment]::GetFolderPath('Programs')) 'Oratório.lnk')
if ($AreaDeTrabalho) { $destinos += Join-Path ([Environment]::GetFolderPath('Desktop')) 'Oratório.lnk' }

if ($Remover) {
    foreach ($d in $destinos) { if (Test-Path $d) { Remove-Item $d -Force; Write-Host "Tirado: $d" } }
    exit 0
}

$electron = Join-Path $raiz 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path $electron)) { throw "Falta o Electron ($electron). Rode o abrir.bat uma vez: ele instala." }
$icone = Join-Path $raiz 'app\icone.ico'
if (-not (Test-Path $icone)) { throw "Falta $icone (python ferramentas\gerar_icone.py)." }

$shell = New-Object -ComObject WScript.Shell
foreach ($d in $destinos) {
    $lnk = $shell.CreateShortcut($d)
    $lnk.TargetPath = $electron
    $lnk.Arguments = '"."'
    $lnk.WorkingDirectory = $raiz
    $lnk.IconLocation = "$icone,0"
    $lnk.Description = 'Oratório: Bíblia, orações, terço, calendário litúrgico e guias'
    $lnk.Save()
    Write-Host "Atalho criado: $d"
}
