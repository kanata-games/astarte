#!/bin/sh
# Astarte sheet rebuild: measure -> spec -> build -> post (outline/json) -> previews.  Variant: OUT=astarte_pan sh build.sh
set -e; cd "$(dirname "$0")"
[ -f frames_measured.json ] || python3 measure.py
python3 make_spec.py && python3 lib/gaiden_sheet.py spec_astarte.json tmp/build.png >/dev/null
python3 astarte_post.py tmp/build.png spec_astarte.json
python3 preview.py ../assets/art/${OUT:-astarte}.png spec_astarte.json preview_sheet_4x.png 4 && python3 make_strips.py
