$srcDir = "c:\sas-app\src\components\Agriculture\Herramientas"
$dstDir = "c:\sas-app\src\components\Ganado\Herramientas"

Copy-Item -Path "$srcDir\TabMovimientos.jsx" -Destination "$dstDir\TabMovimientos.jsx" -Force
Copy-Item -Path "$srcDir\TabPedidos.jsx" -Destination "$dstDir\TabPedidos.jsx" -Force
Copy-Item -Path "$srcDir\ModalNuevoPedido.jsx" -Destination "$dstDir\ModalNuevoPedido.jsx" -Force

$files = @(
  "$dstDir\TabMovimientos.jsx",
  "$dstDir\TabPedidos.jsx",
  "$dstDir\ModalNuevoPedido.jsx"
)

foreach ($file in $files) {
  $content = Get-Content $file -Raw
  $content = $content -replace "acuicola_herramientas", "ganado_herramientas"
  $content = $content -replace "Movimientos_Acuicola", "Movimientos_Ganado"
  $content = $content -replace "Movimientos Acuícolas", "Movimientos Ganadería"
  $content = $content -replace "Pedidos_Acuicola", "Pedidos_Ganado"
  Set-Content $file $content -NoNewline
}
