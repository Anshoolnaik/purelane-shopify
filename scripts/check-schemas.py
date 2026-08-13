#!/usr/bin/env python3
"""
Validate section schemas against Shopify rules that Theme Check does not cover.

Written after a real failure. `purelane-hero.liquid` declared:

    { "type": "range", "id": "autoplay_interval",
      "min": 2, "max": 10, "step": 0.5, "default": 3.8 }

From a minimum of 2 in steps of 0.5 you can reach 2.0, 2.5, 3.0, 3.5, 4.0 —
never 3.8. Shopify rejects a schema with an unreachable range default, and
rejecting the schema rejects the whole section file.

The failure mode is what made it expensive: the file is dropped **silently**.
The ZIP importer, the GitHub sync and the admin editor all accepted the upload
and simply did not create the file. Then `templates/index.json`, which
references `purelane-hero`, became invalid too and was dropped as well — so the
homepage had no template and served a 404. One bad number, two missing files,
no error message anywhere.

`shopify theme check` passes this. It does not validate range arithmetic.

Run it before every push:

    python scripts/check-schemas.py
"""

import glob
import json
import os
import re
import sys

MAX_STEPS = 101  # Shopify's documented ceiling for a range setting


def iter_settings(schema):
    """Yield (scope, setting) for section settings and every block's settings."""
    for s in schema.get("settings", []):
        yield "section", s
    for block in schema.get("blocks", []):
        for s in block.get("settings", []):
            yield "block:" + block["type"], s


def check_range(setting):
    """Return a list of problems with one range setting."""
    problems = []
    mn, mx, step = setting["min"], setting["max"], setting["step"]
    default = setting.get("default")

    if step <= 0:
        return ["step must be positive"]

    if mx <= mn:
        problems.append("max (%s) must exceed min (%s)" % (mx, mn))

    steps = (mx - mn) / step
    if steps > MAX_STEPS:
        problems.append(
            "%.0f steps exceeds Shopify's limit of %d — increase step or narrow the range"
            % (steps, MAX_STEPS)
        )

    if default is not None:
        if default < mn or default > mx:
            problems.append("default %s is outside %s..%s" % (default, mn, mx))
        else:
            n = (default - mn) / step
            if abs(n - round(n)) > 1e-9:
                reachable = [mn + i * step for i in range(int(steps) + 1)]
                near = min(reachable, key=lambda v: abs(v - default))
                problems.append(
                    "default %s is unreachable from min %s in steps of %s "
                    "(nearest valid: %g)" % (default, mn, step, near)
                )

    return problems


def main():
    root = os.path.join("theme", "sections", "*.liquid")
    files = sorted(glob.glob(root))

    if not files:
        sys.exit("No sections found at %s — run from the repository root." % root)

    failures = []
    checked = 0

    for path in files:
        src = open(path, encoding="utf-8").read()
        match = re.search(r"\{%\s*schema\s*%\}(.*?)\{%\s*endschema\s*%\}", src, re.S)

        if not match:
            failures.append((path, "-", "-", "no {% schema %} block"))
            continue

        try:
            schema = json.loads(match.group(1))
        except Exception as exc:
            failures.append((path, "-", "-", "schema is not valid JSON: %s" % exc))
            continue

        for scope, setting in iter_settings(schema):
            if setting.get("type") != "range":
                continue
            checked += 1
            for problem in check_range(setting):
                failures.append((path, scope, setting.get("id", "?"), problem))

    print("")
    print("  %d sections, %d range settings checked" % (len(files), checked))
    print("")

    if not failures:
        print("  All schemas valid.")
        print("")
        return 0

    for path, scope, sid, problem in failures:
        print("  FAIL  %s" % os.path.basename(path))
        print("        %s / %s" % (scope, sid))
        print("        %s" % problem)
        print("")

    print("  %d problem(s). Shopify would drop these files without an error." % len(failures))
    print("")
    return 1


if __name__ == "__main__":
    sys.exit(main())
