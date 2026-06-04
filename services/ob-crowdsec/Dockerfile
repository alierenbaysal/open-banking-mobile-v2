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
# empty, so seed it from staging first, install the hub content, then copy ONLY
# the hub-CONTENT dirs back into /staging — NOT config.yaml or the *_api_
# credentials.yaml. The helm chart's init container registers each agent to LAPI
# and injects local_api_credentials.yaml; if we baked those config/credential
# files into /staging the entrypoint's start-time copy would CLOBBER the
# chart's registration creds → "machine not found". So bake hub content only.
#
# Envoy parser: the Istio/Envoy access-log parser is the COMMUNITY-authored
# "yanis-kouidri/envoy-logs", which v1.6.9's curated `cscli hub` index does not
# resolve; drop the parser file directly into the s01-parse stage.
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
 && for d in hub parsers scenarios collections postoverflows patterns; do \
      if [ -e "/etc/crowdsec/$d" ]; then \
        rm -rf "/staging/etc/crowdsec/$d"; \
        cp -a "/etc/crowdsec/$d" "/staging/etc/crowdsec/$d"; \
      fi; \
    done \
 && cscli parsers list \
 && cscli collections list
