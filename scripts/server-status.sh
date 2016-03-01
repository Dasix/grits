#!/bin/bash

# This script will show the STATUS of the documentation web server.

pm2 status
pm2 show doc-server
