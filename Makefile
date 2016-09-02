SHELL:=/bin/bash
INSTALLDIR=${DESTDIR}/usr/share

all: build 

build: clean
	./install-node6.sh
	./build.sh

clean:
	rm -rf dist /tmp/octane-extracted debian/octane/* 

