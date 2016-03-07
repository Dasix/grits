#!/bin/bash

echo ""
echo "[Provision] Running install-google-fonts.sh"

# Download the Google Web Fonts collection
cd /home/vagrant
wget https://github.com/google/fonts/archive/master.zip

# Unzip it
unzip master.zip

# Move the fonts to the system folder
mv /home/vagrant/fonts-master/ofl /usr/share/fonts/google-ofl
mv /home/vagrant/fonts-master/ufl /usr/share/fonts/google-ufl
