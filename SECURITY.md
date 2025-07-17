# Security Configuration

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

## Testing Security

To test that CORS is working correctly:

```bash
# Test from allowed origin (should work)
curl -H "Origin: http://localhost:3000" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:5000/api/linear-array/analyze \
     -d '{"num_elem": 8, "element_spacing": 0.5}'

# Test from disallowed origin (should fail)
curl -H "Origin: http://malicious-site.com" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:5000/api/linear-array/analyze \
     -d '{"num_elem": 8, "element_spacing": 0.5}'
``` 