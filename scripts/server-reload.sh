#!/bin/bash

# This script will delete the pm2 process for the documentation server and
# then recreate the process.  This is helpful if the application run
# parameters are updated.

npm run-script server-delete
npm run-script server-start

