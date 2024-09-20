# This Dockerfile is used to run the tests in a clean environment on your own machine
# If CI is failing you can run yarn test:docker on your own machine to debug
# NB The Container will close after yarn test has run, so amend to keep it alive if you want
# to run tests inside the container

# syntax=docker/dockerfile:1.2

# Use an official Node.js LTS runtime as a parent image
FROM node:20.17.0
# Set the CI environment variable
ENV CI=true

# Enable Corepack and set the correct version of yarn
RUN corepack enable && corepack prepare yarn@4.4.1 --activate

RUN npm install -g npm@10.8.2

RUN echo "node: $(node -v)"
RUN echo "yarn: $(yarn -v)"

# Set the working directory
WORKDIR /app

# Copy the local .git folder into the Docker image
COPY .git /app/.git

ARG CACHEBUST=1 
RUN git clone --local /app/.git /app/repo

WORKDIR /app/repo

# Install root dependencies with the --immutable flag
RUN yarn install --immutable

RUN yarn clean:build
RUN yarn build
RUN cd packages/vxrn && yarn build

# Run the tests and capture the output

CMD yarn test

# Uncomment to keep the container running after the tests have run
# CMD yarn test; echo "Tests completed. Container is still running."; tail -f /dev/null