"""Gera ferramentas\\criar-atalho.ps1 em UTF-8 com BOM (o PowerShell 5.1 precisa)."""
from pathlib import Path

TEXTO = r'''# Cria (ou refaz) o atalho "Oratório" no Menu Iniciar, com o ícone do app.
# O atalho sobe o servidor sem janela nenhuma (pythonw) e abre o Oratório no Brave; se ele já estiver
# aberto, só abre o navegador. Para parar o servidor: o botão "parar" do widget Projetos da nova aba.
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

# pythonw ao lado do python que está no PATH (o python.exe abriria uma janela de console)
$python = (Get-Command python.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $python) { throw 'Não achei o python no PATH.' }
$pythonw = Join-Path (Split-Path $python) 'pythonw.exe'
if (-not (Test-Path $pythonw)) { throw "Não achei o pythonw.exe ao lado de $python." }
$icone = Join-Path $raiz 'app\icone.ico'
if (-not (Test-Path $icone)) { throw "Falta $icone (python ferramentas\gerar_icone.py)." }

$shell = New-Object -ComObject WScript.Shell
foreach ($d in $destinos) {
    $lnk = $shell.CreateShortcut($d)
    $lnk.TargetPath = $pythonw
    $lnk.Arguments = '"' + (Join-Path $raiz 'servidor\iniciar.py') + '"'
    $lnk.WorkingDirectory = $raiz
    $lnk.IconLocation = "$icone,0"
    $lnk.Description = 'Oratório: Bíblia, orações, terço, calendário litúrgico e guias'
    $lnk.Save()
    Write-Host "Atalho criado: $d"
}
'''

destino = Path(__file__).resolve().parent / "criar-atalho.ps1"
destino.write_text(TEXTO.lstrip("\n"), encoding="utf-8-sig")
print("escrito", destino)
