Add-Type -AssemblyName System.Drawing
$W=900;$H=1200;$bmp=New-Object Drawing.Bitmap $W,$H;$g=[Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode='AntiAlias';$g.TextRenderingHint='AntiAliasGridFit';$g.Clear([Drawing.Color]::FromArgb(8,18,32))
function Font($s,$b=$false){New-Object Drawing.Font('Arial',$s,($(if($b){[Drawing.FontStyle]::Bold}else{[Drawing.FontStyle]::Regular})))}
function Brush($hex){New-Object Drawing.SolidBrush([Drawing.ColorTranslator]::FromHtml($hex))}
function Txt($t,$x,$y,$s,$c='#ffffff',$b=$false){$f=Font $s $b;$br=Brush $c;$g.DrawString($t,$f,$br,$x,$y);$f.Dispose();$br.Dispose()}
function Box($x,$y,$w,$h,$fill,$stroke){$br=Brush $fill;$pen=New-Object Drawing.Pen ([Drawing.ColorTranslator]::FromHtml($stroke)),3;$g.FillRectangle($br,$x,$y,$w,$h);$g.DrawRectangle($pen,$x,$y,$w,$h);$br.Dispose();$pen.Dispose()}
$pen=New-Object Drawing.Pen ([Drawing.ColorTranslator]::FromHtml('#00eaff')),4;$g.DrawRectangle($pen,20,20,860,1160);$pen.Dispose()
Txt 'REI DA LAJE' 245 42 54 '#00eaff' $true; Txt 'COMANDOS DA LIVE' 292 108 28 '#ffffff' $true
Box 55 175 790 105 '#082c3a' '#00eaff'; Txt 'COMENTE' 85 195 30 '#00eaff' $true; Txt 'Qualquer comentário coloca sua pipa no jogo.' 85 240 24
Box 55 300 790 105 '#351026' '#ff2d8d'; Txt 'CURTA' 85 320 30 '#ff5aa7' $true; Txt 'Sua pipa despica para o lado do vento.' 85 365 24
Box 55 425 790 105 '#352d08' '#ffd33d'; Txt 'PRESENTEIE' 85 445 30 '#ffd33d' $true; Txt 'Ativa manobra + poder por 30s ou 45s.' 85 490 24
Txt 'COMANDOS NO CHAT' 55 565 30 '#b77cff' $true
Box 55 610 790 88 '#101c35' '#334b75'; Txt 'PUXAR • SOBE • 1' 85 625 27 '#69e2ff' $true; Txt 'Sobe a pipa e tensiona a linha.' 85 662 22
Box 55 715 790 88 '#101c35' '#334b75'; Txt 'DESCARREGAR • SOLTA • LINHA • 2' 85 730 27 '#69e2ff' $true; Txt 'Solta linha e deixa o vento carregar.' 85 767 22
Box 55 820 790 88 '#101c35' '#334b75'; Txt 'EMBICAR • BICAR • VIRA • 3' 85 835 27 '#69e2ff' $true; Txt 'Faz a pipa embicar e mudar a trajetória.' 85 872 22
Box 55 925 790 88 '#101c35' '#334b75'; Txt 'PEGAR • APARAR • #PEGAR • #APARAR' 85 940 25 '#69e2ff' $true; Txt 'Faz uma aparada rápida no relinho.' 85 977 22
Box 55 1040 790 92 '#25170a' '#ffb000'; Txt '5 CORTES = REI DA LAJE' 205 1052 30 '#ffd33d' $true; Txt 'Faça sequência • derrube o Rei • Hall da Live' 175 1093 21
$out='C:\Users\deral\Desktop\ReiDaLaje-Comandos-Live.png';$bmp.Save($out,[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$bmp.Dispose();Get-Item $out | Select FullName,Length,LastWriteTime