# Security Configuration

## Content Security Policy (CSP)

The application now implements a secure Content Security Policy to prevent XSS attacks and other security vulnerabilities.

### Configuration

1. **Copy the environment template:**
   ```bash
   cp backend/env.example backend/.env
   ```

2. **Edit the `.env` file for CSP settings:**
   ```bash
   # Enable CSP (recommended: true)
   CSP_ENABLED=true
   
   # Use report-only mode for testing (recommended: false in production)
   CSP_REPORT_ONLY=false
   
   # Optional: URI for CSP violation reports
   CSP_REPORT_URI=
   ```

### CSP Directives

The CSP is configured with the following secure directives:

- **script-src**: `'self' 'nonce-{nonce}' https://cdn.plot.ly`
  - Allows scripts from same origin
  - Allows scripts with valid nonces (prevents XSS)
  - Allows Plotly.js from CDN
- **style-src**: `'self' 'unsafe-inline'`
  - Allows styles from same origin
  - Allows inline styles (required for React)
- **object-src**: `'none'`
  - Blocks all plugins (Flash, Java, etc.)
- **frame-ancestors**: `'none'`
  - Prevents clickjacking attacks
- **upgrade-insecure-requests**
  - Forces HTTPS in production

### Security Features

- **Nonce-based Script Allowlisting**: Each request gets a unique nonce for inline scripts
- **No unsafe-eval**: Prevents eval() and similar dangerous functions
- **No unsafe-inline for scripts**: Only allows inline scripts with valid nonces
- **Configurable**: CSP can be disabled or set to report-only mode for testing
- **Environment-specific**: Different settings for development and production

### Testing CSP

Use the provided test script to verify CSP implementation:

```bash
python test_csp.py
```

Check browser developer tools for CSP violations:
1. Open browser dev tools
2. Go to Console tab
3. Look for CSP violation messages
4. Check Network tab for CSP headers

## CORS (Cross-Origin Resource Sharing)

The application now uses secure CORS configuration instead of allowing all origins (`*`).

### Configuration

1. **Copy the environment template:**
   ```bash
   cp backend/env.example backend/.env
   ```

2. **Edit the `.env` file:**
   ```bash
   # For development
   CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   
   # For production (replace with your actual domain)
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

### Security Features

- **Restricted Origins**: Only specified domains can access the API
- **Limited Methods**: Only GET, POST, and OPTIONS methods are allowed
- **Controlled Headers**: Only Content-Type header is allowed
- **No Credentials**: Credentials are disabled by default for security

## Input Validation

The API endpoints now include comprehensive input validation:

- **Type Checking**: Ensures correct data types for all inputs
- **Range Validation**: Limits array elements and spacing to reasonable values
- **Required Fields**: Validates that all required parameters are provided
- **Sanitization**: Converts and validates input values

### Security Limits

- **MAX_ELEMENTS**: Maximum number of array elements (default: 1000)
- **MAX_SPACING**: Maximum element spacing in wavelengths (default: 10.0)

These can be configured in the `.env` file:

```bash
MAX_ELEMENTS=1000
MAX_SPACING=10.0
```

## Environment-Based Configuration

The application uses different configurations for different environments:

- **Development**: Relaxed settings for local development
- **Production**: Strict security settings
- **Testing**: Isolated settings for automated tests

## Best Practices

1. **Never use `CORS_ORIGINS=*` in production**
2. **Always set a strong SECRET_KEY in production**
3. **Use HTTPS in production**
4. **Regularly update dependencies**
5. **Monitor API usage and logs**
6. **Test CSP in report-only mode before enforcing**
7. **Monitor CSP violation reports**

## Testing Security

To test that CORS is working correctly:

```bash
# Test from allowed origin (should work)
curl -H "Origin: http://localhost:3000" http://localhost:5001/health

# Test from disallowed origin (should fail)
curl -H "Origin: http://malicious-site.com" http://localhost:5001/health
```

To test CSP implementation:

```bash
# Run the CSP test script
python test_csp.py

# Check headers manually
curl -I http://localhost:5001/health
``` 