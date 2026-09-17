#!/usr/bin/env bash
set -e
[ -d .venv ] || { echo 'Run ./setup_linux_mac.sh first'; exit 1; }
source .venv/bin/activate
python run.py
