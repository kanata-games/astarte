#!/bin/sh
# hooded 48x48 Astarte: measure -> sample (h48_build.py) -> hand fixes/outline/json (h48_post.py) -> previews
set -e; cd "$(dirname "$0")"
[ -f frames_hood_measured.json ] || python3 hood_measure.py
python3 h48_build.py && python3 h48_post.py && python3 make_previews48.py
