# for chat app

FROM --platform=linux/amd64 node:22.4

ARG ONE_SERVER_URL

# unlock
RUN apt-get update && apt-get install -y git bsdmainutils vim-common

WORKDIR /app
COPY . .

RUN corepack enable
RUN corepack prepare yarn@4.4.0 --activate
RUN yarn install --immutable
RUN yarn profile react-19
RUN yarn build:js

WORKDIR /app/apps/chat
RUN yarn build:web

EXPOSE 3000

CMD ["yarn", "serve"]
