# build container
FROM node:14-bullseye-slim AS build

WORKDIR /usr/src/app
# copy build files
COPY . ./
# install all dependencies
RUN npm ci
# build for production
RUN npm run build:prod

# run container
FROM node:14-bullseye-slim AS run

WORKDIR /usr/src/app
# install python 3 for canvas NPM library
RUN apt-get update || : && apt-get install python3 -y
# package & production dependencies
COPY package*.json .env* ./
RUN npm ci --only=production
# built version from build container
COPY --from=build /usr/src/app/dist/* dist/

EXPOSE 3000
CMD [ "npm", "run", "start" ]
