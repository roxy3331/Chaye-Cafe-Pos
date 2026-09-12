# Fix UTF-8 mojibake in Khata.tsx + KhataDetail.tsx
# All patterns built from Unicode code points - no literal special chars in script source.
# Windows-1252 high-byte map used for bytes 0x80-0x9F:
#   80=20AC 82=201A 83=192 85=2026 86=2020 87=2021 88=2C6 89=2030
#   8A=160  8B=2039 8C=152 8E=17D  8F=ctrl  91=2018 92=2019 93=201C
#   94=201D 95=2022 96=2013 97=2014 98=2DC  99=2122 9A=161  9B=203A
#   9C=153  9D=ctrl  9E=17E  9F=178
# Bytes A0-FF map directly to same Unicode codepoint.

function C([int]$n){ [char]$n }
function E([int]$n){ [char]::ConvertFromUtf32($n) }

$replacements = @(
  # A-Z: A + en-dash(2013) = E2 80 93 -> C(41)+C(E2)+C(20AC)+C(201C)+C(5A)
  @{ F = (C 0x41)+(C 0xE2)+(C 0x20AC)+(C 0x201C)+(C 0x5A); T = 'A' + (C 0x2013) + 'Z' },
  # em-dash(2014): E2 80 94 -> C(E2)+C(20AC)+C(201D)
  @{ F = (C 0xE2)+(C 0x20AC)+(C 0x201D); T = (C 0x2014) },
  # bullet(2022): E2 80 A2 -> C(E2)+C(20AC)+C(A2)
  @{ F = (C 0xE2)+(C 0x20AC)+(C 0xA2);  T = (C 0x2022) },
  # middle-dot(B7): C2 B7 -> C(C2)+C(B7)
  @{ F = (C 0xC2)+(C 0xB7);             T = (C 0xB7)   },
  # multiply-sign(D7): C3 97 -> C(C3)+C(2014)  [0x97 in cp1252 = em-dash]
  @{ F = (C 0xC3)+(C 0x2014);           T = (C 0xD7)   },
  # divide-sign(F7): C3 B7 -> C(C3)+C(B7)
  @{ F = (C 0xC3)+(C 0xB7);             T = (C 0xF7)   },
  # backspace(232B): E2 8C AB -> C(E2)+C(152)+C(AB)
  @{ F = (C 0xE2)+(C 0x152)+(C 0xAB);  T = E 0x232B   },
  # return(21B5): E2 86 B5 -> C(E2)+C(2020)+C(B5)
  @{ F = (C 0xE2)+(C 0x2020)+(C 0xB5); T = E 0x21B5   },
  # right-arrow(2192): E2 86 92 -> C(E2)+C(2020)+C(2019)
  @{ F = (C 0xE2)+(C 0x2020)+(C 0x2019); T = E 0x2192 },
  # checkmark(2705): E2 9C 85 -> C(E2)+C(153)+C(2026)
  @{ F = (C 0xE2)+(C 0x153)+(C 0x2026); T = E 0x2705  },
  # clear-x(2715): E2 9C 95 -> C(E2)+C(153)+C(2022)
  @{ F = (C 0xE2)+(C 0x153)+(C 0x2022); T = E 0x2715  },
  # cross-mark(274C): E2 9D 8C -> C(E2)+C(9D)+C(152)  [9D=ctrl]
  @{ F = (C 0xE2)+(C 0x9D)+(C 0x152);  T = E 0x274C   },
  # star(2B50): E2 AD 90 -> C(E2)+C(AD)+C(90)  [90=ctrl]
  @{ F = (C 0xE2)+(C 0xAD)+(C 0x90);   T = E 0x2B50   },
  # no-entry(26D4): E2 9B 94 -> C(E2)+C(203A)+C(201D)
  @{ F = (C 0xE2)+(C 0x203A)+(C 0x201D); T = E 0x26D4 },
  # warning(26A0)+VS16(FE0F): E2 9A A0 EF B8 8F -> C(E2)+C(161)+C(A0)+C(EF)+C(B8)+C(8F)
  @{ F = (C 0xE2)+(C 0x161)+(C 0xA0)+(C 0xEF)+(C 0xB8)+(C 0x8F); T = (E 0x26A0)+(C 0xFE0F) },
  # shield(1F6E1)+VS16: F0 9F 9B A1 EF B8 8F -> C(F0)+C(178)+C(203A)+C(A1)+C(EF)+C(B8)+C(8F)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x203A)+(C 0xA1)+(C 0xEF)+(C 0xB8)+(C 0x8F); T = (E 0x1F6E1)+(C 0xFE0F) },
  # pray(1F64F): F0 9F 99 8F -> C(F0)+C(178)+C(2122)+C(8F)  [8F=ctrl]
  @{ F = (C 0xF0)+(C 0x178)+(C 0x2122)+(C 0x8F); T = E 0x1F64F },
  # money-bag(1F4B0): F0 9F 92 B0 -> C(F0)+C(178)+C(2019)+C(B0)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x2019)+(C 0xB0); T = E 0x1F4B0 },
  # handshake(1F91D): F0 9F A4 9D -> C(F0)+C(178)+C(A4)+C(9D)  [9D=ctrl]
  @{ F = (C 0xF0)+(C 0x178)+(C 0xA4)+(C 0x9D);  T = E 0x1F91D },
  # chart(1F4CA): F0 9F 93 8A -> C(F0)+C(178)+C(201C)+C(160)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x201C)+(C 0x160); T = E 0x1F4CA },
  # smiley(1F60A): F0 9F 98 8A -> C(F0)+C(178)+C(2DC)+C(160)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x2DC)+(C 0x160);  T = E 0x1F60A },
  # credit-card(1F4B3): F0 9F 92 B3 -> C(F0)+C(178)+C(2019)+C(B3)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x2019)+(C 0xB3); T = E 0x1F4B3 },
  # speech-bubble(1F4AC): F0 9F 92 AC -> C(F0)+C(178)+C(2019)+C(AC)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x2019)+(C 0xAC); T = E 0x1F4AC },
  # pin(1F4CC): F0 9F 93 8C -> C(F0)+C(178)+C(201C)+C(152)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x201C)+(C 0x152); T = E 0x1F4CC },
  # red-circle(1F534): F0 9F 94 B4 -> C(F0)+C(178)+C(201D)+C(B4)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x201D)+(C 0xB4); T = E 0x1F534 },
  # no-entry-sign(1F6AB): F0 9F 9A AB -> C(F0)+C(178)+C(161)+C(AB)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x161)+(C 0xAB);  T = E 0x1F6AB },
  # sos(1F198): F0 9F 86 98 -> C(F0)+C(178)+C(2020)+C(2DC)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x2020)+(C 0x2DC); T = E 0x1F198 },
  # calendar(1F4C5): F0 9F 93 85 -> C(F0)+C(178)+C(201C)+C(2026)
  @{ F = (C 0xF0)+(C 0x178)+(C 0x201C)+(C 0x2026); T = E 0x1F4C5 },
  # pushpin(1F4CC) already handled above; adding pin(1F4CD) just in case
  # red-square-button(1F7E5) not present; skip
  # box-with-check / ok-button(1F197) not present; skip
  # 💰 again via alternate seq check done above
  @{ F = 'null_sentinel'; T = 'null_sentinel' }   # dummy - always last
)

$files = @('src\screens\Khata.tsx', 'src\screens\KhataDetail.tsx')

foreach ($file in $files) {
  $path = Join-Path $PSScriptRoot $file
  $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  $before = $content
  foreach ($r in $replacements) {
    if ($r.F -ne 'null_sentinel') {
      $content = $content.Replace($r.F, $r.T)
    }
  }
  [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
  $n = ($before.Length - $content.Length)
  Write-Host "$(if($content -ne $before){'FIXED'}else{'unchanged'}) $file  (size delta: $n chars)"
}
Write-Host "Done."
