#!/bin/bash

# This script will delete the pm2 processes for the source watchers and
# then recreate the processes.  This is helpful if the application run
# parameters are updated.

npm run-script watchers-delete
npm run-script watchers-start

