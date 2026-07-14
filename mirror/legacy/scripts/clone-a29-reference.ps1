<#
.SYNOPSIS
  Clona (ou atualiza) o repositório a29-erp em docs/reference-a29-erp/checkout/ para leitura comparativa.
.DESCRIPTION
  O checkout está em .gitignore. Não uses este código como dependência de build.
.EXAMPLE
  $env:A29_ERP_GIT_URL = 'https://github.com/org/a29-erp.git'
  .\scripts\clone-a29-reference.ps1
.EXAMPLE
  .\scripts\clone-a29-reference.ps1 -RemoteUrl 'https://github.com/org/a29-erp.git'
#>
param(
  [Parameter(Mandatory = $false)]
  [string] $RemoteUrl = $env:A29_ERP_GIT_URL
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$checkout = Join-Path $root 'docs\reference-a29-erp\checkout'

if (-not $RemoteUrl) {
  Write-Error 'Passa -RemoteUrl ou define a variável de ambiente A29_ERP_GIT_URL com o URL git do a29-erp.'
  exit 1
}

New-Item -ItemType Directory -Force -Path $checkout | Out-Null
$gitDir = Join-Path $checkout '.git'

if (Test-Path $gitDir) {
  Write-Host "[a29-reference] Repositório já existe; a fazer pull em $checkout"
  Push-Location $checkout
  try {
    git pull --ff-only
  } finally {
    Pop-Location
  }
  exit 0
}

Write-Host "[a29-reference] A clonar para $checkout (depth 1)"
Push-Location $checkout
try {
  git clone --depth 1 $RemoteUrl .
} finally {
  Pop-Location
}
Write-Host "[a29-reference] Concluído. Lê docs/reference-a29-erp/README.md e PLACA_AVISO.txt."
