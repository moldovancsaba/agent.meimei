SHELL := /bin/bash

.PHONY: launch status doctor readiness skills agent config always-on-install always-on-uninstall always-on-status

launch:
	./scripts/oc-launch

status:
	./scripts/oc-status

doctor:
	./scripts/oc-doctor

readiness:
	./scripts/oc-readiness

skills:
	./scripts/oc-skills

agent:
	./scripts/oc-agent

config:
	./scripts/oc config validate

always-on-install:
	./scripts/meimei-always-on-install

always-on-uninstall:
	./scripts/meimei-always-on-uninstall

always-on-status:
	./scripts/meimei-always-on-status

