
FROM node:18


WORKDIR /app


COPY package*.json ./
COPY . .


RUN npm install sqlite3 express axios


EXPOSE 5001


CMD ["node", "app.js"]
