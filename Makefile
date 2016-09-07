install:
	mkdir -p debian/octane-skype-build-assets/opt/octane-skype-build-assets/
	mkdir -p debian/octane-skype-build-assets/usr
	tar xvJf node-v6.5.0-linux-x64.tar.xz
	mv -v node-v6.5.0-linux-x64/* debian/octane-skype-build-assets/usr
	cp -v electron-v1.3.4-linux-x64.zip fpm-1.5.0-2.3.1-linux-x86_64.tar.xz debian/octane-skype-build-assets/opt/octane-skype-build-assets/
	find debian

create-source-package:
	./create-assets-source-package.sh

push:
	cd release-stage && dput ppa:g-takeuchi/octane-skype-build-assets *_source.changes
