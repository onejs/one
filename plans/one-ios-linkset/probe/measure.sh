#!/bin/zsh
# usage: measure.sh <runs> <name...> ; interleaved cold launches, prints median ctor/main ms
RUNS=$1; shift
SIM=$(cat sim.txt)
for n in "$@"; do xcrun simctl install $SIM $n.app; done
setopt nullglob; rm -rf out; mkdir -p out
run() { xcrun simctl terminate $SIM dev.probe.$1 >/dev/null 2>&1; rm -f /private/tmp/probe-trace.log
  SIMCTL_CHILD_PROBE_TRACE=/private/tmp/probe-trace.log xcrun simctl launch $SIM dev.probe.$1 >/dev/null; for t in {1..60}; do grep -q '^main' /private/tmp/probe-trace.log 2>/dev/null && break; sleep 0.25; done
  mv /private/tmp/probe-trace.log out/$1-$2.log 2>/dev/null; }
for n in "$@"; do run $n 0; done
for i in $(seq 1 $RUNS); do for n in "$@"; do run $n $i; done; done
python3 -I - "$@" <<'PY'
import sys,glob,statistics
for n in sys.argv[1:]:
    v=[]
    for f in glob.glob(f'out/{n}-*.log'):
        if f.endswith(f'{n}-0.log'): continue
        for l in open(f):
            k,x=l.split()
            if k=='main': v.append(float(x))
    v.sort()
    print(f'{n}: n={len(v)} median={statistics.median(v):.0f} min={v[0]:.0f} max={v[-1]:.0f}')
PY
