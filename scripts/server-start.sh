#!/bin/bash

# This script will START the documentation web server.

pm2 start ./env/pm2/doc-server.json
