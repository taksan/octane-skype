#!/bin/bash
set -v
npm run release
mkdir /tmp/octane-extracted
dpkg-deb -R dist/*.deb /tmp/octane_extracted
