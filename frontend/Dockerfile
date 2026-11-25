FROM node:20-alpine AS b
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
FROM node:20-alpine
WORKDIR /app
COPY --from=b /app/.next/standalone ./
COPY --from=b /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
