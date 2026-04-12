FROM harbor.cp.bankdhofar.com/dockerhub/python:3.12-slim AS builder

RUN apt-get update && apt-get install -y wget ca-certificates git && \
    wget -q https://go.dev/dl/go1.22.12.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.22.12.linux-amd64.tar.gz && \
    rm go1.22.12.linux-amd64.tar.gz && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/usr/local/go/bin:${PATH}"
ENV GONOSUMCHECK="*"
ENV GOFLAGS="-mod=mod"

WORKDIR /build
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /build/ob-tpp-manager \
    ./cmd/main.go

FROM harbor.cp.bankdhofar.com/dockerhub/python:3.12-slim
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
COPY --from=builder /build/ob-tpp-manager /usr/local/bin/ob-tpp-manager
USER appuser
EXPOSE 8000
ENTRYPOINT ["ob-tpp-manager"]
