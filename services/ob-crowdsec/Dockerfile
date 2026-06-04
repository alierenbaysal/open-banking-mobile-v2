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
# config from staging first, install the hub content, then copy the populated
# tree back into /staging so it survives the entrypoint's start-time copy.
#
# Parser note: the Istio/Envoy access-log parser is the community
# "yanis-kouidri/envoy-logs" — there is no "crowdsecurity/envoy-logs".
RUN cp -a /staging/etc/crowdsec/. /etc/crowdsec/ \
 && cscli hub update \
 && cscli parsers install yanis-kouidri/envoy-logs \
 && cscli collections install \
      crowdsecurity/base-http-scenarios \
      crowdsecurity/http-cve \
      crowdsecurity/whitelist-good-actors \
 && cp -a /etc/crowdsec/. /staging/etc/crowdsec/ \
 && cscli hub list
