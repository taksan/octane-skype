#!/bin/bash

set -e -v

rm -rf /tmp/noderoot
mkdir -p /tmp/noderoot
TARBALL=$(readlink -f build-assets/node-v6.5.0-linux-x64.tar.xz)
(
	echo "== Preparing node"
	cd /tmp/noderoot
	tar xJf $TARBALL
	ls -1
)

if [[ ! -e $HOME/.electron ]]; then
	echo "== Preparing electron"
	# prevents electron-packager from trying to download
	mkdir $HOME/.electron
	mv build-assets/electron-v1.3.4-linux-x64.zip $HOME/.electron
fi
if [[ ! -e $HOME/.cache ]]; then
	echo "== Preparing fpm"
	mkdir -p $HOME/.cache/fpm
	(
		cd build-assets
		tar xJf fpm-1.5.0-2.3.1-linux-x86_64.tar.xz
		mv fpm-1.5.0-2.3.1-linux-x86_64 $HOME/.cache/fpm
	)

	rm -rf build-assets
fi
echo "Build requirements complete"
