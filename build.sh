#!/bin/bash
set -v
cp -r /opt/octane-skype-node-modules/dev_node_modules node_modules
cp -r /opt/octane-skype-node-modules/app_node_modules app/node_modules
chmod +x node_modules/electron-builder/out/build-cli.js
npm run release
mkdir /tmp/octane-extracted
dpkg-deb -R dist/*.deb /tmp/octane_extracted

