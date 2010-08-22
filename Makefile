CGIBIN=/usr/lib/cgi-bin

.PHONY: all verify-dep v-curl v-cgibindir v-cgi v-uriescape v-cryptssleay help clean
all: verify-dep $(CGIBIN)/echo.pl
	@echo "All done."
	@echo "Please serve this directory on HTTP and point your browser to ./index.html."

verify-dep: v-curl v-cgibindir v-cgi v-uriescape v-cryptssleay
	@echo "All dependencies satisfied."

v-curl:
	@[ -x $(which curl) ] || (echo "Please install curl" && exit 1)

v-cgibindir:
	@[ -d $(CGIBIN) ] || (echo "Check that $(CGIBIN) exists and your webserver runs cgi scripts from it" && exit 1)

v-cgi:
	@perl -MCGI -e '' || (echo "Please install CGI using CPAN." && exit 1)

v-uriescape:
	@perl -MURI::Escape -e '' || (echo "Please install URI::Escape using CPAN." && exit 1)

v-cryptssleay:
	@perl -MCrypt::SSLeay -e '' || (echo "Please install Crypt::SSLeay using CPAN." && exit 1)

$(CGIBIN)/echo.pl: scripts/echo.pl
	install -m755 $< $@

scripts/echo.pl: scripts/echo.pl.in
	@-[ x"" = x"$(GHUSER)" ] && (echo "Please provide Github username and token as make variables GHUSER and GHTOKEN." && exit 1)
	@-[ x"" = x"$(GHTOKEN)" ] && (echo "Please provide Github username and token as make variables GHUSER and GHTOKEN." && exit 1)

	sed -e "s/@USER@/$(GHUSER)/" < $< | sed -e "s/@TOKEN@/$(GHTOKEN)/" > $@

help:
	@cat README.markdown

clean:
	rm -f scripts/echo.pl