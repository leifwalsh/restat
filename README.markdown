Restat
======

Monitors status of a github-enabled shop.

USAGE
-----

    make GHUSER=<github username> GHTOKEN=<github api token>

If this tells you to install things, install them.  You'll likely need root in
order to install things to your `cgi-bin` directory

Otherwise, if everything works as planned, and your webserver can run CGI
scripts, you'll be fine.  Just serve this directory from your webserver, and
load `index.html` in your browser.

Optionally, provide `CGIBIN=<alternate directory>` to change where the CGI
script is placed.  Just make sure your webserver will run perl scripts in that
directory.

TODO
----

* multiple repos
* push updates
* better (smaller) ui
* figure out basic auth correctly so we don't dep on curl

BUGS
----

Plenty, I'm sure.

AUTHORS
-------

* Leif Walsh (adlaiff6) <leif.walsh@gmail.com>

COPYING
-------

BSD 3-clause
