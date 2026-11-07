#!/bin/bash
# A2: celý regress_all.sh se SIM_Q (výchozí webkit_sim=1) v každé adrese testu. Výstup: out/regress_sim<_název>.log. regress_sim.sh [dotaz] [název]
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
U=${WINUSER:-$(ls /mnt/c/Users | grep -v -i -E "public|default|all users|desktop.ini" | head -1)}
W=/mnt/c/Users/$U/p2win; cp scripts/sim_hook.mjs "$W/"
export SIM_Q="${1:-webkit_sim=1}" NODE_OPTIONS="--import=file:///C:/Users/$U/p2win/sim_hook.mjs" WSLENV="SIM_Q:NODE_OPTIONS${WSLENV:+:$WSLENV}"
REGRESS_LOG="out/regress_sim${2:+_$2}.log" scripts/regress_all.sh
