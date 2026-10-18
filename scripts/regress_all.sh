#!/bin/bash
# Celá regresní sada ve Windows Chrome (vyžaduje dev server :5173). Trvá ~25 min. Výstup: out/regress.log
cd "$(dirname "$0")/.."
L=out/regress.log; : > $L
run() { echo "=== $1" | tee -a $L; shift; timeout 900 "$@" 2>&1 | tail -${TAILN:-6} | tee -a $L; }
TAILN=30 run parity scripts/parity_win.sh
run ops scripts/ops_win.sh | grep -v PASS
run undo scripts/undo_win.sh
TAILN=14 run interactive scripts/interactive_win.sh
run sculpt scripts/sculpt_win.sh
run touch scripts/touch_win.sh
run occl scripts/p2_occl_check.sh
run blend_open scripts/blend_open_win.sh
run files scripts/files_win.sh
run utf8 scripts/utf8_win.sh
run utf8_outliner scripts/utf8_outliner_win.sh
run templates scripts/templates_win.sh
run bar scripts/bar_win.sh
run touch_modal scripts/touch_modal_win.sh
run touch_loopcut scripts/touch_loopcut_win.sh
run touch_boxsel scripts/touch_boxsel_win.sh
run autokbd scripts/autokbd_win.sh
run hidden scripts/hidden_win.sh
run editors scripts/editors_win.sh
run render_write scripts/render_write_win.sh
run bake_probe scripts/bake_probe_win.sh
run render_anim scripts/render_anim_win.sh
run render_features scripts/render_features_win.sh
run overlay_sweep scripts/overlay_sweep_win.sh
run node_sweep scripts/node_sweep_win.sh
run eevee_sweep scripts/eevee_sweep_win.sh
run modifier_sweep scripts/modifier_sweep_win.sh
run mesh_ops_sweep scripts/mesh_ops_sweep_win.sh
run obj_ops_sweep scripts/obj_ops_sweep_win.sh
run curve_ops_sweep scripts/curve_ops_sweep_win.sh
run armature_ops_sweep scripts/armature_ops_sweep_win.sh
run pose_ops_sweep scripts/pose_ops_sweep_win.sh
run uv_ops_sweep scripts/uv_ops_sweep_win.sh
run uv_hang scripts/uv_hang_win.sh
run props_sweep scripts/props_sweep_win.sh
run space_sweep scripts/space_sweep_win.sh
run prefs_sweep scripts/prefs_sweep_win.sh
run rna_sweep scripts/rna_sweep_win.sh
run rna2_sweep scripts/rna2_sweep_win.sh
run gn_sweep scripts/gn_sweep_win.sh
run world_sweep scripts/world_sweep_win.sh
run saveload_all scripts/saveload_all_win.sh
run rna_signatures python3 scripts/check_rna_update_signatures.py
run prefs_input scripts/prefs_input_win.sh
TAILN=25 run ops_sweeps_extra scripts/ops_sweeps_extra_win.sh
run sculpt_ops_sweep scripts/sculpt_ops_sweep_win.sh
run paint_ops_sweep scripts/paint_ops_sweep_win.sh
run lattice_ops_sweep scripts/lattice_ops_sweep_win.sh
run fuzz scripts/fuzz_win.sh
run ui_fuzz scripts/ui_fuzz_win.sh
run fuzz_obj scripts/fuzz_obj_win.sh
run seed_verify scripts/wgsl_seed_win.sh verify
echo "=== hotovo" | tee -a $L
