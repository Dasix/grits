#!/bin/bash

# This file is executed each time that "vagrant up" or "vagrant reload" is
# executed.  During provisioning, this file is executed AFTER provision.sh.

# Load common path variables
source "/project/env/vagrant/provision/_paths.sh"

echo ""
echo "[Always] Running always.sh"

# Rebuild the YUM cache to make yum operations faster
echo "    > Rebuilding YUM cache"
#yum makecache fast

# Upload the database for the "locate" command (mlocate package)
echo "    > Updating local file database for 'locate'"
#updatedb

echo ""
