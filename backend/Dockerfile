FROM node:20

WORKDIR /app

COPY . .

RUN npm install -g node-pg-migrate

RUN npm install

EXPOSE 4000

CMD ["npm", "run", "dev"]
