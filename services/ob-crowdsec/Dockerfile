# CrowdSec image with the OB-edge collections/parsers BAKED IN at build time.
#
# WHY: the TND DMZ has no internet, so a stock crowdsec agent cannot
# `cscli collections install` from hub.crowdsec.net at boot (it crashloops
# "can't find crowdsecurity/envoy-logs in parsers"). GitLab CI runners DO have
# internet, so we install the collections here, at build time, and ship a
# self-contained image to Harbor. The agent then runs fully offline.
FROM harbor.cp.bankdhofar.com/dockerhub/crowdsecurity/crowdsec:v1.6.9

# Hub index + the OB-edge detection content. cscli writes to
# /etc/crowdsec/{collections,parsers,scenarios} + /var/lib/crowdsec/data which
# are baked into the image layer.
RUN cscli hub update \
 && cscli parsers install crowdsecurity/envoy-logs \
 && cscli collections install \
      crowdsecurity/base-http-scenarios \
      crowdsecurity/http-cve \
      crowdsecurity/whitelist-good-actors \
 && cscli hub list
