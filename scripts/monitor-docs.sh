#!/bin/bash

# This script uses pm2 to monitor the doc generation process as source
# code is updated.

pm2 logs watch-doc-source --raw
