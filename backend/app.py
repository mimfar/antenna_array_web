from flask import Flask, jsonify, request, send_from_directory, make_response
from flask_cors import CORS
import random
import io
import base64
import matplotlib.pyplot as plt
from linear_array import LinearArray, db20
from planar_array import PlanarArray
import numpy as np
import hashlib
import json
import os
from config import get_config
from collections import OrderedDict
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_limiter.errors import RateLimitExceeded
import logging
from logging.handlers import RotatingFileHandler

def generate_plot_image(fig):
    """Generate base64 image from matplotlib figure"""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_base64

def create_error_response(message, status_code=400, error_type="validation_error"):
    """Create standardized error response"""
    return jsonify({
        'error': error_type,
        'message': message,
        'status_code': status_code
    }), status_code


# Load configuration
config = get_config()

# app = Flask(__name__)
app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend', 'build', 'static'),
    static_url_path='/static'
)

# Apply configuration
app.config.from_object(config)
app.logger.info("Configuration loaded successfully")
app.logger.info(f"Application starting in {config.ENV} mode")

# Security: Limit request size to prevent DoS
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
app.logger.info("Security configurations applied")

# Security: Disable Flask's debug mode in production
if app.config.get('ENV') == 'production':
    app.config['DEBUG'] = False
    app.config['TESTING'] = False
    app.logger.info("Production mode enabled - debug and testing disabled")

# Set up logging
if not os.path.exists('logs'):
    os.mkdir('logs')

file_handler = RotatingFileHandler(
    config.LOG_FILE, 
    maxBytes=config.LOG_MAX_SIZE, 
    backupCount=config.LOG_BACKUP_COUNT
)
file_handler.setLevel(getattr(logging, config.LOG_LEVEL))
formatter = logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
)
file_handler.setFormatter(formatter)
app.logger.addHandler(file_handler)

# Add console logging for cloud deployment
stream_handler = logging.StreamHandler()
stream_handler.setLevel(getattr(logging, config.LOG_LEVEL))
stream_handler.setFormatter(formatter)
app.logger.addHandler(stream_handler)

# 
@app.route('/test')
def test():
    return "Flask is working!"



@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    print(f"Requested path: {path}")
    
    # Handle specific static files in root
    if path in ['favicon.ico', 'manifest.json', 'robots.txt', 'logo192.png', 'logo512.png', 'asset-manifest.json']:
        return send_from_directory('../frontend/build', path)
    
    # For any other path, serve index.html (React routing)
    return send_from_directory('../frontend/build', 'index.html')

@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'environment': app.config.get('ENV', 'unknown')
    }), 200

# Configure CORS with secure settings
CORS(app, 
     origins=config.CORS_ORIGINS,
     methods=config.CORS_METHODS,
     allow_headers=config.CORS_ALLOW_HEADERS,
     supports_credentials=config.CORS_SUPPORTS_CREDENTIALS)
# Global storage for array instances to avoid recalculation
ARRAY_CACHE_MAX_SIZE = config.CACHE_MAX_SIZE
array_cache = OrderedDict()

def cache_array(key, arr):
    # If key already exists, move it to the end (most recently used)
    if key in array_cache:
        array_cache.move_to_end(key)
        app.logger.debug(f"Cache hit for key: {key[:20]}...")
    else:
        app.logger.debug(f"Cache miss for key: {key[:20]}...")
    
    array_cache[key] = arr
    # If cache exceeds max size, remove the oldest item
    if len(array_cache) > ARRAY_CACHE_MAX_SIZE:
        evicted_key, _ = array_cache.popitem(last=False)  # Remove least recently used
        app.logger.info(f"Cache eviction: removed key {evicted_key[:20]}... (cache size: {len(array_cache)})")
    
    app.logger.debug(f"Cache size: {len(array_cache)}/{ARRAY_CACHE_MAX_SIZE}")

def get_array_key(array_type, array_params):
    """Generate a unique key for array caching"""
    # Create a hash of the array parameters
    param_str = json.dumps(array_params, sort_keys=True)
    return f"{array_type}_{hashlib.md5(param_str.encode()).hexdigest()}"

def validate_array_parameters(array_type, num_elem, element_spacing, radius=None):
    """Validate array parameters based on array type"""
    if array_type in ['rect', 'tri']:
        # Validate types for rectangular/triangular arrays
        if not isinstance(num_elem, list) or len(num_elem) != 2:
            return False, f"num_elem must be a list of two integers for {array_type} array"
        
        if not isinstance(element_spacing, list) or len(element_spacing) != 2:
            return False, f"element_spacing must be a list of two numbers for {array_type} array"
        
        try:
            num_elem = [int(num_elem[0]), int(num_elem[1])]
            element_spacing = [float(element_spacing[0]), float(element_spacing[1])]
        except (ValueError, TypeError):
            return False, f"num_elem must be integers, element_spacing must be numbers for {array_type} array"
        
        return True, (num_elem, element_spacing)
        
    elif array_type == 'circ':
        # Validate types for circular arrays
        if not isinstance(num_elem, list) or len(num_elem) < 1:
            return False, "num_elem must be a list of integers for circular array"
        
        if not isinstance(radius, list) or len(radius) != len(num_elem):
            return False, "radius must be a list with same length as num_elem"
        
        try:
            num_elem = [int(n) for n in num_elem]
            radius = [float(r) for r in radius]
        except (ValueError, TypeError):
            return False, "num_elem must be integers, radius must be numbers for circular array"
        
        return True, (num_elem, radius)
    
    return False, f"Invalid array type: {array_type}"

def create_plot_response(plot_type, arr, manifold_x, manifold_y, pattern_params, pattern_params_3d, cut_angle=None):
    """Create standardized response for different plot types"""
    if plot_type == 'pattern_cut':
        base_response = {
            'manifold_x': manifold_x,
            'manifold_y': manifold_y,
            'gain': pattern_params.Gain,
            'peak_angle': pattern_params.Peak_Angle,
            'sll': pattern_params.SLL,
            'hpbw': pattern_params.HPBW
        }
    else:
        base_response = {
            'manifold_x': manifold_x,
            'manifold_y': manifold_y,
            'gain': pattern_params_3d.Gain,
            'peak_angle': pattern_params_3d.Peak_Angle,
            'sll': pattern_params_3d.   SLL,
            'hpbw': pattern_params_3d.HPBW
        }  
    
    if plot_type == 'pattern_cut':
        # 2D pattern cut
        theta_deg, G = arr.pattern_cut(cut_angle)
        G[G<-100] = -100
        theta = theta_deg.tolist()
        pattern = G.tolist()
        
        # Add y-axis limits
        ymax = 5 * (int(max(pattern) / 5) + 1)
        ymin = ymax - 40
        
        return {
            **base_response,
            'theta': theta,
            'pattern': pattern,
            'cut_angle': cut_angle,
            'ymin': ymin,
            'ymax': ymax
        }
        
    elif plot_type == 'manifold':
        return {
            'manifold_x': manifold_x,
            'manifold_y': manifold_y,
            'array_type': 'rect'  # This should be passed as parameter
        }
        
    elif plot_type == 'polar3d':
        data = arr.get_3d_polar_data()
        return {
            **base_response,
            'plot_type': '3d_polar',
            'data': data
        }
        
    elif plot_type == 'contour':
        # Generate plot image
        
        fig, ax = arr.pattern_contour()
        img_base64 = generate_plot_image(fig)
        return {
            **base_response,
            'plot': img_base64
        }

    elif plot_type == 'polarsurf':
        fig, ax = arr.polarsurf()
        img_base64 = generate_plot_image(fig)
        return {
            **base_response,
            'plot': img_base64
        }
        
    else:
        # Fallback to image for unknown plot types
        fig, ax = arr.plot_pattern(cut_angle=cut_angle)
        img_base64 = generate_plot_image(fig)
        return {
            **base_response,
            'plot': img_base64
        }

# Initialize Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[config.RATE_LIMIT_DEFAULT],
)

@app.errorhandler(RateLimitExceeded)
def ratelimit_handler(e):
    app.logger.warning(f"Rate limit exceeded: {e.description}")
    return jsonify({
        "error": "rate_limit_exceeded",
        "message": "You have exceeded the allowed number of requests. Please try again later."
    }), 429

@app.route('/api/linear-array/analyze', methods=['POST'])
@limiter.limit(config.RATE_LIMIT_LINEAR)
def analyze_linear_array():
    app.logger.info("/api/linear-array/analyze called")
    # Input validation
    data = request.get_json()
    if not data:
        app.logger.warning("No JSON data received in linear array analysis request")
        return create_error_response('Invalid JSON data')
    
    # Validate required fields
    num_elem = data.get('num_elem')
    element_spacing = data.get('element_spacing')
    
    if num_elem is None or element_spacing is None:
        app.logger.warning("Missing required fields in linear array request")
        return create_error_response('num_elem and element_spacing are required')
        
    # Validate and convert types first
    try:
        num_elem = int(num_elem)
        element_spacing = float(element_spacing)
    except (ValueError, TypeError):
        app.logger.error("Invalid type for num_elem or element_spacing")
        return create_error_response('num_elem must be integer, element_spacing must be number')

    # Security checks
    if num_elem <= 0 or num_elem > config.MAX_ELEMENTS:
        app.logger.warning(f"num_elem out of allowed range: {num_elem}")
        return create_error_response(f'num_elem must be between 1 and {config.MAX_ELEMENTS}')
    
    if element_spacing <= 0 or element_spacing > config.MAX_SPACING:
        app.logger.warning(f"element_spacing out of allowed range: {element_spacing}")
        return create_error_response(f'element_spacing must be between 0 and {config.MAX_SPACING}')
    
    # Get other parameters with defaults
    scan_angle = data.get('scan_angle', 0)
    element_pattern = data.get('element_pattern', True)
    annotate = data.get('annotate', False)
    plot_type = data.get('plot_type', 'cartesian')
    window = data.get('window', None)
    SLL = data.get('SLL', None)
    show_manifold = data.get('show_manifold', False)
    element_gain = data.get('element_gain', 0)
    # Create LinearArray instance
    arr = LinearArray(
        
        num_elem=num_elem,
        element_spacing=element_spacing,
        scan_angle=scan_angle,
        element_pattern=element_pattern,
        window=window,
        SLL=SLL,
        element_gain=element_gain,
    )
    AF = arr.calc_AF
    pattern_params = arr.calc_peak_sll_hpbw()

    # Calculate pattern data (same for both cartesian and polar plots)
    theta = arr.theta.tolist()
    pattern = db20(arr.AF)
    pattern[pattern<-100] = -100    
    pattern = pattern.tolist()
    manifold = arr.X.tolist() if show_manifold else None
    

    
    # Calculate y-axis limits
    ymax = 5 * (int(max(pattern) / 5) + 1)
    ymin = ymax - 40

    response = {
        'theta': theta,
        'pattern': pattern,
        'manifold': manifold,
        'gain': pattern_params.Gain,
        'peak_angle': pattern_params.Peak_Angle,
        'sll': pattern_params.SLL,
        'hpbw': pattern_params.HPBW,
        'ymin': ymin,
        'ymax': ymax
    }
    app.logger.info(f"Linear array analysis successful for num_elem={num_elem}, element_spacing={element_spacing}")
    return jsonify(response)

@app.route('/api/planar-array/analyze', methods=['POST'])
@limiter.limit(config.RATE_LIMIT_PLANAR)
def analyze_planar_array():
    app.logger.info("/api/planar-array/analyze called")
    # Input validation
    data = request.get_json()
    if not data:
        app.logger.warning("No JSON data received in planar array analysis request")
        return jsonify({'error': 'Invalid JSON data'}), 400
    
    # Extract and validate array parameters
    array_type = data.get('array_type', 'rect')
    if array_type not in ['rect', 'tri', 'circ']:
        app.logger.warning(f"Invalid array_type: {array_type}")
        return jsonify({'error': 'array_type must be rect, tri, or circ'}), 400
    
    # Validate scan_angle
    scan_angle = data.get('scan_angle', [0, 0])
    if not isinstance(scan_angle, list) or len(scan_angle) != 2:
        app.logger.warning("Invalid scan_angle format")
        return jsonify({'error': 'scan_angle must be a list of two numbers'}), 400
    
    try:
        scan_angle = [float(scan_angle[0]), float(scan_angle[1])]
    except (ValueError, TypeError):
        app.logger.error("Invalid scan_angle values")
        return jsonify({'error': 'scan_angle values must be numbers'}), 400

    # Get other parameters with defaults
    element_pattern = data.get('element_pattern', True)
    window = data.get('window', None)
    SLL = data.get('SLL', None)
    plot_type = data.get('plot_type', 'pattern_cut')
    cut_angle = data.get('cut_angle', scan_angle[1])
    
    # Build array_shape based on array type
    if array_type in ['rect','tri']:
        num_elem = data.get('num_elem', [8, 8])
        element_spacing = data.get('element_spacing', [0.5, 0.5])
        
        # Use the validation function
        is_valid, result = validate_array_parameters(array_type, num_elem, element_spacing)
        if not is_valid:
            app.logger.warning(f"Validation failed for {array_type} array: {result}")
            return create_error_response(result)
        
        num_elem, element_spacing = result
        array_shape = [array_type, num_elem, element_spacing]
        
    elif array_type == 'circ':
        num_elem = data.get('num_elem', [8, 16, 24])
        radius = data.get('radius', [0.5, 1.0, 1.5])
        
        # Use the validation function
        is_valid, result = validate_array_parameters(array_type, num_elem, None, radius)
        if not is_valid:
            app.logger.warning(f"Validation failed for circular array: {result}")
            return create_error_response(result)
        
        num_elem, radius = result
        array_shape = ['circ', num_elem, radius]
        
    elif array_type == 'other':
        # For custom arrays, we'd need X, Y coordinates
        # This is a placeholder - would need more complex handling
        raise ValueError("Custom array type not yet implemented")
    else:
        raise ValueError(f"Invalid array type: {array_type}")

    total_num_elem = num_elem[0] * num_elem[1] if array_type in ['rect','tri'] else sum(num_elem)    
        # Security checks
    if total_num_elem <= 0 or total_num_elem > config.MAX_ELEMENTS:
        app.logger.warning(f"Total elements {total_num_elem} exceeds limit {config.MAX_ELEMENTS}")
        return create_error_response(
            f'Total number of elements ({total_num_elem}) exceeds the maximum limit of {config.MAX_ELEMENTS}. '
            f'Please reduce the number of elements in your array configuration.'
        )
    if array_type in ['rect','tri']:
        if any(s <= 0 or s > config.MAX_SPACING for s in element_spacing):
            app.logger.warning(f"Element spacing {element_spacing} exceeds limit {config.MAX_SPACING}")
            return create_error_response(
                f'Element spacing values must be between 0.1 and {config.MAX_SPACING} wavelengths. '
                f'Current values: {element_spacing}'
            )
    # if array_type in ['circ']:
    #     if any(s <= 0 or s > config.MAX_SPACING for s in radius):
    #         return jsonify({'error': f'element_spacing values must be between 0 and {config.MAX_SPACING}'}), 400

    # Create array parameters for caching
    array_params = {
        'array_shape': array_shape,
        'scan_angle': scan_angle,
        'element_pattern': element_pattern,
        'window': window,
        'SLL': SLL
    }
    
    # Generate cache key
    array_key = get_array_key(array_type, array_params)
    
    # Check if array already exists in cache
    if array_key in array_cache:
        # Use cached array
        arr = array_cache[array_key]
        print(f"Using cached array for key: {array_key}")
    else:
        # Create new PlanarArray instance
        arr = PlanarArray(
            array_shape=array_shape,
            scan_angle=scan_angle,
            element_pattern=element_pattern,
            window=window,
            SLL=SLL
        )
        # Calculate array factor (expensive computation)
        AF = arr.calc_AF
          # Calculate pattern parameters
        pattern_params = arr.calc_peak_sll_hpbw(cut_angle)
        pattern_params_3d = arr.calc_peak_sll_hpbw(scan_angle[1])
        # Cache the array instance for future use
        cache_array(array_key, arr)
        print(f"Created and cached new array for key: {array_key}")
    
    # Get manifold data
    manifold_x = (arr.X - np.mean(arr.X)).tolist()
    manifold_y = (arr.Y - np.mean(arr.Y)).tolist()
    
    pattern_params = arr.calc_peak_sll_hpbw(cut_angle)
    pattern_params_3d = arr.calc_peak_sll_hpbw(scan_angle[1])

    
   
    
    # Generate response based on plot type
    response = create_plot_response(plot_type, arr, manifold_x, manifold_y, pattern_params,pattern_params_3d, cut_angle)
    app.logger.info(f"Planar array analysis successful for array_type={array_type}, scan_angle={scan_angle}")
    return jsonify(response)

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.plot.ly; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://forms.gle;"
    return response

if __name__ == '__main__':
    app.run(port=config.PORT, host=config.HOST)







