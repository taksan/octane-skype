#!/bin/bash

set -e 

mkdir -p release-stage 
cd release-stage

echo "Caching authentication"
rm -f bogus.txt.gpg
echo "Just to store authentication" > bogus.txt
gpg --sign bogus.txt
rm -f bogus.txt.gpg

echo "Remove older releases"
rm -fv octane*.tar.xz *.dsc *_source.changes

echo "Copy source code"
mkdir -p src-release
rsync -r -t -v --progress --exclude=$(basename $(pwd)) --exclude=.git --exclude=.idea ../ -c -l -z src-release

# download build requirements if not already available
mkdir -p build-assets
if [[ ! -e build-assets/electron-v1.3.4-linux-x64.zip ]]; then
	wget https://github.com/electron/electron/releases/download/v1.3.4/electron-v1.3.4-linux-x64.zip \
		-O build-assets/electron-v1.3.4-linux-x64.zip
fi

if [[ ! -e build-assets/node-v6.5.0-linux-x64.tar.xz ]]; then
	wget https://nodejs.org/dist/v6.5.0/node-v6.5.0-linux-x64.tar.xz \
		-O build-assets/node-v6.5.0-linux-x64.tar.xz
fi

if [[ ! -e build-assets/fpm-1.5.0-2.3.1-linux-x86_64.tar.xz ]]; then
	wget https://github.com/develar/fpm-self-contained/releases/download/v1.5.0-2.3.1/fpm-1.5.0-2.3.1-linux-x86_64.tar.xz \
		-O build-assets/fpm-1.5.0-2.3.1-linux-x86_64.tar.xz
fi
rsync -r -t -v --progress build-assets -c -l -z src-release

echo "Update change log"
cd src-release
V=$(head -1 debian/changelog | sed 's/.*(\(.*\)).*/\1/' | sed 's/.*\.\(.*\)-1/\1/')
V=$((V+1))
sed -i "s/1.0..*-1/1.0.$V-1/g" debian/changelog

version=$(cat debian/changelog|head -1|sed 's/.*(\(.*\)-.*/\1/')
make clean 
if [[ ! -e node_modules || ! -e app/node_modules ]]; then
	npm install
fi

echo "Pack source code to orig.tar.xz"
tar cJf ../octane-skype_${version}.orig.tar.xz *

echo "Prepare signatures and source changes"
dpkg-buildpackage -S

