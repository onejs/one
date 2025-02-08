#!/usr/bin/env bash

# disable mouse as input source
printf '\e[?1000l'

docker exec -it "$1" /bin/sh -c "[ -e /bin/bash ] && /bin/bash || /bin/sh"

# enable mouse as input source for dockly
#printf '\e[?1000h'
