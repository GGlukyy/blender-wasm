#!/bin/bash
# Operátorové sweepy dalších modulů (zamrznutí/pád = nedoběhne). Každý ~1–2 min. Souhrn: řádky OPS <modul>_ops_sweep_summary.
cd "$(dirname "$0")/.."
for t in anim grease_pencil curves geometry scene sequencer transform particle constraint rigidbody material collection image world texture text cachefile sound pointcloud surface mball view3d outliner screen ed info console action graph nla node clip mask palette brush asset poselib preferences wm file marker boid ptcache font lightprobe; do
  timeout 400 scripts/${t}_ops_sweep_win.sh 2>&1 | grep -a "summary"
done
