FROM harbor.cp.bankdhofar.com/dockerhub/golang:1.22-alpine AS builder

RUN apk add --no-cache ca-certificates git

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /build/ob-tpp-manager \
    ./cmd/main.go

FROM harbor.cp.bankdhofar.com/dockerhub/alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

COPY --from=builder /build/ob-tpp-manager /usr/local/bin/ob-tpp-manager

USER appuser

EXPOSE 8000

ENTRYPOINT ["ob-tpp-manager"]
