install:
	mkdir -p debian/octane-skype-node-modules/opt/octane-skype-node-modules
	cp -vrf *_node_modules debian/octane-skype-node-modules/opt/octane-skype-node-modules/

create-source-package:
	./source-package-build.sh

push:
	cd release-stage && dput ppa:g-takeuchi/octane-skype-build-assets *_source.changes
	cp release-stage/node-modules-release/debian/changelog debian/changelog
