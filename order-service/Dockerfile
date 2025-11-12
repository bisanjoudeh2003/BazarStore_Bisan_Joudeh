FROM node:18
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install sqlite3 express axios
EXPOSE 5002
CMD ["node", "app.js"]
