# Gunicorn configuration file for production deployment

# Server socket
bind = "0.0.0.0:5001"
backlog = 2048

# Worker processes
workers = 2
worker_class = "sync"
worker_connections = 1000
timeout = 180
keepalive = 2

# Restart workers after this many requests, to help prevent memory leaks
max_requests = 1000
max_requests_jitter = 50

# Logging
# accesslog = "-"
# errorlog = "-"
loglevel = "info"

# Process naming
proc_name = "antenna-array-app"

# Server mechanics
daemon = False
pidfile = None
user = None
group = None
tmp_upload_dir = None

# SSL (uncomment if using HTTPS)
# keyfile = None
# certfile = None 