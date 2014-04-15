JSSOURCES=$(shell find lib -name '*.js' -print)
DOCDIRS=lib

default: build test

install:
	(unset tmp temp; npm i)

prepublish: lint doc test no-dos-endings check-coverage jstest-slow

lint: jslint doclint

jslint:
	./node_modules/.bin/jslint --terse -- $(JSSOURCES)

doclint:
	./node_modules/.bin/yuidoc $(DOCDIRS) --lint

test: jstest

jstest:
	./node_modules/.bin/mocha

jstest-slow:
	./node_modules/.bin/mocha -s 2000 test/slow

no-dos-endings:
	file $(JSSOURCES) | grep -v CRLF > /dev/null

cover: $(JSSOURCES)
	./node_modules/.bin/istanbul cover --print=both ./node_modules/mocha/bin/_mocha --

check-coverage: cover
	./node_modules/.bin/istanbul check-coverage --statements 99 --branches 99 --functions 99 --lines 99

doc:
	./node_modules/.bin/yuidoc $(DOCDIRS)

clean:
	-find . -name "*~" | xargs rm

.PHONY: install jslint jstest doc no-dos-endings check-coverage build tags clean
