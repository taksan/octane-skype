#!/bin/bash

set -e 

function wait_for()
{
    log "Counting down..." 
    local secs=$1
    while [ $secs -gt 0 ]; do
        echo -ne "$secs\033[0K\r" >&2
        # if any key is pressed, stop counting and return; or else decrement counter
        read -t 1 -n 1 -s && return || : $((secs--))
    done
}

DIST=$1
if [[ -z $DIST ]]; then
	echo "Series not provided. Series can be: trusty vivid wily xenial"
	DIST=$(echo $(lsb_release -c|cut -d: -f2))
	echo "Using $DIST in 5 sec... press CTRL+C to stop or any key to continue"
	wait_for 5
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
#sed -i "s/1.0..*-1/1.0.$V-1/g" debian/changelog

LANG=C echo "octane-skype (1.0.$V-1~${DIST}ppa1) $DIST; urgency=low

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
dpkg-buildpackage -S

cd ..
rm -f $DIST
mkdir $DIST
mv octane-skype* $DIST
