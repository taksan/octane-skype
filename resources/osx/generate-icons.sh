#!/bin/bash

mkdir i
cd i
cp ../../icons/512x512.png icon_512x512x32.png
for R in 16x16 32x32 48x48 128x128 256x256; do
	convert  -resize $R  icon_512x512x32.png icon_${R}x32.png
done

png2icns ../icon.icns *.png
