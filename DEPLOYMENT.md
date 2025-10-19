# Docker Deployment Guide - Attendance System

This guide will help you deploy the Attendance System on your college server using Docker.

## 📋 Prerequisites

Before deploying, ensure your server has:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git** (for cloning the repository)
- **2GB RAM minimum** (recommended: 4GB)
- **Port 3000 available** (or configure a different port)

### Install Docker (Ubuntu/Debian)

```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (avoid using sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

## 🚀 Quick Start Deployment

### Step 1: Clone the Repository

```bash
# Navigate to your preferred directory
cd /home/your-username

# Clone the repository
git clone <your-repo-url> attendance-system
cd attendance-system
```

### Step 2: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your actual credentials
nano .env
```

**Required variables to update in `.env`:**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-generated-secret
```

**⚠️ IMPORTANT:** Make sure your `.env` file is properly configured BEFORE building the Docker image, as the `NEXT_PUBLIC_*` variables are baked into the build during compilation.

### Step 3: Build and Run

```bash
# Build and start the container
docker compose up -d

# Check if container is running
docker compose ps

# View logs
docker compose logs -f
```

### Step 4: Access the Application

Open your browser and navigate to:
- **Local access:** `http://localhost:3000`
- **Network access:** `http://your-server-ip:3000`

## 🔧 Docker Commands Reference

### Container Management

```bash
# Start the application
docker compose up -d

# Stop the application
docker compose down

# Restart the application
docker compose restart

# View running containers
docker compose ps

# View logs
docker compose logs -f app

# View last 100 lines of logs
docker compose logs --tail=100 app
```

### Rebuild After Code Changes

```bash
# Stop and remove containers
docker compose down

# Rebuild the image
docker compose build --no-cache

# Start with new build
docker compose up -d
```

### Health Check

```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":123.45,"environment":"production","version":"1.0.0"}
```

## 🔐 Security Considerations

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 3000/tcp

# Or if using nginx reverse proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 2. Environment Variables Security

- **Never commit `.env`** to version control
- Keep your `.env` file readable only by your user:
  ```bash
  chmod 600 .env
  ```

### 3. Use HTTPS in Production

For production, use nginx as a reverse proxy with SSL:

```bash
# Install nginx
sudo apt install nginx certbot python3-certbot-nginx

# Configure nginx (see nginx.conf example below)
sudo nano /etc/nginx/sites-available/attendance

# Enable the site
sudo ln -s /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Restart nginx
sudo systemctl restart nginx
```

## 🌐 Custom Port Configuration

To use a different port (e.g., 8080 instead of 3000):

1. Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Change 8080 to your desired port
```

2. Restart the container:
```bash
docker compose down
docker compose up -d
```

## 📊 Monitoring and Logs

### View Real-time Logs

```bash
# All logs
docker compose logs -f

# Only app logs
docker compose logs -f app

# Last 50 lines
docker compose logs --tail=50 app
```

### Check Container Status

```bash
# List running containers
docker compose ps

# Inspect container
docker inspect attendance-system

# Check resource usage
docker stats attendance-system
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker compose logs app

# Check if port is already in use
sudo lsof -i :3000

# Remove and rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Application Shows Errors

```bash
# Verify environment variables
docker compose exec app printenv

# Check health endpoint
curl http://localhost:3000/api/health

# Restart the container
docker compose restart
```

### Database Connection Issues

1. Verify Supabase credentials in `.env`
2. Check if Supabase project is active
3. Ensure network connectivity to Supabase

```bash
# Test Supabase connectivity
curl -I https://your-project-id.supabase.co
```

### Out of Memory

```bash
# Check container memory usage
docker stats attendance-system

# Increase memory limit in docker-compose.yml
```

Add under the `app` service:
```yaml
deploy:
  resources:
    limits:
      memory: 2G
```

## 🔄 Updating the Application

### Pull Latest Changes

```bash
# Stop the container
docker compose down

# Pull latest code
git pull origin main

# Rebuild and start
docker compose build --no-cache
docker compose up -d
```

## 📦 Backup and Restore

### Backup Environment Configuration

```bash
# Backup .env file
cp .env .env.backup.$(date +%Y%m%d)
```

### Export Container Logs

```bash
# Export logs to file
docker compose logs app > logs-$(date +%Y%m%d).txt
```

## 🌍 Production Nginx Configuration (Optional)

Create `/etc/nginx/sites-available/attendance`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }
}
```

## 📞 Support

If you encounter issues:

1. Check the logs: `docker compose logs -f`
2. Verify environment variables: `.env` file
3. Test health endpoint: `curl http://localhost:3000/api/health`
4. Check Docker status: `docker compose ps`

## 🎓 College Server Specific Notes

- Ensure you have proper permissions to run Docker
- Check if your college network allows outbound connections to Supabase
- Consider setting up automated backups
- Document your deployment for other administrators

---

**Deployed successfully?** Access your attendance system at `http://your-server-ip:3000` 🎉
