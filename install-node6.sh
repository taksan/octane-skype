#!/bin/bash

set -e -v

rm -rf /tmp/noderoot
mkdir -p /tmp/noderoot
TARBALL=$(readlink -f build-assets/node-6.5.0.tar.gz)

(
	cd /tmp/noderoot
	tar xvzf $TARBALL
)

if [[ ! -e $HOME/.electron ]]; then
	# prevents electron-packager from trying to download
	mkdir $HOME/.electron
	mv build-assets/electron-v1.3.4-linux-x64.zip $HOME/.electron
fi
if [[ ! -e $HOME/.cache ]]; then
	mkdir $HOME/.cache
	(
		cd build-assets
		tar xvzf fpm.tar.gz
		mv fpm $HOME/.cache
	)

	rm -rf build-assets
fi
