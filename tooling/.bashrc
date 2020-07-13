ln -s /usr/bin/pwd /usr/bin/opwd
alias pwd='truepath=$(opwd); echo ${truepath/\/home\/course/$DOCKER_WD}'

/usr/local/bin/start.sh