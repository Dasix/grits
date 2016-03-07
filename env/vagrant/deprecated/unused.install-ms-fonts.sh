#!/bin/bash

echo ""
echo "[Provision] Running install-ms-fonts.sh"

# Install fonts for PhantomJS
cd /home/vagrant
wget http://www.my-guides.net/en/images/stories/fedora12/msttcore-fonts-2.0-3.noarch.rpm
rpm -Uvh msttcore-fonts-2.0-3.noarch.rpm
