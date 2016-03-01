#!/bin/bash

# This script will delete the pm2 process for the documentation server.

pm2 delete ./env/pm2/doc-server.json
