# for onstack.dev railway

FROM oven/bun:1.2.22

ARG ONE_SERVER_URL

# Install Node.js for npm (needed for some operations)
RUN apt-get update && apt-get install -y git bsdmainutils vim-common curl
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app
COPY . .

RUN bun install --frozen-lockfile
RUN bun run build:js
RUN bun run site:build

EXPOSE 3000

CMD ["bun", "run", "site:serve"]
