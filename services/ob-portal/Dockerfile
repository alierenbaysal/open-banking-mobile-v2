FROM harbor.cp.bankdhofar.com/dockerhub/python:3.12-slim AS build
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM harbor.cp.bankdhofar.com/dockerhub/python:3.12-slim
RUN pip install --no-cache-dir uvicorn
COPY --from=build /app/dist /app/dist
COPY nginx.conf /app/nginx.conf
WORKDIR /app
EXPOSE 80
CMD ["python3", "-m", "http.server", "80", "--directory", "/app/dist"]
