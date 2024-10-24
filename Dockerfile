# for onstack.dev railway

FROM node:22.4

ARG ONE_SERVER_URL

# unlock
RUN apt-get update && apt-get install -y git bsdmainutils vim-common

WORKDIR /app
COPY . .

RUN corepack enable
RUN corepack prepare yarn@4.4.0 --activate
RUN yarn install --immutable
RUN yarn build:js
RUN yarn dev:build:web

EXPOSE 3000

CMD ["yarn", "site:serve"]
