SHELL:=/bin/bash
INSTALLDIR=${DESTDIR}/usr/share

all: build 

build: clean
	./install-node6.sh
	./build.sh

clean:
	rm -rf dist /tmp/octane-extracted debian/octane-skype/* 

install:
	pwd
	rsync -r -t -v --progress /tmp/octane_extracted/ -c -l -z debian/octane-skype

build-and-transfer: build-source-release transfer-to-ppa

build-source-release:
	./perform-linux-release.sh

test-build:
	cd release-stage; \
	sudo pbuilder build octane*.dsc

push: # transfer source package to ppa
	echo "Transfer files to ppa"
	cd release-stage; \
	dput ppa:g-takeuchi/octane-skype *_source.changes; \
	cp src-release/debian/changelog ../debian/
