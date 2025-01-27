# for chat app
# having a lot of trouble building it in docker itself, it freezes
# instead plan to just build it on ci/local and then use the built here

FROM node:22.4

ARG ONE_SERVER_URL

# unlock
RUN apt-get update && apt-get install -y git bsdmainutils vim-common

WORKDIR /app
COPY . .

RUN corepack enable
RUN corepack prepare yarn@4.4.0 --activate
RUN yarn install --immutable

WORKDIR /app/apps/chat

EXPOSE 3000

CMD ["yarn", "serve"]
