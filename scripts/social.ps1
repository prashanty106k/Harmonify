# Regenerates the original branded social preview images on Windows.
param([string]$OnlySlug='')
Add-Type -AssemblyName System.Drawing
$assetPath = Join-Path $PSScriptRoot '..\public\assets'
$cards = @(
  @{Slug='novatech';Title='Small apps.';Second='Extraordinary possibilities.';Category='THE NOVATECH APP STUDIO';Color='#6c38cf'},
  @{Slug='aura-music-player';Title='Aura Music Player';Second='Your music. Your phone. Pure sound.';Category='OFFLINE AUDIO / COMING SOON';Color='#7347dc'},
  @{Slug='learning-app';Title='Learning App';Second='Little steps. Big discoveries.';Category='ENGLISH / MARATHI / MATHS / COMING SOON';Color='#6c38cf'},
  @{Slug='cinematic-pro';Title='Cinematic Pro';Second='Make every frame count.';Category='VIDEO & MEDIA / COMING SOON';Color='#d86d42'},
  @{Slug='chromagrade';Title='Chromagrade';Second='A world in your colors.';Category='CREATIVE TOOLS / COMING SOON';Color='#668b57'}
)
foreach ($card in $cards) {
  if ($OnlySlug -and $card.Slug -ne $OnlySlug) { continue }
  $bitmap = New-Object System.Drawing.Bitmap 1200,630
  $graphic = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphic.SmoothingMode = 'AntiAlias'
  $graphic.TextRenderingHint = 'AntiAliasGridFit'
  $graphic.Clear([System.Drawing.ColorTranslator]::FromHtml('#FBF9F4'))
  $purple = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($card.Color))
  $ink = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#201c30'))
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#746e80'))
  $lime = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#d4f63d'))
  $fontBrand = New-Object System.Drawing.Font 'Segoe UI',24,([System.Drawing.FontStyle]::Bold)
  $fontLabel = New-Object System.Drawing.Font 'Segoe UI',10,([System.Drawing.FontStyle]::Bold)
  $fontTitle = New-Object System.Drawing.Font 'Segoe UI',60,([System.Drawing.FontStyle]::Bold)
  $fontSecond = New-Object System.Drawing.Font 'Segoe UI',33,([System.Drawing.FontStyle]::Regular)
  $graphic.FillEllipse($lime,885,-100,420,420)
  $graphic.FillEllipse($purple,1020,200,260,260)
  $graphic.DrawString('novatech apps',$fontBrand,$ink,62,44)
  $graphic.DrawString($card.Category,$fontLabel,$muted,66,188)
  $graphic.DrawString($card.Title,$fontTitle,$ink,59,230)
  $graphic.DrawString($card.Second,$fontSecond,$purple,64,342)
  $graphic.FillRectangle($lime,67,427,90,7)
  $graphic.DrawString('Thoughtfully designed. Beautifully simple.',$fontLabel,$muted,66,522)
  $graphic.DrawString('novatech-apps.com',$fontLabel,$muted,938,558)
  $bitmap.Save((Join-Path $assetPath ($card.Slug + '-social.png')),[System.Drawing.Imaging.ImageFormat]::Png)
  $graphic.Dispose()
  $bitmap.Dispose()
  foreach ($item in @($purple,$ink,$muted,$lime,$fontBrand,$fontLabel,$fontTitle,$fontSecond)) {$item.Dispose()}
}
Write-Output 'Created selected original 1200x630 social cards.'
