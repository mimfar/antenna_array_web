#!/bin/bash

echo "🚀 Starting deployment of Antenna Array Analysis Web App..."

# Check if we're in the right directory
if [ ! -f "backend/app.py" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing Python dependencies..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

echo "🔨 Building React frontend..."
cd ../frontend
npm install
npm run build

echo "🌐 Starting production server..."
cd ../backend
source venv/bin/activate

echo "Starting with Gunicorn..."
gunicorn -c gunicorn.conf.py app:app

echo "✅ Deployment complete! App should be running on http://localhost:5000" 