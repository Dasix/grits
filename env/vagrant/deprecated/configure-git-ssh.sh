#!/bin/bash

echo ""
echo "[Provision] Running configure-git-ssh.sh"

# Variables
SSH_CFG_ROOT="/project/env/vagrant/provision/conf/ssh"
SSH_CFG_FILE="$SSH_CFG_ROOT/config"
SSH_CFG_KEY="$SSH_CFG_ROOT/id_rsa"
SSH_CFG_HOSTS="$SSH_CFG_ROOT/known_hosts"

# Helper Function
copy_ssh_config () {
	SSH_CFG_USER=$1
	SSH_CFG_BASE_PATH=$2
	echo "-"
	echo "Configuring Path: $SSH_CFG_BASE_PATH"
	echo "Configuring User: $SSH_CFG_USER"

}

# Main Logic
if [ -f "$SSH_CFG_KEY" ]
then
	copy_ssh_config "/home/vagrant" "vagrant"
	copy_ssh_config "/root" "root"
else
	echo ""
	echo "----- IMPORTANT! --------------------------------------------------------------"
	echo ""
	echo "Your GitHub private key file was not found."
	echo "This is needed in order to make GIT pull and pushes from this Vagrant box"
	echo "Since the file was not found, GIT configuration will be skipped and certain"
	echo "features, such as gh-pages generation, will not be available."
	echo ""
	echo "    To fix:"
	echo "       - Put your Github key in $SSH_CFG_KEY"
	echo "       - Execute /project/env/vagrant/provision/configure-git-ssh.sh"
	echo ""
	echo "----- IMPORTANT! --------------------------------------------------------------"
	echo ""
fi
