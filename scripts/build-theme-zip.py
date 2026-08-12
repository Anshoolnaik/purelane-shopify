#!/usr/bin/env python3
"""
Package a merged Dawn + Purelane theme as a ZIP for admin upload.

This exists because the Shopify CLI refuses to touch a development store
unless you are the store owner *and* have signed into the store admin
directly at least once. When that path is blocked, uploading a ZIP through
Online Store -> Themes -> Add theme -> Upload zip file always works.

Why not Compress-Archive or .NET ZipFile: on Windows PowerShell 5.1 both write
entry names with backslash separators. That violates the ZIP spec, which
mandates forward slashes, and Shopify rejects the archive. Python's zipfile
writes correct paths.

Usage:
    python scripts/build-theme-zip.py ../dawn purelane-theme.zip
"""

import os
import sys
import zipfile

# Only the standard theme folders. Shopify rejects unknown top-level entries,
# and a GitHub checkout of Dawn also carries .github, README.md and friends.
FOLDERS = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates']
BACKSLASH = chr(92)


def main():
    if len(sys.argv) < 2:
        sys.exit('Usage: python scripts/build-theme-zip.py <path-to-merged-theme> [output.zip]')

    theme = os.path.abspath(sys.argv[1])
    out = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else 'purelane-theme.zip')

    if not os.path.isfile(os.path.join(theme, 'layout', 'theme.liquid')):
        sys.exit(
            'That does not look like a theme: %s\n'
            '  Expected layout/theme.liquid.\n'
            '  Merge first: node scripts/install-into-dawn.mjs %s' % (theme, theme)
        )

    if os.path.exists(out):
        os.remove(out)

    count = 0
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for folder in FOLDERS:
            base = os.path.join(theme, folder)
            if not os.path.isdir(base):
                continue
            for dirpath, _, filenames in os.walk(base):
                for name in filenames:
                    full = os.path.join(dirpath, name)
                    arc = os.path.relpath(full, theme).replace(os.sep, '/')
                    z.write(full, arc)
                    count += 1

    # Verify rather than trust: a malformed archive fails at upload time with a
    # message that does not say why.
    with zipfile.ZipFile(out) as z:
        names = z.namelist()
        bad_sep = sum(1 for n in names if BACKSLASH in n)
        purelane = sum(1 for n in names if 'purelane' in n)
        roots = sorted({n.split('/')[0] for n in names})
        corrupt = z.testzip()

    print('')
    print('  %s' % out)
    print('  %.1f MB, %d files' % (os.path.getsize(out) / 1024 / 1024, count))
    print('  purelane files:   %d' % purelane)
    print('  root folders:     %s' % ', '.join(roots))
    print('  path separators:  %s' % ('OK' if bad_sep == 0 else '%d BAD' % bad_sep))
    print('  integrity:        %s' % ('OK' if corrupt is None else 'CORRUPT at ' + corrupt))
    print('')

    if bad_sep or corrupt is not None:
        sys.exit('  Archive is not safe to upload.')

    if purelane == 0:
        sys.exit('  No Purelane files found — run install-into-dawn.mjs first.')

    print('  Upload at: Online Store -> Themes -> Add theme -> Upload zip file')
    print('')


if __name__ == '__main__':
    main()
