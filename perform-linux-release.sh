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
rsync -r -t -v --progress --exclude=$(basename $(pwd)) --exclude=.git --exclude=.idea --exclude=*.xz --exclude=*zip ../ -c -l -z src-release

echo "Update change log"
cd src-release
V=$(head -1 debian/changelog | sed 's/.*(\(.*\)).*/\1/' | sed 's/.*\.\(.*\)-1/\1/')
V=$((V+1))

LANG=C echo "octane-skype (1.0.6-1~ubuntuppa1) wily; urgency=low

  * Packaging for multiple ubuntu versions

 -- Gabriel Takeuchi <g.takeuchi@gmail.com>  $(date -R)
" | cat - ../../debian/changelog > debian/changelog

version=$(cat debian/changelog|head -1|sed 's/.*(\(.*\)-1.*/\1/')
echo $version
make clean 
if [[ ! -e node_modules || ! -e app/node_modules ]]; then
	npm install
fi

TAR="octane-skype_${version}.orig.tar.xz"
echo "Pack source code to $TAR"
tar cJf ../$TAR *

echo "Prepare signatures and source changes"
dpkg-buildpackage -S -d
