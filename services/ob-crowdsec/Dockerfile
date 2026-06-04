# CrowdSec image with the OB-edge collections/parsers BAKED IN at build time.
#
# WHY: the TND DMZ has no internet, so a stock crowdsec agent cannot install
# parsers/collections from hub.crowdsec.net at boot (it crashloops "can't find
# ... in parsers"). GitLab CI runners DO have internet, so we install the
# collections here, at build time, and ship a self-contained image. The agent
# then runs fully offline with real OB-edge detection.
#
# RUNTIME CONTRACT with the crowdsec helm chart: its init container does
#   ln -s /staging/etc/crowdsec /etc/crowdsec && cscli lapi register && \
#   cp /etc/crowdsec/local_api_credentials.yaml /tmp_config/...
# That symlink only works if /etc/crowdsec does NOT exist. The stock image keeps
# /etc/crowdsec empty (the entrypoint populates it from /staging at start). So
# we bake everything into /staging and leave /etc/crowdsec EMPTY — otherwise
# ln -s fails, the && chain breaks, registration is lost, and the agent crashes
# "machine not found".
#
# Envoy parser: the Istio/Envoy access-log parser is the community
# "yanis-kouidri/envoy-logs" (v1.6.9's curated index doesn't resolve it), so we
# drop the file in directly. We bake ONLY the hub content dirs into /staging
# (not config.yaml / *_api_credentials.yaml, which the chart manages).
FROM harbor.cp.bankdhofar.com/dockerhub/crowdsecurity/crowdsec:v1.6.9

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
 && cscli parsers list \
 && cscli collections list \
 && for d in hub parsers scenarios collections postoverflows patterns; do \
      if [ -e "/etc/crowdsec/$d" ]; then \
        rm -rf "/staging/etc/crowdsec/$d"; \
        cp -a "/etc/crowdsec/$d" "/staging/etc/crowdsec/$d"; \
      fi; \
    done \
 && rm -f /staging/etc/crowdsec/local_api_credentials.yaml /staging/etc/crowdsec/online_api_credentials.yaml \
 && rm -rf /etc/crowdsec
