#!/bin/bash
# M1: velký mesh (>65535 vertexů) a mesh s více materiály (sub-range IBO + indirect draw) musí být bez děr.
D=$(cd "$(dirname "$0")" && pwd)
"$D/bigmesh_run.sh" 512 256 0 rand
"$D/bigmesh_run.sh" 128 64 5 rand
"$D/bigmesh_run.sh" 256 128 5 band
