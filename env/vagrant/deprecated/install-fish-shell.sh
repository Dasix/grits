#!/bin/bash

echo ""
echo "[Provision] Running install-fish-shell.sh"

# Define some common paths
VG_PROJECT_ROOT="/project"
VG_ENV_ROOT="$VG_PROJECT_ROOT/env"
VG_CONFIG_ROOT="$VG_ENV_ROOT/vagrant"
VG_SCRIPT_ROOT="$VG_CONFIG_ROOT/provision"

# Ensure we're in the yum repos directory
cd /etc/yum.repos.d/

# Add the yum repo for fish
wget http://download.opensuse.org/repositories/shells:fish:release:2/CentOS_7/shells:fish:release:2.repo

# Install fish
yum install -y fish

