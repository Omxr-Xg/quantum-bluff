# Use official PostgreSQL image
FROM postgres:16

# Set environment variables for default DB and user
ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=my027
ENV POSTGRES_DB=defaultdb

# Copy initialization script into the special directory
COPY init.sql /docker-entrypoint-initdb.d/
