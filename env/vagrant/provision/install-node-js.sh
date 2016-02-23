#!/bin/bash

# This is a provisioning script that is executed automatically
# by Vagrant as part of the development environment setup.
# See the README.md in this directory for more information.

echo ""
echo "[Provision] install-node-js.sh: Installing Node.js"

curl --silent --location https://rpm.nodesource.com/setup_4.x | bash -
yum -y install nodejs gcc-c++ make
