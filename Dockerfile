# Use an official Node.js LTS runtime as a parent image
FROM node:20.17.0

# Enable Corepack and set the correct version of yarn
RUN corepack enable && corepack prepare yarn@4.4.1 --activate


RUN echo "node: $(node -v)"
RUN echo "yarn: $(yarn -v)"


# Set the working directory
WORKDIR /app

# Copy the entire monorepo except node_modules
COPY . .

RUN rm -rf node_modules

# Set NPM version to 10.8.2
RUN npm install -g npm@10.8.2
# Set the CI environment variable
ENV CI=true

# Install root dependencies with the --immutable flag
RUN yarn install --immutable



# Run the tests
CMD ["yarn", "test"]