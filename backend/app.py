from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import io
import base64
import matplotlib.pyplot as plt
from linear_array import LinearArray, db20
from planar_array import PlanarArray
import numpy as np




app = Flask(__name__)
CORS(app)  # or simply CORS(app)

@app.route('/api/linear-array/analyze', methods=['POST'])
def analyze_linear_array():
    data = request.get_json()
    num_elem = data.get('num_elem')
    element_spacing = data.get('element_spacing')
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

    

    if plot_type == 'cartesian':
        theta = arr.theta.tolist()
        pattern = db20(arr.AF)
        pattern[pattern<-100] = -100    
        pattern = pattern.tolist()
        manifold = arr.X.tolist() if show_manifold else None
        annotations = []
        if annotate:
            # Add annotation info for peak, HPBW, SLL
            peak, t_peak, sll, hpbw = pattern_params
            annotations.append({
                'x': t_peak,
                'y': peak,
                'text': f'Peak: {peak:.1f} dB @ {t_peak:.1f}°',
                'showarrow': True,
                'arrowhead': 2,
                'ax': 0,
                'ay': -40,
                'font': {'color': 'green'}
            })
            # HPBW annotation (draw a line)
            hpbw_left = t_peak - hpbw/2
            hpbw_right = t_peak + hpbw/2
            annotations.append({
                'x': (hpbw_left + hpbw_right)/2,
                'y': peak-3,
                'text': f'HPBW: {hpbw:.1f}°',
                'showarrow': False,
                'font': {'color': 'black'}
            })
            # SLL annotation (draw a line at SLL level)
            annotations.append({
                'x': t_peak-2*hpbw,
                'y': peak-sll/2,
                'text': f'SLL: {sll:.1f} dB',
                'showarrow': False,
                'font': {'color': 'red'}
            })
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
            'annotations': annotations,
            'ymin': ymin,
            'ymax': ymax
        }
        return jsonify(response)
    else:
        # Polar plot: return both image and data for native Plotly support
        fig, ax = arr.polar_pattern()
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        
        # Also return the data for native Plotly polar plots
        theta = arr.theta.tolist()
        pattern = db20(arr.AF)
        pattern[pattern<-100] = -100    
        pattern = pattern.tolist()
        manifold = arr.X.tolist() if show_manifold else None
        
        # Calculate y-axis limits
        ymax = 5 * (int(max(pattern) / 5) + 1)
        ymin = ymax - 40
        
        response = {
            'plot': img_base64,  # Keep for backward compatibility
            'theta': theta,      # Add for native Plotly polar plots
            'pattern': pattern,  # Add for native Plotly polar plots
            'manifold': manifold, # Add for native Plotly polar plots
            'gain': pattern_params.Gain,
            'peak_angle': pattern_params.Peak_Angle,
            'sll': pattern_params.SLL,
            'hpbw': pattern_params.HPBW,
            'ymin': ymin,
            'ymax': ymax
        }
        return jsonify(response)

@app.route('/api/planar-array/analyze', methods=['POST'])
def analyze_planar_array():
    data = request.get_json()
    
    # Extract array parameters
    array_type = data.get('array_type', 'rect')
    scan_angle = data.get('scan_angle', [0, 0])
    element_pattern = data.get('element_pattern', True)
    window = data.get('window', None)
    SLL = data.get('SLL', None)
    plot_type = data.get('plot_type', 'pattern_cut')
    cut_angle = data.get('cut_angle', scan_angle[1])
    
    # Build array_shape based on array type
    if array_type == 'rect':
        num_elem = data.get('num_elem', [8, 8])
        element_spacing = data.get('element_spacing', [0.5, 0.5])
        array_shape = ['rect', num_elem, element_spacing]
    elif array_type == 'tri':
        num_elem = data.get('num_elem', [8, 8])
        element_spacing = data.get('element_spacing', [0.5, 0.5])
        array_shape = ['tri', num_elem, element_spacing]
    elif array_type == 'circ':
        num_elem = data.get('num_elem', [8, 16, 24])
        radius = data.get('radius', [0.5, 1.0, 1.5])
        array_shape = ['circ', num_elem, radius]
    elif array_type == 'other':
        # For custom arrays, we'd need X, Y coordinates
        # This is a placeholder - would need more complex handling
        raise ValueError("Custom array type not yet implemented")
    else:
        raise ValueError(f"Invalid array type: {array_type}")
    
    # Create PlanarArray instance
    arr = PlanarArray(
        array_shape=array_shape,
        scan_angle=scan_angle,
        element_pattern=element_pattern,
        window=window,
        SLL=SLL
    )
    
    # Calculate array factor
    AF = arr.calc_AF
    
    # Calculate pattern parameters
    pattern_params = arr.calc_peak_sll_hpbw()
    
    # Generate response based on plot type
    if plot_type == 'pattern_cut':
        # 2D pattern cut
        theta_deg, G = arr.pattern_cut(cut_angle)
        G[G<-100] = -100
        theta = theta_deg.tolist()
        pattern = G.tolist()
        
        # Get manifold data
        manifold_x = (arr.X - np.mean(arr.X)).tolist()
        manifold_y = (arr.Y - np.mean(arr.Y)).tolist()
        
        # Add y-axis limits
        ymax = 5 * (int(max(pattern) / 5) + 1)
        ymin = ymax - 40
        
        response = {
            'theta': theta,
            'pattern': pattern,
            'manifold_x': manifold_x,
            'manifold_y': manifold_y,
            'gain': pattern_params.Gain,
            'peak_angle': pattern_params.Peak_Angle,
            'sll': pattern_params.SLL,
            'hpbw': pattern_params.HPBW,
            'cut_angle': cut_angle,
            'ymin': ymin,
            'ymax': ymax
        }
        return jsonify(response)
        
    elif plot_type == 'manifold':
        # Array manifold plot
        manifold_x = (arr.X - np.mean(arr.X)).tolist()
        manifold_y = (arr.Y - np.mean(arr.Y)).tolist()
        
        response = {
            'manifold_x': manifold_x,
            'manifold_y': manifold_y,
            'array_type': array_type
        }
        return jsonify(response)
        
    else:
        # For 3D polar, return Plotly data; for others, return image
        if plot_type == 'polar3d':
            data = arr.get_3d_polar_data()
            response = {
                'plot_type': '3d_polar',
                'data': data,
                'gain': pattern_params.Gain,
                'peak_angle': pattern_params.Peak_Angle,
                'sll': pattern_params.SLL,
                'hpbw': pattern_params.HPBW
            }
        elif plot_type == 'contour':
            fig, ax = arr.pattern_contour()
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close(fig)
            response = {
                'plot': img_base64,
                'gain': pattern_params.Gain,
                'peak_angle': pattern_params.Peak_Angle,
                'sll': pattern_params.SLL,
                'hpbw': pattern_params.HPBW
            }
        elif plot_type == 'polarsurf':
            fig, ax = arr.polarsurf()
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close(fig)
            response = {
                'plot': img_base64,
                'gain': pattern_params.Gain,
                'peak_angle': pattern_params.Peak_Angle,
                'sll': pattern_params.SLL,
                'hpbw': pattern_params.HPBW
            }
        else:
            # Fallback to image for unknown plot types
            fig, ax = arr.plot_pattern(cut_angle=cut_angle)
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close(fig)
            response = {
                'plot': img_base64,
                'gain': pattern_params.Gain,
                'peak_angle': pattern_params.Peak_Angle,
                'sll': pattern_params.SLL,
                'hpbw': pattern_params.HPBW
            }
        return jsonify(response)

if __name__ == '__main__':

    app.run(debug=True, port=5000)







