#!/bin/bash


echo 'start syncing strava data.'

python run_page/strava_sync.py ${STRAVA_CLIENT_ID} ${STRAVA_CLIENT_SECRET} ${STRAVA_REFRESH_TOKEN}



