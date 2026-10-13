#!/bin/sh
# frying-pan variant rebuild -> ../assets/art/astarte_pan.png/.json, previews in work/
set -e; cd "$(dirname "$0")"
[ -f frames_pan_measured.json ] || python3 pan_measure.py
python3 pan_recolor.py && python3 make_spec_pan.py && python3 lib/gaiden_sheet.py spec_pan.json tmp/pbuild.png > tmp/pbuild.log; head -1 tmp/pbuild.log
OUT=astarte_pan ANIMCFG=animcfg_pan.json python3 astarte_post.py tmp/pbuild.png spec_pan.json
python3 preview.py ../assets/art/astarte_pan.png spec_pan.json preview_pan_4x.png 4 && SHEET=astarte_pan python3 make_strips.py
