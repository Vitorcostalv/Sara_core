# Liga/desliga o "Hotspot móvel" do Windows para o celular se conectar direto ao PC.
# Uso: hotspot.ps1 start -Ssid NOME -Passphrase SENHA   |   hotspot.ps1 stop
# Sempre escreve uma linha JSON na saída: {"ok":true,...} ou {"ok":false,"error":"..."}.
param(
  [Parameter(Mandatory = $true)][ValidateSet("start", "stop", "status")][string]$Action,
  [string]$Ssid,
  [string]$Passphrase
)

$ErrorActionPreference = "Stop"

function Out-Json($data) {
  [Console]::Out.WriteLine(($data | ConvertTo-Json -Compress))
}

try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType = WindowsRuntime]
  $null = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType = WindowsRuntime]
  $null = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringAccessPointConfiguration, Windows.Networking.NetworkOperators, ContentType = WindowsRuntime]

  # PowerShell 5.1 não tem await: converte IAsyncOperation<T>/IAsyncAction em Task e espera.
  $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1" } |
    Select-Object -First 1
  $asTaskAction = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncAction" } |
    Select-Object -First 1

  function Await($operation, [Type]$resultType) {
    $task = $asTaskGeneric.MakeGenericMethod($resultType).Invoke($null, @($operation))
    $null = $task.Wait(-1)
    return $task.Result
  }
  function AwaitAction($action) {
    $task = $asTaskAction.Invoke($null, @($action))
    $null = $task.Wait(-1)
  }

  $profile = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
  if (-not $profile) {
    Out-Json @{ ok = $false; error = "no-internet"; message = "O Windows só cria o hotspot compartilhando uma conexão com a internet (cabo ou Wi-Fi)." }
    exit 0
  }

  $capability = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::GetTetheringCapabilityFromConnectionProfile($profile)
  if ("$capability" -ne "Enabled") {
    Out-Json @{ ok = $false; error = "unsupported"; message = "Hotspot móvel indisponível neste PC ($capability)." }
    exit 0
  }

  $manager = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($profile)
  $resultType = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult]

  switch ($Action) {
    "status" {
      Out-Json @{ ok = $true; state = "$($manager.TetheringOperationalState)"; clients = $manager.ClientCount; sharing = $profile.ProfileName }
    }
    "start" {
      if (-not $Ssid -or -not $Passphrase) { throw "start exige -Ssid e -Passphrase" }
      $config = New-Object Windows.Networking.NetworkOperators.NetworkOperatorTetheringAccessPointConfiguration
      $config.Ssid = $Ssid
      $config.Passphrase = $Passphrase
      AwaitAction ($manager.ConfigureAccessPointAsync($config))

      if ("$($manager.TetheringOperationalState)" -ne "On") {
        $result = Await ($manager.StartTetheringAsync()) $resultType
        if ("$($result.Status)" -ne "Success") {
          Out-Json @{ ok = $false; error = "start-failed"; message = "Windows recusou ligar o hotspot: $($result.Status) $($result.AdditionalErrorMessage)" }
          exit 0
        }
      }
      Out-Json @{ ok = $true; state = "On"; ssid = $Ssid; sharing = $profile.ProfileName; maxClients = $manager.MaxClientCount }
    }
    "stop" {
      if ("$($manager.TetheringOperationalState)" -eq "On") {
        $null = Await ($manager.StopTetheringAsync()) $resultType
      }
      Out-Json @{ ok = $true; state = "Off" }
    }
  }
} catch {
  Out-Json @{ ok = $false; error = "exception"; message = "$($_.Exception.Message)" }
}
