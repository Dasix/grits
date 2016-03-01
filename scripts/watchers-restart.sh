#!/bin/bash

# This script will RESTART the watcher tasks.

pm2 restart ./env/pm2/watchers.json
