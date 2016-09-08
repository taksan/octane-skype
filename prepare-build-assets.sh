#!/bin/bash

set -e -v

ASSETS_HOME=/opt/octane-skype-build-assets/

if [[ ! -e $HOME/.electron ]]; then
	echo "== Preparing electron"
	# prevents electron-packager from trying to download
	mkdir $HOME/.electron
	cp $ASSETS_HOME/electron-v1.3.4-linux-x64.zip $HOME/.electron
fi
if [[ ! -e $HOME/.cache ]]; then
	echo "== Preparing fpm"
	mkdir -p $HOME/.cache/fpm
	(
		cd $HOME/.cache/
		tar xJf $ASSETS_HOME/fpm-1.5.0-2.3.1-linux-x86_64.tar.xz
		mv fpm-1.5.0-2.3.1-linux-x86_64 fpm
	)
fi
echo "Build requirements setup complete"
