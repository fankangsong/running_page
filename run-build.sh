#!/bin/sh

cd /srv/webdav/data/code-server/workspace/running_page

sh build.sh >> build.log 2>&1 & 
