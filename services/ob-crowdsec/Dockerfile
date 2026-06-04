# CrowdSec image with the OB-edge collections/parsers BAKED IN at build time.
#
# WHY: the TND DMZ has no internet, so a stock crowdsec agent cannot install
# parsers/collections from hub.crowdsec.net at boot (it crashloops "can't find
# ... in parsers"). GitLab CI runners DO have internet, so we install the
# collections here, at build time, and ship a self-contained image. The agent
# then runs fully offline with real OB-edge detection.
FROM harbor.cp.bankdhofar.com/dockerhub/crowdsecurity/crowdsec:v1.6.9

# The crowdsec image only materializes /etc/crowdsec at container START (its
# entrypoint copies from /staging/etc/crowdsec). At BUILD time that dir is
# empty, so cscli fails "open /etc/crowdsec/config.yaml: no such file". Seed the
# config from staging first.
#
# Envoy parser: the Istio/Envoy access-log parser is the COMMUNITY-authored
# "yanis-kouidri/envoy-logs", which v1.6.9's curated `cscli hub` index does not
# resolve ("can't find ... in parsers"). So drop the parser file directly into
# the s01-parse stage from the hub repo (CI runner has internet). The
# crowdsecurity/* collections below DO resolve via cscli normally.
RUN cp -a /staging/etc/crowdsec/. /etc/crowdsec/ \
 && cscli hub update \
 && mkdir -p /etc/crowdsec/parsers/s01-parse \
 && wget -qO /etc/crowdsec/parsers/s01-parse/envoy-logs.yaml \
      https://raw.githubusercontent.com/crowdsecurity/hub/master/parsers/s01-parse/yanis-kouidri/envoy-logs.yaml \
 && test -s /etc/crowdsec/parsers/s01-parse/envoy-logs.yaml \
 && cscli collections install \
      crowdsecurity/base-http-scenarios \
      crowdsecurity/http-cve \
      crowdsecurity/whitelist-good-actors \
 && cp -a /etc/crowdsec/. /staging/etc/crowdsec/ \
 && cscli parsers list \
 && cscli collections list

# build trigger 2d10e8c
