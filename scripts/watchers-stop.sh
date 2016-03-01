#!/bin/bash

# This script will STOP the watcher tasks.

pm2 stop ./env/pm2/watchers.json
