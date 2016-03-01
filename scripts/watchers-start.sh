#!/bin/bash

# This script will START the watcher tasks.

pm2 start ./env/pm2/watchers.json
