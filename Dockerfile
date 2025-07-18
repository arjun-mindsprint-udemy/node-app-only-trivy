#-------- FRONTEND --------
FROM node:18 AS frontend

WORKDIR /app/frontend

COPY src/frontend/package*.json ./
RUN npm install

COPY src/frontend/ ./
RUN npm run build

#-------- BACKEND --------
FROM node:18 AS backend

WORKDIR /app

# Copy backend files
COPY src/backend/package*.json ./backend/
RUN cd backend && npm install

# Copy backend source
COPY src/backend/ ./backend/

# Copy frontend build into backend's static folder
COPY --from=frontend /app/frontend/build ./backend/public

# Expose backend port
EXPOSE 5000

# Start backend server
CMD ["node", "backend/index.js"]
