# for chat app
# having a lot of trouble building it in docker itself, it freezes
# instead plan to just build it on ci/local and then use the built here

FROM node:22.4

ARG ONE_SERVER_URL

# unlock
RUN apt-get update && apt-get install -y git bsdmainutils vim-common

WORKDIR /app
COPY . .

# Run a command to replace all dependencies and devDependencies with workspace:* in current package.json
# with the version number found in the package.json.version:
RUN node -e "let pkg=require('./package.json'); ['dependencies', 'devDependencies'].forEach(depType => { if(pkg[depType]) { Object.keys(pkg[depType]).forEach(dep => { if(pkg[depType][dep].startsWith('workspace:')) { pkg[depType][dep] = pkg.version; } }); } }); require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));"

RUN corepack enable && corepack prepare yarn@4.5.3 --activate
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN yarn install

EXPOSE 3000

CMD ["yarn", "serve"]
