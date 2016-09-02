#!/bin/bash
set -v
export PATH=$PATH:/tmp/noderoot/6.5.0/bin
npm run release
mkdir /tmp/octane-extracted
dpkg-deb -R dist/*.deb /tmp/octane_extracted
rsync -r -t -v --progress /tmp/octane_extracted/ -c -l -z debian/octane

