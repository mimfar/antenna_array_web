# Deployment Guide - Antenna Array Analysis Web App

## Quick Start

1. **Run the deployment script:**
   ```bash
   ./deploy.sh
   ```

2. **Access your app:**
   - Open http://localhost:5002 in your browser

## Manual Deployment

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm

### Step 1: Install Backend Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Build Frontend
```bash
cd frontend
npm install
npm run build
```

### Step 3: Start Production Server
```bash
cd backend
source venv/bin/activate
gunicorn -c gunicorn.conf.py app:app
```

## Deployment Options

### Local Development
```bash
cd backend
source venv/bin/activate
python app.py
```

### Production with Gunicorn
```bash
cd backend
source venv/bin/activate
gunicorn -c gunicorn.conf.py app:app
```

### Cloud Deployment

#### Heroku
1. Create a `Procfile` in the root directory:
   ```
   web: cd backend && gunicorn -c gunicorn.conf.py app:app
   ```

2. Deploy to Heroku:
   ```bash
   heroku create your-app-name
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

#### Railway
1. Connect your GitHub repository
2. Set build command: `cd frontend && npm install && npm run build`
3. Set start command: `cd backend && pip install -r requirements.txt && gunicorn -c gunicorn.conf.py app:app`

#### DigitalOcean App Platform
1. Connect your GitHub repository
2. Set build command: `cd frontend && npm install && npm run build`
3. Set run command: `cd backend && pip install -r requirements.txt && gunicorn -c gunicorn.conf.py app:app`

## Environment Variables

- `PORT`: Server port (default: 5000)
- `FLASK_ENV`: Set to 'production' for production mode

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   lsof -ti:5000 | xargs kill -9
   ```

2. **Permission denied:**
   ```bash
   chmod +x deploy.sh
   ```

3. **Module not found errors:**
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### Logs
- Gunicorn logs are output to stdout/stderr
- Check for errors in the terminal where you started the server 