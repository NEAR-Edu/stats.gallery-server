FROM node:14-bullseye

WORKDIR /usr/src/app

RUN apt-get update || : && apt-get install python3 -y

COPY package*.json ./

RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "npm", "run", "start" ]
