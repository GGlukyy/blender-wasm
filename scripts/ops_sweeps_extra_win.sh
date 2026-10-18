#!/bin/bash
# Operátorové sweepy dalších modulů (zamrznutí/pád = nedoběhne). Každý ~1–2 min. Souhrn: řádky OPS <modul>_ops_sweep_summary.
cd "$(dirname "$0")/.."
for t in anim grease_pencil curves geometry scene sequencer transform particle constraint rigidbody material collection image world texture text cachefile sound pointcloud surface mball; do
  timeout 400 scripts/${t}_ops_sweep_win.sh 2>&1 | grep -a "summary"
done
