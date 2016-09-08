#!/bin/bash
set -e 

echo "Caching authentication"
rm -f bogus.txt.gpg
echo "Just to store authentication" > bogus.txt
gpg --sign bogus.txt
rm -f bogus.txt.gpg

DEST=release-stage/node-modules-release

git checkout master package.json
git checkout master app/package.json
npm install
mkdir -p $DEST
rm -rf $DEST/*

echo "Copy source code"
cp -rf node_modules $DEST/dev_node_modules
cp -rf app/node_modules $DEST/app_node_modules
cp -rf debian $DEST/

(
cd release-stage
echo "Remove older releases"
rm -fv octane*.tar.xz *.dsc *_source.changes
)

cd $DEST

echo "Update change log"
cd 
V=$(head -1 debian/changelog | sed 's/.*(\(.*\)).*/\1/' | sed 's/.*\.\(.*\)-1/\1/')
V=$((V+1))

LANG=C echo "octane-skype-node-modules (1.0.$V-1~ubuntuppa1) wily; urgency=low

  * Updating node modules

 -- Gabriel Takeuchi <g.takeuchi@gmail.com>  $(date -R)
" | cat - ../../debian/changelog > debian/changelog

version=$(cat debian/changelog|head -1|sed 's/.*(\(.*\)-1.*/\1/')

TAR="octane-skype-node-modules_${version}.orig.tar.xz"
echo "Pack source code to $TAR"
tar cJf ../$TAR *

echo "Prepare signatures and source changes"
dpkg-buildpackage -S 

