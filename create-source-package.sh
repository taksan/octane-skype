#!/bin/bash

set -e 

CHANGES=

echo "Type the changes introduced by this release, one by line, finish with CTRL+D"
echo
set -f
while read -p'* ' line; do
    CHANGES="$CHANGES  
  * $line"
done
set +f

function build_source()
{
    cd src-release

    SERIES=$1
    shift

    V=$(head -1 debian/changelog | sed 's/.*(\(.*\)).*/\1/' | sed 's/.*\.\(.*\)-1.*/\1/')
    V=$((V+1))

    LANG=C echo "octane-skype (1.0.$V-1ubuntu1~$SERIES) $SERIES; urgency=low
$CHANGES

 -- Gabriel Takeuchi <g.takeuchi@gmail.com>  $(date -R)
" | cat - ../../debian/changelog > debian/changelog

    cp debian/changelog ../../debian/changelog

    version=$(cat debian/changelog|head -1|sed 's/.*(\(.*\)-1.*/\1/')
    echo $version
    make clean 

    TAR="octane-skype_${version}.orig.tar.xz"
    echo "Pack source code to $TAR"
    tar cJf ../$TAR *

    echo "Prepare signatures and source changes"
    dpkg-buildpackage -S -d
    cd ..
    mkdir -p $SERIES
    mv octane*.tar.xz *.dsc *_source.changes $SERIES
}

git checkout debian/changelog

mkdir -p release-stage 
cd release-stage

echo "Caching authentication"
rm -f bogus.txt.gpg
echo "Just to store authentication" > bogus.txt
gpg --sign bogus.txt
rm -f bogus.txt.gpg

echo "Remove older releases"
rm -rfv octane*.tar.xz *.dsc *_source.changes wily xenial

echo "Copy source code"
mkdir -p src-release
rsync -r -t -v --progress --exclude=$(basename $(pwd)) --exclude=.git --exclude=.idea --exclude="*.xz" --exclude="*zip" --exclude=node_modules ../ -c -l -z src-release

build_source wily
build_source xenial
