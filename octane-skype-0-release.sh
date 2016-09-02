#!/bin/bash

rm -rf octane-releases

rm -f /tmp/bogus.txt.gpg
echo "Just to store authentication" > /tmp/bogus.txt
gpg --sign /tmp/bogus.txt

version=$(cat debian/changelog|head -1|sed 's/.*(\(.*\)-.*/\1/')
make clean && dh_make -p octane_$version --s --createorig
mkdir -p octane-releases
mv ../octane_${version}.*.xz octane-releases
cd octane-releases
mkdir x && cd x
dpkg-buildpackage -S

#dput ppa:g-takeuchi/octane-skype-test *_source.changes
