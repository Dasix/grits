#!/bin/bash

echo ""
echo "[Provision] Running build-phantom-js.sh"

# Install Prerequisite Libraries
yum makecache fast
yum -y install gcc gcc-c++ make flex bison gperf ruby \
  openssl-devel freetype-devel fontconfig-devel libicu-devel sqlite-devel \
  libpng-devel libjpeg-devel

# Change Directory
cd /home/vagrant

# Download Phantom-JS
git clone --recurse-submodules git://github.com/ariya/phantomjs.git

# Build Phantom-JS
cd phantomjs
./build.py

# Create Symlink
ln -s /home/vagrant/phantomjs/bin/phantomjs /usr/bin/phantomjs
