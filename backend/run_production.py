#!/usr/bin/env python3
"""
Production startup script for the antenna array analysis web app.
This script configures the Flask app for production deployment.
"""

import os
from app import app

if __name__ == '__main__':
    # Production configuration
    port = int(os.environ.get('PORT', 5002))
    
    # For production, we don't want debug mode
    app.run(host='0.0.0.0', port=port, debug=False) 