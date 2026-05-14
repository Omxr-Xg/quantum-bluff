#!/usr/bin/env bash
# Compile le rapport en PDF (2 passes pour sommaire / hyperref).
set -euo pipefail
export PATH="/Library/TeX/texbin:${PATH:-}"
cd "$(dirname "$0")"
pdflatex -interaction=nonstopmode rapport.tex
pdflatex -interaction=nonstopmode rapport.tex
echo "OK: $(pwd)/rapport.pdf"
