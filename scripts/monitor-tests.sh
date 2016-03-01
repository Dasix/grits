#!/bin/bash

# This script uses pm2 to monitor automatic unit test execution as source
# code is updated.

pm2 logs watch-test-source --raw
