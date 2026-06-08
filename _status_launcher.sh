#!/bin/bash
# Launches the status writer fully detached (survives SSH disconnect).
pkill -f _status_writer.py 2>/dev/null
sleep 1
setsid nohup python3 /home/ubuntu/_status_writer.py > /tmp/status_writer.log 2>&1 < /dev/null &
sleep 2
ps -ef | grep _status_writer.py | grep -v grep
