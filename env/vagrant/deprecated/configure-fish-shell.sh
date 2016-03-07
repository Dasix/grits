#!/bin/bash

echo ""
echo "[Provision] Running configure-fish-shell.sh"

# Load common path variables
source "/project/env/vagrant/provision/_paths.sh"

# Define the source config path
FISH_CONFIG_SOURCE="$VG_SCRIPT_ROOT/conf/config.fish"

# Helper Function
install_fish_config() {

	echo ""
	echo "Installing fish configuration file"

	# The destination will change for each user
	FISH_CONFIG_DEST=$1
	FISH_CONFIG_DEST_FILE="$FISH_CONFIG_DEST/config.fish"

	# a. Ensure fish configuration directory exists
	echo "  => Ensuring that '$FISH_CONFIG_DEST' exists.."
	mkdir -p "$FISH_CONFIG_DEST"

	# b. Clear existing config
	echo "  => Removing old config ($FISH_CONFIG_DEST_FILE)"
	rm -rf "$FISH_CONFIG_DEST/config.fish"

	# c. Copy the new configuration
	echo "  => Copying new config .."
	echo "    => Source : $FISH_CONFIG_SOURCE"
	echo "    => Dest   : $FISH_CONFIG_DEST"
	cp "$FISH_CONFIG_SOURCE" "$FISH_CONFIG_DEST"

	echo ""

}

# Configuration for user: vagrant
install_fish_config "/home/vagrant/.config/fish"
chown vagrant:vagrant /home/vagrant -R

# Configuration for user: root
install_fish_config "/root/.config/fish"
chown root:root /root -R
