#!/bin/bash

set -e 

if [[ ! -e electron-v1.3.4-linux-x64.zip ]]; then
    wget https://github.com/electron/electron/releases/download/v1.3.4/electron-v1.3.4-linux-x64.zip \
        -O electron-v1.3.4-linux-x64.zip
fi

if [[ ! -e node-v6.5.0-linux-x64.tar.xz ]]; then
    wget https://nodejs.org/dist/v6.5.0/node-v6.5.0-linux-x64.tar.xz \
        -O node-v6.5.0-linux-x64.tar.xz
fi

if [[ ! -e fpm-1.5.0-2.3.1-linux-x86_64.tar.xz ]]; then
    wget https://github.com/develar/fpm-self-contained/releases/download/v1.5.0-2.3.1/fpm-1.5.0-2.3.1-linux-x86_64.tar.xz \
        -O fpm-1.5.0-2.3.1-linux-x86_64.tar.xz
fi

mkdir -p release-stage 
cd release-stage

echo "Caching authentication"
rm -f bogus.txt.gpg
echo "Just to store authentication" > bogus.txt
gpg --sign bogus.txt
rm -f bogus.txt.gpg

echo "Remove older releases"
rm -fv octane*.tar.xz *.dsc *_source.changes

(
	echo "Copy source code"
	mkdir -p src-release
	rsync -r -t -v --progress --exclude=$(basename $(pwd)) --exclude=.git --exclude=.idea ../ -c -l -z src-release

	echo "Update change log"
	cd src-release

	LANG=C echo "octane-skype-build-assets (1.0.1-1~ubuntuppa1) wily; urgency=low

  * Initial release

 -- Gabriel Takeuchi <g.takeuchi@gmail.com>  $(date -R)
" > debian/changelog

	version=$(cat debian/changelog|head -1|sed 's/.*(\(.*\)-1.*/\1/')

	TAR="octane-skype-build-assets_${version}.orig.tar.xz"
	echo "Pack source code to $TAR"
	tar cJf ../$TAR *

	echo "Prepare signatures and source changes"
	dpkg-buildpackage -S
)

