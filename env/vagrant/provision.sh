#!/bin/bash

# This is the main entry point for Vagrant provisioning.  This file will be
# executed within the Vagrant powered VM immediately after it is created and
# can be executed again via the "vagrant provision" command.  You can also
# execute this file from within the VM itself through SSH as shown below:
#
#     [root@mybox] /project/env/vagrant/provision.sh
#

# Load common path variables
source "/project/env/vagrant/provision/_paths.sh"

# Install Dependencies
"$VG_SCRIPT_ROOT/install-node-js.sh"
#"$VG_SCRIPT_ROOT/install-fish-shell.sh"
#"$VG_SCRIPT_ROOT/configure-fish-shell.sh"
#"$VG_SCRIPT_ROOT/npm-install-grunt.sh"
#"$VG_SCRIPT_ROOT/npm-install-mocha.sh"
#"$VG_SCRIPT_ROOT/npm-install-jsdoc.sh"
#"$VG_SCRIPT_ROOT/npm-install-deps.sh"
"$VG_SCRIPT_ROOT/npm-install-livereloadx.sh"
"$VG_SCRIPT_ROOT/npm-install-pm2.sh"

