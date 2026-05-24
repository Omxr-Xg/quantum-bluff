#!/usr/bin/env bash
# Compile le rapport en PDF (2 passes pour sommaire / hyperref).
# Troisième passe utile pour stabiliser les largeurs longtable (liste d'abréviations).
set -euo pipefail
export PATH="/Library/TeX/texbin:${PATH:-}"
cd "$(dirname "$0")"

PDFLATEX_BIN="pdflatex"
if command -v pdflatex.exe >/dev/null 2>&1; then
  PDFLATEX_BIN="pdflatex.exe"
fi

"$PDFLATEX_BIN" -interaction=nonstopmode rapport.tex
"$PDFLATEX_BIN" -interaction=nonstopmode rapport.tex
"$PDFLATEX_BIN" -interaction=nonstopmode rapport.tex
echo "OK: $(pwd)/rapport.pdf"
