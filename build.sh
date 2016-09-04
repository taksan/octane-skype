#!/bin/bash
set -v
export PATH=$PATH:/tmp/noderoot/node-v6.5.0-linux-x64/bin
npm run release
mkdir /tmp/octane-extracted
dpkg-deb -R dist/*.deb /tmp/octane_extracted
