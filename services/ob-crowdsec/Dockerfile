# CrowdSec image with the OB-edge collections/parsers BAKED IN at build time.
#
# WHY: the TND DMZ has no internet, so a stock crowdsec agent cannot
# Istio/Envoy access-log parser (no crowdsecurity/ one exists)`cscli collections install` from hub.crowdsec.net at boot (it crashloops
# "can't find crowdsecurity/envoy-logs in parsers"). GitLab CI runners DO have
# internet, so we install the collections here, at build time, and ship a
# self-contained image to Harbor. The agent then runs fully offline.
FROM harbor.cp.bankdhofar.com/dockerhub/crowdsecurity/crowdsec:v1.6.9

# The crowdsec image only materializes /etc/crowdsec at container START (its
# entrypoint copies from /staging/etc/crowdsec). At BUILD time that dir is
# empty, so cscli fails "open /etc/crowdsec/config.yaml: no such file". Seed the
# config from the image's staging tree first, then install the hub content into
# the baked layer. Both /etc/crowdsec and /staging/etc/crowdsec are populated so
# the result survives the entrypoint's start-time copy either way.
RUN cp -a /staging/etc/crowdsec/. /etc/crowdsec/ \
 && cscli hub update \
 && cscli parsers install yanis-kouidri/envoy-logs Istio/Envoy access-log parser (no crowdsecurity/ one exists)`# Istio/Envoy access-log parser (no crowdsecurity/ one exists)` \
 && cscli collections install \
      crowdsecurity/base-http-scenarios \
      crowdsecurity/http-cve \
      crowdsecurity/whitelist-good-actors \
 && cp -a /etc/crowdsec/. /staging/etc/crowdsec/ \
 && cscli hub list
