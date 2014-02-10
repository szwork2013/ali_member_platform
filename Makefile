TESTS = test/*.test.js
REPORTER = spec
TIMEOUT = 10000
JSCOVERAGE = ./node_modules/jscover/bin/jscover

install:
	@npm install

test:
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
	--reporter $(REPORTER) \
	--timeout $(TIMEOUT) \
	$(TESTS)

test-cov: lib-cov
	@URLRAR_COV=1 $(MAKE) test
	@URLRAR_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

lib-cov:
	@rm -rf $@
	@$(JSCOVERAGE) lib $@

.PHONY: install test test-cov lib-cov
