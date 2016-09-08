#!/bin/bash
set -e 

LAST_DEV_REVISION=$(cat dev-package.json.changes | head -1 | cut -d' ' -f1)
LAST_APP_REVISION=$(cat app-package.json.changes | head -1 | cut -d' ' -f1)

git log --oneline --decorate master ${LAST_DEV_REVISION}..master -- package.json | cut -d' ' -f2- | sed 's/^\(.*\)/  * [dev changes] \1\n/' > changes
git log --oneline --decorate master ${LAST_APP_REVISION}..master -- app/package.json | cut -d' ' -f2- | sed 's/^\(.*\)/  * [app changes] \1\n/' >> changes

if [[ $(cat changes|wc -l) == 0 ]]; then
	echo "No changes detected, no need to redeploy node_modules"

	if [[ $# == 0 ]]; then
		exit 0
	fi
	echo "Force change specified in arguments: $@"

	echo "  * $@" > changes
fi

echo "Changes in package.json detected. Rebuilding package"

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
cp -rf Makefile $DEST/

(
cd release-stage
echo "Remove older releases"
rm -fv octane*.tar.xz *.dsc *_source.changes
)

cd $DEST

echo "Update change log"

V=$(head -1 debian/changelog | sed 's/.*(\(.*\)).*/\1/' | sed 's/.*\.\(.*\)-1.*/\1/')
V=$((V+1))

LANG=C echo "octane-skype-node-modules (1.0.$V-1~ubuntuppa1) wily; urgency=low

$(cat ../../changes)

 -- Gabriel Takeuchi <g.takeuchi@gmail.com>  $(date -R)
" | cat - ../../debian/changelog > debian/changelog

version=$(cat debian/changelog|head -1|sed 's/.*(\(.*\)-1.*/\1/')

TAR="octane-skype-node-modules_${version}.orig.tar.xz"
echo "Pack source code to $TAR"
tar cJf ../$TAR *

echo "Prepare signatures and source changes"
dpkg-buildpackage -S 

cd -

git log --oneline --decorate master -- package.json > dev-package.json.changes
git log --oneline --decorate master -- app/package.json > app-package.json.changes
