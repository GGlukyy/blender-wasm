#!/bin/bash
# Jeden test ve webkit_sim režimu (stejný hook jako regress_sim.sh): scripts/sim1.sh scripts/journey_win.sh color,modui
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; cp scripts/sim_hook.mjs "$W/"
export SIM_Q="${SIM_Q:-webkit_sim=1}" NODE_OPTIONS="--import=file:///C:/Users/$U/p2win/sim_hook.mjs" WSLENV="SIM_Q:NODE_OPTIONS${WSLENV:+:$WSLENV}"
exec "$@"
