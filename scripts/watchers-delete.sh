#!/bin/bash

# This script will delete the watcher tasks in pm2.

pm2 delete ./env/pm2/watchers.json
