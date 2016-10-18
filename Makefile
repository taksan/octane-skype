SHELL:=/bin/bash
INSTALLDIR=${DESTDIR}/usr/share

all: build 

build: clean
	./prepare-build-assets.sh
	./build.sh

clean:
	rm -rf dist /tmp/octane-extracted debian/octane-skype/* 

install:
	pwd
	rsync -r -t -v --progress /tmp/octane_extracted/ -c -l -z debian/octane-skype

build-and-transfer: build-source-release push

source-package:
	./create-source-package.sh

test-build:
	cd release-stage; \
	sudo pbuilder build octane*.dsc

push: # transfer source package to ppa
	echo "Transfer files to ppa"
	cd release-stage/wily && dput ppa:g-takeuchi/octane-skype *_source.changes; 
	cd release-stage/xenial && dput ppa:g-takeuchi/octane-skype *_source.changes; 
	cp release-stage/src-release/debian/changelog ../debian/
