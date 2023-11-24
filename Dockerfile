# Use your custom base image
FROM oven/bun

# Create a user and group called 'makima'
RUN groupadd -r makima && useradd -r -g makima -m -d /home/makima -s /bin/bash makima

# Set the working directory to environment variable of MAKIMA_WORKING_DIR
WORKDIR /home/makima/makima

# Copy the local files to the container, excluding the node_modules folder
COPY . /home/makima/makima

# Change the ownership of the working directory to the 'makima' user
RUN chown -R makima:makima /home/makima/makima

# Switch to the 'makima' user
USER makima

# Install dependencies using 'bun install'
RUN bun install

# Specify the command to run when the container starts
CMD ["bun", "run", "index.ts"]