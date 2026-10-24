import json
import statistics
import sys
from collections import defaultdict

path = sys.argv[1]
rows = [json.loads(line) for line in open(path, encoding="utf-8") if line.strip()]
groups = defaultdict(list)
for row in rows:
    if row["tag"] == "rep0":
        continue
    groups[(row["mode"], row["nodes"], row["controls"])].append(row)


def med(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else float("nan")


print("| mode | nodes | controls | runs | launched | shown | mount ms | first frame | dwm flushed | update median | private KB/node | loaded MB | app-local MB | xaml loaded |")
print("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |")
for key in sorted(groups, key=lambda k: (k[1], k[2], k[0])):
    runs = groups[key]
    marks = lambda name: med([r["marks"].get(name) for r in runs])
    per_node = med(
        [(r["privateAfterFrame"] - r["privateBeforeMount"]) / 1024 / max(1, r["nodes"]) for r in runs]
    ) if key[1] else float("nan")
    print(
        f"| {key[0]} | {key[1]} | {key[2]} | {len(runs)} | {marks('launched'):.1f} | {marks('shown'):.1f} | "
        f"{med([r['mountMs'] for r in runs]):.1f} | {marks('first_frame'):.1f} | {marks('dwm_flushed'):.1f} | "
        f"{med([med(r['updateMs']) for r in runs]):.2f} | {per_node:.2f} | "
        f"{med([r['moduleBytes'] for r in runs]) / 1e6:.1f} | {med([r['appLocalModuleBytes'] for r in runs]) / 1e6:.1f} | "
        f"{runs[0]['xamlLoaded']} |"
    )

seen = set()
print()
print("app-local modules by mode (bytes on disk):")
for row in rows:
    if row["mode"] in seen:
        continue
    seen.add(row["mode"])
    names = ", ".join(f"{m['name']} {m['bytes'] / 1e6:.1f}MB" for m in sorted(row["appLocalModules"], key=lambda m: -m["bytes"]))
    print(f"- {row['mode']}: {names}")
