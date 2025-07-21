import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';

/**
 * Main Antenna Array Analysis Tool Component
 * 
 * This component provides a comprehensive interface for analyzing linear and planar antenna arrays.
 * Features include:
 * - Linear array analysis with cartesian/polar plotting
 * - Planar array analysis with pattern cuts and manifold visualization
 * - Trace management (keep/clear/compare multiple plots)
 * - Interactive legend with show/hide controls
 * - Real-time parameter updates
 * - Pattern parameter calculations and display
 */
function App() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('linear');
  
  // Linear array analysis parameters
  const [numElem, setNumElem] = useState(8);                    // Number of array elements
  const [numElemError, setNumElemError] = useState('');         // Error message for numElem
  const [elementSpacing, setElementSpacing] = useState(0.5);    // Element spacing in wavelengths
  const [scanAngle, setScanAngle] = useState(0);                // Beam scan angle in degrees
  const [elementPattern, setElementPattern] = useState(true);   // Apply element pattern (cosine envelope)
  const [elementGain, setElementGain] = useState(5);            // Element gain in dB
  const [annotate, setAnnotate] = useState(false);              // Show pattern annotations (peak, SLL, HPBW)
  const [plotType, setPlotType] = useState('cartesian');        // Plot type: 'cartesian' or 'polar'
  const [window, setWindow] = useState('');                     // Window function type (hann, hamming, etc.)
  const [SLL, setSLL] = useState(20);                           // Side lobe level for SLL-based tapering
  const [windowType, setWindowType] = useState('window');       // Tapering method: 'window' or 'SLL'
  // const [showManifold, setShowManifold] = useState(false);      // Show array manifold plot
  
  // Planar array analysis parameters
  const [planarArrayType, setPlanarArrayType] = useState('rect');           // Array type: 'rect', 'tri', 'circ'
  const [planarNumElem, setPlanarNumElem] = useState([8, 8]);               // Number of elements [rows, cols] for rect/tri
  const [planarNumElemRaw, setPlanarNumElemRaw] = useState('8, 8');         // Raw string input for circular arrays
  const [planarElementSpacing, setPlanarElementSpacing] = useState(["0.5", "0.5"]); // Element spacing [x, y] in wavelengths
  // const [planarRadius, setPlanarRadius] = useState([0.5, 1.25]);        // Ring radii for circular arrays
  const [planarRadiusRaw, setPlanarRadiusRaw] = useState('0.5, 1.25');  // Raw string input for radii
  const [planarScanAngle, setPlanarScanAngle] = useState([0, 0]);           // Scan angles [theta, phi] in degrees
  const [planarElementPattern, setPlanarElementPattern] = useState(true);   // Apply element pattern
  const [planarWindow, setPlanarWindow] = useState('');                     // Window function type
  const [planarSLL, setPlanarSLL] = useState(20);                           // Side lobe level
  const [planarWindowType, setPlanarWindowType] = useState('window');       // Tapering method
  const [planarPlotType, setPlanarPlotType] = useState('pattern_cut');      // Plot type: 'pattern_cut', 'manifold'
  const [planarCutAngle, setPlanarCutAngle] = useState(0);                  // Pattern cut angle in degrees
  
  // Shared application state
  const [loading, setLoading] = useState(false);                            // Loading state for API calls
  const [result, setResult] = useState(null);                               // Analysis results from backend
  const [error, setError] = useState('');                                   // Error messages
  const [xMin, setXMin] = useState('');                                     // X-axis minimum value
  const [xMax, setXMax] = useState('');                                     // X-axis maximum value
  const [yMin, setYMin] = useState('');                                     // Y-axis minimum value
  const [yMax, setYMax] = useState('');                                     // Y-axis maximum value
  const [xStep, setXStep] = useState('30');                                 // X-axis tick step
  const [yStep, setYStep] = useState('10');                                 // Y-axis tick step

  // Trace management for linear array comparison
  const [traces, setTraces] = useState([]);                                 // Array of kept plot traces
  const [highlightedTrace, setHighlightedTrace] = useState(null);          // Index of highlighted trace on hover
  const [showCurrent, setShowCurrent] = useState(true);                     // Show/hide current plot
  const [autoYMax, setAutoYMax] = useState('');                             // Track auto-set yMax to avoid overriding user changes

  // Trace management for planar array comparison
  const [planarTraces, setPlanarTraces] = useState([]);                     // Array of kept planar plot traces
  const [planarHighlightedTrace, setPlanarHighlightedTrace] = useState(null); // Index of highlighted planar trace on hover
  const [planarShowCurrent, setPlanarShowCurrent] = useState(true);         // Show/hide current planar plot
  const [planarAutoYMax, setPlanarAutoYMax] = useState('');                 // Track auto-set yMax for planar plots
  
  // Array caching for optimized pattern cuts
  const prevCutAngleRef = useRef(null);                                     // Track previous cut angle for optimization

  // Constants and configuration
  const windowOptions = ['hamming', 'blackman', 'blackmanharris'];          // Available window functions
  const colorPalette = [                                                    // Color palette for trace visualization
    '#0074D9', '#FF4136', '#2ECC40', '#FF851B', '#B10DC9', '#FFDC00', '#001f3f', '#39CCCC', '#01FF70', '#85144b',
    '#F012BE', '#3D9970', '#111111', '#AAAAAA'
  ];

  // Add state for planar pattern cut annotation
  const [planarAnnotate, setPlanarAnnotate] = useState(false);

  // Add realtime state
  const [realtime, setRealtime] = useState(true);

  const realtimeRef = useRef(realtime);
  useEffect(() => {
    realtimeRef.current = realtime;
  }, [realtime]);
  // Helper for input change with realtime analysis
  const handleLinearInputChange = (handler) => {
    handler();
    if (realtimeRef.current) {
      analyzeLinearArray();
    }
  };
  const handlePlanarInputChange = (handler) => {
    handler();
    if (realtimeRef.current) {
      analyzePlanarArray();
    }
  };

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================
  
  /**
   * Analyzes linear array parameters and returns pattern data
   */
  const analyzeLinearArray = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    
    // Input validation
    let spacing = elementSpacing;
    if (spacing === '' || isNaN(parseFloat(spacing))) {
      setError('Element spacing must be a valid number.');
      setLoading(false);
      return;
    }
    spacing = parseFloat(spacing);
    
    if (scanAngle === '' || isNaN(parseFloat(scanAngle))) {
      setError('Scan angle must be a valid number.');
      setLoading(false);
      return;
    }
    const validatedScanAngle = parseFloat(scanAngle);
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/api/linear-array/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_elem: Number(numElem),
          element_spacing: spacing,
          scan_angle: validatedScanAngle,
          element_pattern: Boolean(elementPattern),
          element_gain: Number(elementGain),
          annotate: Boolean(annotate), // Keep for backward compatibility, but backend ignores this now
          plot_type: plotType,
          window: windowType === 'window' ? (window || null) : null,
          SLL: windowType === 'SLL' ? Number(SLL) : null,
          show_manifold: true // Always request manifold data
        })
      });
      
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to analyze linear array. Please check your input and try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Analyzes planar array parameters and returns pattern data
   * Supports rectangular, triangular, and circular array configurations
   */
  const analyzePlanarArray = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    
    // Validate array parameters based on array type
    let validatedNumElem;
    if (planarArrayType === 'circ') {
      // For circular arrays, validate number of elements as positive integers
      // Parse the raw input string (e.g., "8, 16, 24")
      const parts = planarNumElemRaw.split(',').map(s => s.trim()).filter(s => s !== '');
      const numElements = parts.map(s => parseInt(s));
      if (numElements.some(val => isNaN(val) || val <= 0 || !Number.isInteger(val))) {
        setError('Number of elements per ring must be positive integers.');
        setLoading(false);
        return;
      }
      validatedNumElem = numElements;
    } else {
      // For rectangular/triangular, validate as positive integers
      const numElements = planarNumElem.map(s => parseInt(s));
      if (numElements.length !== 2 || numElements.some(val => isNaN(val) || val <= 0 || !Number.isInteger(val))) {
        setError('Number of elements must be two positive integers.');
        setLoading(false);
        return;
      }
      validatedNumElem = numElements;
    }
    
    let validatedRadius;
    if (planarArrayType === 'circ') {
      // For circular arrays, validate radius as positive floats
      const parts = planarRadiusRaw.split(',').map(s => s.trim()).filter(s => s !== '');
      const radii = parts.map(s => parseFloat(s));
      if (radii.some(val => isNaN(val) || val <= 0)) {
        setError('Ring radii must be positive numbers.');
        setLoading(false);
        return;
      }
      validatedRadius = radii;
    } else {
      validatedRadius = [];
    }
    
    let validatedElementSpacing;
    if (planarArrayType === 'circ') {
      validatedElementSpacing = [];
    } else {
      // For rectangular/triangular, validate as positive floats
      const spacing = planarElementSpacing.map(s => parseFloat(s));
      if (spacing.length !== 2 || spacing.some(val => isNaN(val) || val <= 0)) {
        setError('Element spacing must be two positive numbers.');
        setLoading(false);
        return;
      }
      validatedElementSpacing = spacing;
    }
    
    // Parse scan angle as floats
    const scanAngles = planarScanAngle.map(s => parseFloat(s));
    if (scanAngles.length !== 2 || scanAngles.some(val => isNaN(val))) {
      setError('Scan angle must be a valid number for both theta and phi.');
      setLoading(false);
      return;
    }
    const validatedScanAngle = scanAngles;
    
    console.log('Planar array parameters:', {
      array_type: planarArrayType,
      num_elem: validatedNumElem,
      element_spacing: validatedElementSpacing,
      radius: validatedRadius,
      scan_angle: validatedScanAngle
    });
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || '';

      const response = await fetch(`${API_URL}/api/planar-array/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          array_type: planarArrayType,
          num_elem: validatedNumElem,
          element_spacing: validatedElementSpacing,
          radius: validatedRadius,
          scan_angle: validatedScanAngle,
          element_pattern: Boolean(planarElementPattern),
          window: planarWindowType === 'window' ? (planarWindow || null) : null,
          SLL: planarWindowType === 'SLL' ? Number(planarSLL) : null,
          plot_type: planarPlotType,
          cut_angle: Number(planarCutAngle)
        })
      });
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Planar array analysis error:', err);
      setError('Failed to analyze planar array. Please check your input and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Handles form submission for both linear and planar array analysis
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === 'linear') {
      await analyzeLinearArray();
    } else {
      await analyzePlanarArray();
    }
  };

  /**
   * Toggles pattern annotations (peak, SLL, HPBW markers)
   * No longer makes API calls - just toggles the display of existing annotation data
   */
  const toggleAnnotate = () => {
    if (result && activeTab === 'linear') {
      setAnnotate(!annotate);
    }
  };

  /**
   * Toggles between cartesian and polar plot types
   * No longer makes API calls - just changes the plot display type
   */
  const togglePlotType = () => {
    if (result && activeTab === 'linear') {
      const newPlotType = plotType === 'cartesian' ? 'polar' : 'cartesian';
      setPlotType(newPlotType);
    }
  };

  // Add toggle function for planar annotation
  const togglePlanarAnnotate = () => {
    if (result && activeTab === 'planar' && planarPlotType === 'pattern_cut') {
      setPlanarAnnotate(a => !a);
    }
  };

  // ============================================================================
  // EFFECTS AND UTILITIES
  // ============================================================================
  
  /**
   * Auto-set axis limits when new analysis results are received
   * Only sets yMax automatically if no traces are kept (to avoid conflicts)
   */
  useEffect(() => {
    if (result && result.theta && result.pattern) {
      setXMin(result.theta[0]);
      setXMax(result.theta[result.theta.length - 1]);
      setYMin(result.ymin);
      // Only set yMax automatically if there are no kept traces
      // Otherwise, let the trace-based yMax logic handle it
      if (traces.length === 0) {
      setYMax(result.ymax);
      }
      setXStep('30');
      setYStep('10');
    }
  }, [result, traces.length]);

  // Add a new useEffect for planar array pattern cut
  useEffect(() => {
    if (
      activeTab === 'planar' &&
      planarPlotType === 'pattern_cut' &&
      result &&
      result.theta &&
      result.pattern &&
      result.ymin !== undefined &&
      result.ymax !== undefined
    ) {
      setYMin(result.ymin);
      setYMax(result.ymax);
    }
  }, [activeTab, planarPlotType, result]);

  // Add useEffect to auto-analyze when number of elements changes for linear array
  useEffect(() => {
    // Only trigger if all required fields are valid numbers and not empty
    
    if (
      realtime &&
      activeTab === 'linear' &&
      numElem !== '' && !isNaN(Number(numElem)) && Number(numElem) > 0 && Number(numElem) <= 2000 &&
      elementSpacing !== '' && !isNaN(Number(elementSpacing)) && Number(elementSpacing) > 0 &&
      scanAngle !== '' && !isNaN(Number(scanAngle))
    ) {
      analyzeLinearArray();
    }
    // Optionally, you could clear the result or show a message if invalid
  }, [numElem, elementSpacing, scanAngle, window, SLL, windowType, elementPattern,activeTab,realtime]);

  // Add useEffect to auto-analyze when element gain changes for linear array
  useEffect(() => {
    if (
      realtime &&
      activeTab === 'linear' &&
      numElem !== '' && !isNaN(Number(numElem)) && Number(numElem) > 0 &&
      elementSpacing !== '' && !isNaN(Number(elementSpacing)) && Number(elementSpacing) > 0 &&
      scanAngle !== '' && !isNaN(Number(scanAngle)) &&
      elementGain !== '' && !isNaN(Number(elementGain))
    ) {
      analyzeLinearArray();
    }
  }, [elementGain,realtime]);

  // Auto-analyze planar array when relevant fields change (interactive update)
  useEffect(() => {
    if (realtime) {
    if (activeTab !== 'planar') return;
    // Trigger for all plot types including 3D plots
    if (!['pattern_cut', 'manifold', 'polar3d', 'contour', 'polarsurf'].includes(planarPlotType)) return;

    // Clear array key when array parameters change (to avoid using stale cached data)
    // This ensures we do a full analysis when any array parameter changes
    prevCutAngleRef.current = null;

    // Validation for rectangular/triangular arrays
    if (planarArrayType === 'rect' || planarArrayType === 'tri') {
      const numRows = planarNumElem[0], numCols = planarNumElem[1];
      const spacingRows = planarElementSpacing[0], spacingCols = planarElementSpacing[1];
      if (
        numRows === '' || isNaN(Number(numRows)) || Number(numRows) <= 0 ||
        numCols === '' || isNaN(Number(numCols)) || Number(numCols) <= 0 ||
        spacingRows === '' || isNaN(Number(spacingRows)) || Number(spacingRows) <= 0 ||
        spacingCols === '' || isNaN(Number(spacingCols)) || Number(spacingCols) <= 0 ||
        planarScanAngle[0] === '' || isNaN(Number(planarScanAngle[0])) ||
        planarScanAngle[1] === '' || isNaN(Number(planarScanAngle[1]))
      ) {
        return;
      }
      analyzePlanarArray();
    }
    
    // Validation for circular arrays
    else if (planarArrayType === 'circ') {
      // Validate number of elements per ring
      const numElemParts = planarNumElemRaw.split(',').map(s => s.trim()).filter(s => s !== '');
      if (numElemParts.length === 0 || numElemParts.some(val => isNaN(Number(val)) || Number(val) <= 0 || !Number.isInteger(Number(val)))) return;
      // Validate radii
      const radiiParts = planarRadiusRaw.split(',').map(s => s.trim()).filter(s => s !== '');
      if (radiiParts.length === 0 || radiiParts.some(val => isNaN(Number(val)) || Number(val) <= 0)) return;
      // Validate scan angles
      if (planarScanAngle[0] === '' || isNaN(Number(planarScanAngle[0])) || planarScanAngle[1] === '' || isNaN(Number(planarScanAngle[1]))) return;
      analyzePlanarArray();
    }
  }
  }, [activeTab, planarArrayType, planarNumElem, planarNumElemRaw, planarElementSpacing, planarRadiusRaw, planarScanAngle, planarElementPattern, planarWindow, planarSLL, planarWindowType,planarPlotType, planarCutAngle,realtime]);

  // Track the last auto-set yMax to avoid overriding user changes
  useEffect(() => {
    // Gather all visible traces' ymax
    const traceYMaxes = traces
      .filter(trace => trace.visible && trace.patternParams && trace.patternParams.ymax !== undefined)
      .map(trace => trace.patternParams.ymax);
    // Include current result if visible
    let currentYMax = null;
    if (showCurrent && result && result.ymax !== undefined) {
      currentYMax = result.ymax;
    }
    const allYMaxes = [...traceYMaxes, currentYMax].filter(v => v !== null && v !== undefined);
    if (allYMaxes.length === 0) return;
    const largestYMax = Math.max(...allYMaxes.map(Number));
    // Only update yMax if it is empty, matches the previous auto-set value, or if there are kept traces
    // This ensures that when we have kept traces, we always maintain the largest yMax
    if (yMax === '' || yMax === autoYMax || traces.length > 0) {
      setYMax(String(largestYMax));
      setAutoYMax(String(largestYMax));
    }
  }, [traces, result, showCurrent, yMax, autoYMax]);

  // Track the last auto-set yMax for planar arrays to avoid overriding user changes
  useEffect(() => {
    if (activeTab !== 'planar') return;
    
    // Gather all visible planar traces' ymax
    const traceYMaxes = planarTraces
      .filter(trace => trace.visible && trace.patternParams && trace.patternParams.ymax !== undefined)
      .map(trace => trace.patternParams.ymax);
    // Include current result if visible
    let currentYMax = null;
    if (planarShowCurrent && result && result.ymax !== undefined) {
      currentYMax = result.ymax;
    }
    const allYMaxes = [...traceYMaxes, currentYMax].filter(v => v !== null && v !== undefined);
    if (allYMaxes.length === 0) return;
    const largestYMax = Math.max(...allYMaxes.map(Number));
    // Only update yMax if it is empty, matches the previous auto-set value, or if there are kept traces
    if (yMax === '' || yMax === planarAutoYMax || planarTraces.length > 0) {
      setYMax(String(largestYMax));
      setPlanarAutoYMax(String(largestYMax));
    }
  }, [planarTraces, result, planarShowCurrent, yMax, planarAutoYMax, activeTab]);

  // ============================================================================
  // TRACE MANAGEMENT
  // ============================================================================
  
  /**
   * Saves the current plot as a trace for comparison
   * Creates a descriptive label and assigns a unique color
   */
  const handleKeepTrace = () => {
    if (!result || !result.theta || !result.pattern) return;
    
    // Compose a descriptive label with key parameters
    const label = `N=${numElem}, d=${elementSpacing}, θ₀=${scanAngle}, ${windowType === 'window' ? (window ? window : 'no window') : `SLL=${SLL}`}`;
    
    // Assign color from palette (cycles through colors)
    const color = colorPalette[traces.length % colorPalette.length];
    
    setTraces([
      ...traces,
      {
        x: result.theta,
        y: result.pattern,
        label,
        color,
        visible: true,
        params: {
          numElem,
          elementSpacing,
          scanAngle,
          windowType,
          window,
          SLL
        },
        patternParams: {
          gain: result.gain,
          peak_angle: result.peak_angle,
          sll: result.sll,
          hpbw: result.hpbw,
          ymax: result.ymax
        }
      }
    ]);
  };

  /**
   * Removes all kept traces from the comparison
   */
  const handleClearTraces = () => {
    setTraces([]);
  };

  /**
   * Removes a specific trace by its index
   * @param {number} idx - Index of the trace to remove
   */
  const handleRemoveTrace = (idx) => {
    setTraces(traces => traces.filter((_, i) => i !== idx));
  };

  // ============================================================================
  // PLANAR ARRAY TRACE MANAGEMENT
  // ============================================================================
  
  /**
   * Saves the current planar plot as a trace for comparison
   * Creates a descriptive label and assigns a unique color
   */
  const handleKeepPlanarTrace = () => {
    if (!result || !result.theta || !result.pattern) return;
    
    // Compose a descriptive label with key parameters
    let label;
    if (planarArrayType === 'circ') {
      const parts = planarNumElemRaw.split(',').map(s => s.trim()).filter(s => s !== '');
      const total = parts.map(s => parseInt(s)).filter(n => !isNaN(n) && n > 0).reduce((a, b) => a + b, 0);
      label = `CIRC, N=${total} (${planarNumElemRaw}), r=[${planarRadiusRaw}], θ₀=[${planarScanAngle.join(',')}], cut=${planarCutAngle}°`;
    } else {
      label = `${planarArrayType.toUpperCase()}, N=${planarNumElem.join('x')}, d=${planarElementSpacing.join('x')}, θ₀=[${planarScanAngle.join(',')}], cut=${planarCutAngle}°`;
    }
    
    // Assign color from palette (cycles through colors)
    const color = colorPalette[planarTraces.length % colorPalette.length];
    
    setPlanarTraces([
      ...planarTraces,
      {
        x: result.theta,
        y: result.pattern,
        label,
        color,
        visible: true,
        params: {
          arrayType: planarArrayType,
          numElem: planarArrayType === 'circ'
            ? planarNumElemRaw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0)
            : planarNumElem,
          elementSpacing: planarElementSpacing,
          radii: planarArrayType === 'circ' ? planarRadiusRaw : undefined,
          scanAngle: planarScanAngle,
          cutAngle: planarCutAngle,
          windowType: planarWindowType,
          window: planarWindow,
          SLL: planarSLL
        },
        patternParams: {
          gain: result.gain,
          peak_angle: result.peak_angle,
          sll: result.sll,
          hpbw: result.hpbw,
          ymax: result.ymax
        }
      }
    ]);
  };

  /**
   * Removes all kept planar traces from the comparison
   */
  const handleClearPlanarTraces = () => {
    setPlanarTraces([]);
  };

  /**
   * Removes a specific planar trace by its index
   * @param {number} idx - Index of the trace to remove
   */
  const handleRemovePlanarTrace = (idx) => {
    setPlanarTraces(traces => traces.filter((_, i) => i !== idx));
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  /**
   * Renders the linear array parameter input form
   * Includes all controls for array configuration and analysis options
   */
  const renderLinearArrayForm = () => (
    <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, position: 'sticky', top: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <label>Number of Elements:&nbsp;
          <input
            type="number"
            min="1"
            max="2000"
            value={numElem}
            onChange={e => handleLinearInputChange(() => setNumElem(e.target.value))}
            required
            style={{ width: 80 }}
          />
        </label>
        {numElemError && <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{numElemError}</div>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>Element Spacing (λ):&nbsp;
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={elementSpacing}
            onChange={e => handleLinearInputChange(() => setElementSpacing(e.target.value))}
            required
            style={{ width: 200 }}
          />
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>Scan Angle (degs.):&nbsp;
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            value={scanAngle}
            onChange={e => handleLinearInputChange(() => setScanAngle(e.target.value))}
            required
            style={{ width: 80 }}
          />
        </label>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Amplitude Tapering:</label>
        <div style={{ marginLeft: 20 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>
            <input 
              type="radio" 
              name="windowType" 
              value="window" 
              checked={windowType === 'window'} 
              onChange={e => handleLinearInputChange(() => setWindowType(e.target.value))} 
            />
            &nbsp;Pre-defined Window 
          </label>
          <label style={{ display: 'block', marginBottom: 4 }}>
            <input 
              type="radio" 
              name="windowType" 
              value="SLL" 
              checked={windowType === 'SLL'} 
              onChange={e => handleLinearInputChange(() => setWindowType(e.target.value))} 
            />
            &nbsp;Set SLL
          </label>
        </div>
      </div>
      {windowType === 'window' && (
        <div style={{ marginBottom: 16, marginLeft: 20 }}>
          <label>Window Function:&nbsp;
            <select value={window} onChange={e => handleLinearInputChange(() => setWindow(e.target.value))} style={{ width: 150 }}>
              <option value="">No Window</option>
              {windowOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {windowType === 'SLL' && (
        <div style={{ marginBottom: 16, marginLeft: 20 }}>
          <label>SLL (dB):&nbsp;
            <input 
              type="number" 
              min="13" 
              max="80" 
              value={SLL} 
              onChange={e => handleLinearInputChange(() => setSLL(e.target.value))} 
              style={{ width: 80 }} 
            />
          </label>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label>
          <input type="checkbox" checked={elementPattern} onChange={e => handleLinearInputChange(() => setElementPattern(e.target.checked))} />
          &nbsp;Element Pattern (cosine)
        </label>
        <div style={{ marginTop: 6, marginLeft: 24 }}>
          <label>
            Element Gain:&nbsp;
            <input
              type="number"
              step="1"
              value={elementGain}
              onChange={e => handleLinearInputChange(() => setElementGain(e.target.value))}
              disabled={!elementPattern}
              style={{ width: 80 }}
            />
        </label>
        </div>
      </div>
      <div style={{ margin: '16px 0 8px 0' }}>
        <label style={{ fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={realtime}
            onChange={e => setRealtime(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Realtime
        </label>
      </div>
      <button
        type="submit"
        disabled={realtime}
        style={{
          background: realtime ? '#ccc' : '#0074D9',
          color: realtime ? '#888' : 'white',
          cursor: realtime ? 'not-allowed' : 'pointer',
          border: 'none',
          borderRadius: 6,
          padding: '10px 22px',
          fontWeight: 600,
          fontSize: 16,
          marginTop: 8
        }}
      >
        Analyze
      </button>
    </form>
  );

  const renderPlanarArrayForm = () => (
    <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, position: 'sticky', top: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <label>Array Type:&nbsp;
          <select value={planarArrayType} onChange={e => handlePlanarInputChange(() => setPlanarArrayType(e.target.value))} style={{ width: 150 }}>
            <option value="rect">Rectangular</option>
            <option value="tri">Triangular</option>
            <option value="circ">Circular</option>
          </select>
        </label>
      </div>
      
      {(planarArrayType === 'rect' || planarArrayType === 'tri') && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label>Number of Elements:</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <label style={{ fontSize: 12 }}>
                Rows:&nbsp;
                <input 
                  type="number" 
                  min="1"
                  value={planarNumElem[0] || ''} 
                  onChange={e => handlePlanarInputChange(() => setPlanarNumElem([e.target.value, planarNumElem[1] || '']))} 
                  style={{ width: 60 }} 
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Columns:&nbsp;
                <input 
                  type="number" 
                  min="1"
                  value={planarNumElem[1] || ''} 
                  onChange={e => handlePlanarInputChange(() => setPlanarNumElem([planarNumElem[0] || '', e.target.value]))} 
                  style={{ width: 60 }} 
                />
              </label>
            </div>
            {/* Warning and error for too many elements */}
            {(() => {
              const rows = parseInt(planarNumElem[0]);
              const cols = parseInt(planarNumElem[1]);
              if (!isNaN(rows) && !isNaN(cols) && rows > 0 && cols > 0) {
                const total = rows * cols;
                if (total > 5000) {
                  return <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>Error: Total elements ({total}) exceeds the hard limit of 5000.</div>;
                } else if (total > 2000) {
                  return <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>Warning: Total elements ({total}) exceeds 2000. Computation may be slow.</div>;
                }
              }
              return null;
            })()}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Element Spacing:</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <label style={{ fontSize: 12 }}>
                Rows (λ):&nbsp;
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={planarElementSpacing[0]}
                  onChange={e => handlePlanarInputChange(() => setPlanarElementSpacing([e.target.value, planarElementSpacing[1]]))}
                  style={{ width: 60 }}
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Columns (λ):&nbsp;
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={planarElementSpacing[1]}
                  onChange={e => handlePlanarInputChange(() => setPlanarElementSpacing([planarElementSpacing[0], e.target.value]))}
                  style={{ width: 60 }}
                />
              </label>
            </div>
          </div>
        </>
      )}
      
      {planarArrayType === 'circ' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label>Number of Elements per ring:</label>
            <div style={{ marginTop: 4 }}>
              <input 
                type="text" 
                value={planarNumElemRaw} 
                onChange={e => handlePlanarInputChange(() => setPlanarNumElemRaw(e.target.value))} 
                placeholder="8, 16, 24"
                style={{ width: '100%' }} 
              />
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                Enter comma-separated positive integers (e.g., "8, 16, 24" for 3 rings)
              </div>
              {/* Warning and error for too many elements in circular array */}
              {(() => {
                const parts = planarNumElemRaw.split(',').map(s => s.trim()).filter(s => s !== '');
                const nums = parts.map(s => parseInt(s)).filter(n => !isNaN(n) && n > 0);
                const total = nums.reduce((a, b) => a + b, 0);
                if (total > 5000) {
                  return <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>Error: Total elements ({total}) exceeds the hard limit of 5000.</div>;
                } else if (total > 2000) {
                  return <div style={{ color: 'red', fontSize: 12, marginTop: 4 }}>Warning: Total elements ({total}) exceeds 2000. Computation may be slow.</div>;
                }
                return null;
              })()}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Ring Radii:</label>
            <div style={{ marginTop: 4 }}>
              <input 
                type="text" 
                value={planarRadiusRaw} 
                onChange={e => handlePlanarInputChange(() => setPlanarRadiusRaw(e.target.value))} 
                placeholder="0.5, 1.0, 1.5"
                style={{ width: '100%' }} 
              />
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                Enter comma-separated positive numbers in wavelengths (e.g., "0.5, 1.0, 1.5")
              </div>
            </div>
          </div>
        </>
      )}
      
      <div style={{ marginBottom: 16 }}>
        <label>Scan Angle:</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <label style={{ fontSize: 12 }}>
            Theta (deg):&nbsp;
            <input
              type="number"
              step="any"
              value={planarScanAngle[0]}
              onChange={e => handlePlanarInputChange(() => setPlanarScanAngle([e.target.value, planarScanAngle[1]]))}
              style={{ width: 60 }}
            />
          </label>
          <label style={{ fontSize: 12 }}>
            Phi (deg):&nbsp;
            <input
              type="number"
              step="any"
              value={planarScanAngle[1]}
              onChange={e => handlePlanarInputChange(() => setPlanarScanAngle([planarScanAngle[0], e.target.value]))}
              style={{ width: 60 }}
            />
          </label>
        </div>
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <label>Plot Type:&nbsp;
          <select value={planarPlotType} onChange={e => handlePlanarInputChange(() => setPlanarPlotType(e.target.value))} style={{ width: 150 }}>
            <option value="pattern_cut">Pattern Cut</option>
            <option value="manifold">Array Manifold</option>
            <option value="polar3d">3D Polar</option>
            {/* <option value="contour">Contour Plot</option> */}
            <option value="polarsurf">Polar Surface</option>
          </select>
        </label>
      </div>
      
      {planarPlotType === 'pattern_cut' && (
        <div style={{ marginBottom: 16 }}>
          <label>Cut Angle (phi):&nbsp;
            <input 
              type="number" 
              value={planarCutAngle} 
              onChange={e => handlePlanarInputChange(() => setPlanarCutAngle(e.target.value))} 
              style={{ width: 80 }} 
            />
          </label>
        </div>
      )}
      
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>Amplitude Tapering:</label>
        <div style={{ marginLeft: 20 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>
            <input 
              type="radio" 
              name="planarWindowType" 
              value="window" 
              checked={planarWindowType === 'window'} 
              onChange={e => handlePlanarInputChange(() => setPlanarWindowType(e.target.value))} 
              disabled={planarArrayType === 'tri' || planarArrayType === 'circ'}
            />
            &nbsp;Window Function
          </label>
          <label style={{ display: 'block', marginBottom: 4 }}>
            <input 
              type="radio" 
              name="planarWindowType" 
              value="SLL" 
              checked={planarWindowType === 'SLL'} 
              onChange={e => handlePlanarInputChange(() => setPlanarWindowType(e.target.value))} 
              disabled={planarArrayType === 'tri' || planarArrayType === 'circ'}
            />
            &nbsp;Set SLL
          </label>
        </div>
      </div>
      {planarWindowType === 'window' && (
        <div style={{ marginBottom: 16, marginLeft: 20 }}>
          <label>Pre-defined Window :&nbsp;
            <select value={planarWindow} onChange={e => handlePlanarInputChange(() => setPlanarWindow(e.target.value))} style={{ width: 150 }} disabled={planarArrayType === 'tri' || planarArrayType === 'circ'}>
              <option value="">No Window</option>
              {windowOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {planarWindowType === 'SLL' && (
        <div style={{ marginBottom: 16, marginLeft: 20 }}>
          <label>SLL (dB):&nbsp;
            <input 
              type="number" 
              min="13" 
              max="80" 
              value={planarSLL} 
              onChange={e => handlePlanarInputChange(() => setPlanarSLL(e.target.value))} 
              style={{ width: 80 }} 
              disabled={planarArrayType === 'tri' || planarArrayType === 'circ'}
            />
          </label>
        </div>
      )}
      
      <div style={{ marginBottom: 16 }}>
        <label>
          <input type="checkbox" checked={planarElementPattern} onChange={e => handlePlanarInputChange(() => setPlanarElementPattern(e.target.checked))} />
          &nbsp;Element Pattern (cosine)
        </label>
      </div>
      
      <div style={{ margin: '16px 0 8px 0' }}>
        <label style={{ fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={realtime}
            onChange={e => setRealtime(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Realtime
        </label>
      </div>
      <button
        type="submit"
        disabled={realtime}
        style={{
          background: realtime ? '#ccc' : '#0074D9',
          color: realtime ? '#888' : 'white',
          cursor: realtime ? 'not-allowed' : 'pointer',
          border: 'none',
          borderRadius: 6,
          padding: '10px 22px',
          fontWeight: 600,
          fontSize: 16,
          marginTop: 8
        }}
      >
        Analyze
      </button>
    </form>
  );

  /**
   * Renders the linear array analysis results
   * Includes pattern plot, legend, manifold plot, and pattern parameters table
   * Uses helper functions to handle cartesian vs polar plot rendering
   */
  const renderLinearArrayResults = () => {
    /**
     * Generates plot data for both cartesian and polar plots
     * Handles kept traces and current plot with appropriate plot types
     */
    const getPlotData = () => {
      const baseTraces = traces.map((trace, idx) =>
        trace.visible
          ? {
              ...(plotType === 'cartesian' 
                ? { x: trace.x, y: trace.y, type: 'scatter', mode: 'lines' }
                : { r: trace.y, theta: trace.x, type: 'scatterpolar', mode: 'lines' }
              ),
              name: trace.label,
              line: {
                color: trace.color,
                width: highlightedTrace === idx ? 4 : 2,
              },
              opacity: highlightedTrace === null ? 0.8 : (highlightedTrace === idx ? 1 : 0.3),
            }
          : null
      ).filter(Boolean);

      const currentTrace = showCurrent && result && result.theta && result.pattern && result.theta.length > 0 && result.pattern.length > 0
        ? [{
            ...(plotType === 'cartesian'
              ? { x: result.theta, y: result.pattern, type: 'scatter', mode: 'lines' }
              : { r: result.pattern, theta: result.theta, type: 'scatterpolar', mode: 'lines' }
            ),
            name: 'Current',
            line: { color: '#0074D9', width: 3 },
            opacity: 1,
          }]
        : [];

      // Add annotation lines when annotations are enabled
      const annotationTraces = [];
      if (annotate && result && result.peak_angle !== undefined && result.sll !== undefined && result.hpbw !== undefined) {
        const peakAngle = result.peak_angle;
        const peakValue = result.gain;
        const sllValue = peakValue - result.sll;
        const hpbwLeft = peakAngle - result.hpbw / 2;
        const hpbwRight = peakAngle + result.hpbw / 2;

        // HPBW line (horizontal line at -3dB from peak)
        if (plotType === 'cartesian') {
          annotationTraces.push({
            x: [hpbwLeft, hpbwRight],
            y: [peakValue - 3, peakValue - 3],
            type: 'scatter',
            mode: 'lines',
            name: 'HPBW',
            line: { color: 'black', width: 2, dash: 'dot' },
            opacity: 0.5,
            showlegend: false,
          });
        } else {
          // For polar plots, create HPBW arc
          const hpbwTheta = [];
          const hpbwR = [];
          for (let angle = hpbwLeft; angle <= hpbwRight; angle += hpbwRight/5) {
            hpbwTheta.push(angle);
            hpbwR.push(peakValue - 3);
          }
          annotationTraces.push({
            r: hpbwR,
            theta: hpbwTheta,
            type: 'scatterpolar',
            mode: 'lines',
            name: 'HPBW',
            line: { color: 'black', width: 2, dash: 'dot' },
            opacity: 0.5,
            showlegend: false,
          });
        }

        // SLL line (horizontal line at SLL level)
        if (plotType === 'cartesian') {
          annotationTraces.push({
            x: [result.theta[0], result.theta[result.theta.length - 1]],
            y: [sllValue, sllValue],
            type: 'scatter',
            mode: 'lines',
            name: 'SLL',
            line: { color: 'red', width: 2, dash: 'dot' },
            opacity: 0.5,
            showlegend: false,
          });
        } else {
          // For polar plots, create SLL circle
          const sllTheta = [];
          const sllR = [];
          for (let angle = 0; angle <= 360; angle += 1) {
            sllTheta.push(angle);
            sllR.push(sllValue);
          }
          annotationTraces.push({
            r: sllR,
            theta: sllTheta,
            type: 'scatterpolar',
            mode: 'lines',
            name: 'SLL',
            line: { color: 'red', width: 2, dash: 'dot' },
            opacity: 0.5,
            showlegend: false,
          })
  

        }
      }

      // Add polar annotation as a text trace
      const polarAnnotations = [];
      if (
        plotType === 'polar' &&
        annotate &&
        result &&
        result.peak_angle !== undefined &&
        result.gain !== undefined
      ) {
        polarAnnotations.push({
          type: 'scatterpolar',
          mode: 'text',
          r: [result.gain+1],
          theta: [result.peak_angle],
          text: [`Peak: ${result.gain.toFixed(1)} dB @ ${result.peak_angle.toFixed(1)}°`],
          textfont: { color: 'green', size: 12 },
          showlegend: false,
          hoverinfo: 'skip'
        });
        polarAnnotations.push({
          type: 'scatterpolar',
          mode: 'text',
          r: [result.gain - 5],
          theta: [result.peak_angle],
          text: [`HPBW: ${result.hpbw.toFixed(1)}°`],
          textfont: { color: 'black', size: 12 },
          showlegend: false,
          hoverinfo: 'skip'
        });
        polarAnnotations.push({
          type: 'scatterpolar',
          mode: 'text',
          r: [result.gain - result.sll],
          theta: [result.peak_angle],
          text: [`SLL: ${result.sll.toFixed(1)}dB`],
          textfont: { color: 'black', size: 12 },
          showlegend: false,
          hoverinfo: 'skip'
        });
      }

      return [
        ...baseTraces,
        ...currentTrace,
        ...annotationTraces,
        ...polarAnnotations // <-- Add this at the end
      ];
    };

    /**
     * Generates plot layout configuration for both cartesian and polar plots
     * Sets appropriate axis configurations and styling based on plot type
     */
    
    const getPlotLayout = () => {
      const baseLayout = {
        width: 528,
        height: 300,
        margin: { l: 60, r: 20, t: 30, b: 40 },
        showlegend: false,
        plot_bgcolor: '#fff',
        paper_bgcolor: '#fff',
      };

      if (plotType === 'cartesian') {
        return {
          ...baseLayout,
          title: {
            text: '<b>Gain Pattern<b>', 
            font: { size: 14, color: '#222'},      
            xref: 'paper',
            x: 0.5, // Center the title
          },
          xaxis: {
            title: { text: 'Angle (deg)', font: { size: 12, color: '#222' } },
            showgrid: true,
            range: xMin !== '' && xMax !== '' ? [Number(xMin), Number(xMax)] : undefined,
            dtick: xStep !== '' ? Number(xStep) : undefined,
            automargin: true,
          },
          yaxis: {
            title: { text: 'dB', font: { size: 12, color: '#222' } },
            showgrid: true,
            range: yMin !== '' && yMax !== '' ? [Number(yMin), Number(yMax)] : undefined,
            dtick: yStep !== '' ? Number(yStep) : undefined,
            automargin: true,
          },
          annotations: annotate && result && result.peak_angle !== undefined ? [
            {
              x: result.peak_angle + 0.5 * result.hpbw,
              y: result.gain,
              text: `Peak: ${result.gain.toFixed(1)} dB @ ${result.peak_angle.toFixed(1)}°`,
              showarrow: false,
              font: { color: 'green' },
              xanchor: 'left'
            },
            {
              x: result.peak_angle + 1 * result.hpbw,
              y: result.gain - 3,
              text: `HPBW: ${result.hpbw.toFixed(1)}°`,
              showarrow: false,
              font: { color: 'black' },
              xanchor: 'left'
            },
            {
              x: result.peak_angle + 2 * result.hpbw,
              y: result.gain - result.sll + 1,
              text: `SLL: ${result.sll.toFixed(1)} dB`,
              showarrow: false,
              font: { color: 'red' },
              xanchor: 'left'
            }
          ] : [],
        };
      } else {
        return {
          ...baseLayout,
          polar: {
            domain: {
              x: [0, 1],
              y: [0, 1]
            },
            radialaxis: {
              visible: true,
              range: yMin !== '' && yMax !== '' ? [Number(yMin), Number(yMax)] : undefined,
              dtick: yStep !== '' ? Number(yStep) : undefined,
              title: 'Array Factor (dB)',
            },
            angularaxis: {
              range: xMin !== '' && xMax !== '' ? [Number(xMin), Number(xMax)] : undefined,
              dtick: xStep !== '' ? Number(xStep) : undefined,
              direction: 'clockwise',
              rotation: 90,
              tickmode: 'array',
              tickvals: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
              ticktext: ['0°', '30°', '60°', '90°', '120°', '150°', '180°', '-150°','-120','-90','-60','-30'],
            }
          },
          // annotations: annotate && result && result.peak_angle !== undefined ? [
          //   {
          //     x: result.gain * Math.cos(result.peak_angle * Math.PI/180),
          //     y: result.gain * Math.sin(result.peak_angle * Math.PI/180),
          //     text: `Peak: ${result.gain.toFixed(1)} dB @ ${result.peak_angle.toFixed(1)}°`,
          //     font: { color: 'green' },
          //     xanchor: 'left'
          //   },
          //   {
          //     r: result.gain - 3,
          //     theta: result.peak_angle,
          //     text: `HPBW: ${result.hpbw.toFixed(1)}°`,
          //     showarrow: false,
          //     font: { color: 'black' },
          //     xanchor: 'left'
          //   },
          //   {
          //     r: result.gain - result.sll + 1,
          //     theta: result.peak_angle + 2 * result.hpbw,
          //     text: `SLL: ${result.sll.toFixed(1)} dB`,
          //     showarrow: false,
          //     font: { color: 'red' },
          //     xanchor: 'left'
            // }
          // ] : [],
        };
      }
    };

    return (
    <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, background: '#fff', marginBottom: 24 }}>
           <h2>Linear Array Analysis</h2>
           <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
             <button
               onClick={toggleAnnotate}
               style={{
                 padding: '8px 16px',
                 fontSize: 14,
                 background: annotate ? '#0074D9' : '#f5f5f5',
                 color: annotate ? 'white' : 'black',
                 border: '1px solid #ddd',
                 borderRadius: 4,
                 cursor: 'pointer'
               }}
             >
               {annotate ? 'Hide Annotations' : 'Show Annotations'}
             </button>
          <button 
            onClick={togglePlotType} 
            style={{ 
                 padding: '8px 16px',
              fontSize: 14, 
                 background: plotType === 'cartesian' ? '#0074D9' : '#f5f5f5',
                 color: plotType === 'cartesian' ? 'white' : 'black',
                 border: '1px solid #ddd',
              borderRadius: 4,
                 cursor: 'pointer'
            }}
          >
               {plotType === 'cartesian' ? 'Switch to Polar' : 'Switch to Cartesian'}
          </button>
             {/* Keep/Clear trace buttons */}
              <button 
               onClick={handleKeepTrace}
               disabled={loading || !result || !result.theta || !result.pattern}
                style={{ 
                 padding: '8px 16px',
                  fontSize: 14, 
                 background: '#e0e0e0',
                 color: 'black',
                 border: '1px solid #ddd',
                  borderRadius: 4,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
               Keep trace
              </button>
              <button 
               onClick={handleClearTraces}
               disabled={loading || traces.length === 0}
                style={{ 
                 padding: '8px 16px', 
                  fontSize: 14, 
                 background: '#fff',
                 color: 'black',
                 border: '1px solid #ddd',
                  borderRadius: 4,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
               Clear all traces
              </button>
        </div>
      </div>
      
        {/* Main results area */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
          {/* Plot area */}
          <div style={{ flex: '0 0 528px', width: 528, minWidth: 528, maxWidth: 528, height: 374, minHeight: 374, maxHeight: 374, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0 }}>
          <Plot
              data={getPlotData()}
              layout={getPlotLayout()}
            config={{ responsive: true, displayModeBar: true }}
          />
            <div style={{ display: 'flex', gap: 4, marginTop: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 11 }}>
              {plotType === 'cartesian' && (
                <>
                  <label style={{ margin: 0 }}>
                    X min:&nbsp;
                    <input type="number" value={xMin} onChange={e => setXMin(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
                  </label>
                  <label style={{ margin: 0 }}>
                    X max:&nbsp;
                    <input type="number" value={xMax} onChange={e => setXMax(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
                  </label>
                  <label style={{ margin: 0 }}>
                    X step:&nbsp;
                    <input type="number" value={xStep} onChange={e => setXStep(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
                  </label>
                </>
              )}
              <label style={{ margin: 0 }}>
                Y min:&nbsp;
                <input type="number" value={yMin} onChange={e => setYMin(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
              </label>
              <label style={{ margin: 0 }}>
                Y max:&nbsp;
                <input type="number" value={yMax} onChange={e => setYMax(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
              </label>
              <label style={{ margin: 0 }}>
                Y step:&nbsp;
                <input type="number" value={yStep} onChange={e => setYStep(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
              </label>
            </div>
          </div>
          {/* Legend area */}
          <div style={{ flex: '1 1 0', minWidth: 260, maxWidth: 340, maxHeight: 374, overflow: 'auto', background: '#fafbfc', borderRadius: 8, boxShadow: '0 1px 4px #eee', padding: 12, marginLeft: 8, alignSelf: 'flex-start' }}>
            <h3 style={{ fontSize: 15, margin: '0 0 8px 0' }}>Legend</h3>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 4 }}>Visible</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Color</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>N</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Spacing</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Scan</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Taper</th>
                  <th style={{ textAlign: 'left', padding: 4 }}></th>
                </tr>
              </thead>
              <tbody>
                {/* Kept traces */}
                {traces.map((trace, idx) => (
                  <tr
                    key={idx}
                    onMouseEnter={() => setHighlightedTrace(idx)}
                    onMouseLeave={() => setHighlightedTrace(null)}
                    style={{ background: highlightedTrace === idx ? '#e6f7ff' : undefined }}
                  >
                    <td style={{ padding: 4 }}>
                      <input
                        type="checkbox"
                        checked={trace.visible}
                        onChange={e => {
                          const newTraces = traces.slice();
                          newTraces[idx].visible = e.target.checked;
                          setTraces(newTraces);
                        }}
                        style={{ marginRight: 4 }}
                      />
                    </td>
                    <td style={{ padding: 4 }}>
                      <span style={{ display: 'inline-block', width: 16, height: 8, background: trace.color, borderRadius: 2, border: '1px solid #ccc' }}></span>
                    </td>
                    <td style={{ padding: 4 }}>{trace.params.numElem}</td>
                    <td style={{ padding: 4 }}>{trace.params.elementSpacing}</td>
                    <td style={{ padding: 4 }}>{trace.params.scanAngle}</td>
                    <td style={{ padding: 4 }}>
                      {trace.params.windowType === 'window'
                        ? (trace.params.window ? trace.params.window : 'no window')
                        : `SLL=${trace.params.SLL}`}
                    </td>
                    <td style={{ padding: 4 }}>
                      <button
                        onClick={() => handleRemoveTrace(idx)}
                        style={{ background: 'none', border: 'none', color: '#FF4136', cursor: 'pointer', fontSize: 13, padding: 0 }}
                        title="Remove trace"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Current trace */}
                {result && result.theta && result.pattern && (
                  <tr>
                    <td style={{ padding: 4 }}>
                      <input
                        type="checkbox"
                        checked={showCurrent}
                        onChange={e => setShowCurrent(e.target.checked)}
                        style={{ marginRight: 4 }}
                      />
                    </td>
                    <td style={{ padding: 4 }}>
                      <span style={{ display: 'inline-block', width: 16, height: 8, background: '#0074D9', borderRadius: 2, border: '1px solid #ccc' }}></span>
                    </td>
                    <td style={{ padding: 4 }}>{numElem}</td>
                    <td style={{ padding: 4 }}>{elementSpacing}</td>
                    <td style={{ padding: 4 }}>{scanAngle}</td>
                    <td style={{ padding: 4 }}>
                      {windowType === 'window'
                        ? (window ? window : 'no window')
                        : `SLL=${SLL}`}
                    </td>
                    <td style={{ padding: 4, color: '#888', fontSize: 12 }}>Current</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

                 {/* Manifold plot */}
         {result && result.manifold && numElem <= 60 && (() => {
            const x = Array.isArray(result.manifold[0]) ? result.manifold[0] : result.manifold;
            const y = Array(x.length).fill(0);
           const markerSize = numElem > 30 ? 4 : 10;
            return (
             <div style={{ marginTop: 16, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', padding: 16 }}>
              <Plot
                data={[{
                    x,
                    y,
                    type: 'scatter',
                    mode: 'markers',
                    name: 'Array Elements',
                  marker: { color: 'red', symbol: 'x', size: markerSize, line: { width: 2 } },
                    showlegend: false,
                }]}
                layout={{
                  width: 528,
                  height: 90,
                  margin: { l: 50, r: 20, t: 30, b: 40 },
                  xaxis: {
                    title: { text: 'Element Position (λ)', font: { size: 12 } },
                    showgrid: true,
                    zeroline: false,
                    showticklabels: true,
                    titlefont: { size: 12 },
                  },
                  yaxis: {
                    showgrid: false,
                    zeroline: false,
                    showticklabels: false,
                    range: [-0.1, 0.1],
                  },
                  plot_bgcolor: '#fff',
                  paper_bgcolor: '#fff',
                }}
                config={{ responsive: true, displayModeBar: false }}
              />
            </div>
            );
          })()}
          
                 {/* Pattern parameters table */}
         <div style={{ marginTop: 24 }}>
           <h2>Pattern Parameters</h2>
      <table style={{ borderCollapse: 'collapse', width: '80%', background: '#fff' }}>
            <thead>
              <tr>
                <th style={{ padding: 6, border: '1px solid #eee' }}>Color</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>Label</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>Gain (dB)</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>Peak Angle (deg)</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>SLL (dB)</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>HPBW (deg)</th>
              </tr>
            </thead>
        <tbody>
              {/* Kept traces */}
              {traces.map((trace, idx) => (
                trace.visible && trace.patternParams ? (
                  <tr key={idx}>
                    <td style={{ padding: 6, border: '1px solid #eee' }}>
                      <span style={{ display: 'inline-block', width: 16, height: 8, background: trace.color, borderRadius: 2, border: '1px solid #ccc' }}></span>
                    </td>
                    <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.label}</td>
                    <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.patternParams.gain !== undefined ? trace.patternParams.gain.toFixed(2) : ''}</td>
                    <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.patternParams.peak_angle !== undefined ? trace.patternParams.peak_angle.toFixed(2) : ''}</td>
                    <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.patternParams.sll !== undefined ? trace.patternParams.sll.toFixed(2) : ''}</td>
                    <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.patternParams.hpbw !== undefined ? trace.patternParams.hpbw.toFixed(2) : ''}</td>
                  </tr>
                ) : null
              ))}
              {/* Current trace */}
              {showCurrent && result && result.gain !== undefined && (
                <tr>
                  <td style={{ padding: 6, border: '1px solid #eee' }}>
                    <span style={{ display: 'inline-block', width: 16, height: 8, background: '#0074D9', borderRadius: 2, border: '1px solid #ccc' }}></span>
                  </td>
                  <td style={{ padding: 6, border: '1px solid #eee' }}>Current</td>
                  <td style={{ padding: 6, border: '1px solid #eee' }}>{result.gain.toFixed(2)}</td>
                  <td style={{ padding: 6, border: '1px solid #eee' }}>{result.peak_angle.toFixed(2)}</td>
                  <td style={{ padding: 6, border: '1px solid #eee' }}>{result.sll.toFixed(2)}</td>
                  <td style={{ padding: 6, border: '1px solid #eee' }}>{result.hpbw.toFixed(2)}</td>
                </tr>
              )}
        </tbody>
      </table>
        </div>
    </div>
  );
  };

  /**
   * Renders the planar array analysis results
   * Supports pattern cuts, manifold visualization, and parameter display
   * Includes full trace management features for pattern cut plots
   */
  const renderPlanarArrayResults = () => {
    /**
     * Generates plot data for planar array pattern cuts
     * Handles kept traces and current plot
     */
    const getPlanarPlotData = () => {
      const baseTraces = planarTraces.map((trace, idx) =>
        trace.visible
          ? {
              x: trace.x,
              y: trace.y,
              type: 'scatter',
              mode: 'lines',
              name: trace.label,
              line: {
                color: trace.color,
                width: planarHighlightedTrace === idx ? 4 : 2,
              },
              opacity: planarHighlightedTrace === null ? 0.8 : (planarHighlightedTrace === idx ? 1 : 0.3),
            }
          : null
      ).filter(Boolean);

      const currentTrace = planarShowCurrent && result && result.theta && result.pattern && result.theta.length > 0 && result.pattern.length > 0
        ? [{
                x: result.theta,
                y: result.pattern,
                type: 'scatter',
                mode: 'lines',
            name: 'Current',
            line: { color: '#0074D9', width: 3 },
            opacity: 1,
          }]
        : [];

      // Annotation traces for planar pattern cut
      const annotationTraces = [];
      if (planarAnnotate && result && result.peak_angle !== undefined && result.sll !== undefined && result.hpbw !== undefined) {
        const peakAngle = result.peak_angle;
        const peakValue = result.gain;
        const sllValue = peakValue - result.sll;
        const hpbwLeft = peakAngle - result.hpbw / 2;
        const hpbwRight = peakAngle + result.hpbw / 2;
        // HPBW line
        annotationTraces.push({
          x: [hpbwLeft, hpbwRight],
          y: [peakValue - 3, peakValue - 3],
          type: 'scatter',
          mode: 'lines',
          name: 'HPBW',
          line: { color: 'black', width: 2, dash: 'dot' },
          opacity: 0.5,
          showlegend: false,
        });
        // SLL line
        annotationTraces.push({
          x: [result.theta[0], result.theta[result.theta.length - 1]],
          y: [sllValue, sllValue],
          type: 'scatter',
          mode: 'lines',
          name: 'SLL',
          line: { color: 'red', width: 2, dash: 'dot' },
          opacity: 0.5,
          showlegend: false,
        });
      }
      return [...baseTraces, ...currentTrace, ...annotationTraces];
    };

    /**
     * Generates plot layout for planar array pattern cuts
     */
    const getPlanarPlotLayout = () => {
      const baseLayout = {
        width: 528,
        height: 300,
        margin: { l: 60, r: 20, t: 30, b: 40 },
        showlegend: false,
        plot_bgcolor: '#fff',
        paper_bgcolor: '#fff',
      };
      return {
        ...baseLayout,
        title: {
          text: '<b>Pattern Cut<b>',
          font: { size: 14, color: '#222' },
          xref: 'paper',
          x: 0.5,
        },
        xaxis: {
          title: { text: 'Angle (deg)', font: { size: 12, color: '#222' } },
          showgrid: true,
          range: xMin !== '' && xMax !== '' ? [Number(xMin), Number(xMax)] : undefined,
          dtick: xStep !== '' ? Number(xStep) : undefined,
          automargin: true,
        },
        yaxis: {
          title: { text: 'dB', font: { size: 12, color: '#222' } },
          showgrid: true,
          range: yMin !== '' && yMax !== '' ? [Number(yMin), Number(yMax)] : undefined,
          dtick: yStep !== '' ? Number(yStep) : undefined,
          automargin: true,
        },
        annotations: planarAnnotate && result && result.peak_angle !== undefined ? [
          {
            x: result.peak_angle + 0.5 * result.hpbw,
            y: result.gain,
            text: `Peak: ${result.gain.toFixed(1)} dB @ ${result.peak_angle.toFixed(1)}°`,
            showarrow: false,
            font: { color: 'green' },
            xanchor: 'left'
          },
          {
            x: result.peak_angle + 1 * result.hpbw,
            y: result.gain - 3,
            text: `HPBW: ${result.hpbw.toFixed(1)}°`,
            showarrow: false,
            font: { color: 'black' },
            xanchor: 'left'
          },
          {
            x: result.peak_angle + 2 * result.hpbw,
            y: result.gain - result.sll + 1,
            text: `SLL: ${result.sll.toFixed(1)} dB`,
            showarrow: false,
            font: { color: 'red' },
            xanchor: 'left'
          }
        ] : [],
      };
    };

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, background: '#fff', marginBottom: 24 }}>
          <h2>Planar Array Analysis</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Keep/Clear trace buttons for pattern cut plots */}
            {planarPlotType === 'pattern_cut' && (
              <>
                <button 
                  onClick={handleKeepPlanarTrace}
                  disabled={loading || !result || !result.theta || !result.pattern}
                  style={{
                    padding: '8px 16px',
                    fontSize: 14,
                    background: '#e0e0e0',
                    color: 'black',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Keep trace
                </button>
                <button
                  onClick={handleClearPlanarTraces}
                  disabled={loading || planarTraces.length === 0}
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: 14, 
                    background: '#fff',
                    color: 'black',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Clear all traces
                </button>
              </>
            )}
          </div>
        </div>
        
        {planarPlotType === 'pattern_cut' && result.theta && result.pattern && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <button
              onClick={togglePlanarAnnotate}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                background: planarAnnotate ? '#0074D9' : '#f5f5f5',
                color: planarAnnotate ? 'white' : 'black',
                border: '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {planarAnnotate ? 'Hide Annotations' : 'Show Annotations'}
            </button>
          </div>
        )}
        
        {planarPlotType === 'pattern_cut' && result.theta && result.pattern ? (
          <>
            {/* Main results area with plot and legend */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
              {/* Plot area */}
              <div style={{ flex: '0 0 528px', width: 528, minWidth: 528, maxWidth: 528, height: 374, minHeight: 374, maxHeight: 374, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0 }}>
                <Plot
                  data={getPlanarPlotData()}
                  layout={getPlanarPlotLayout()}
            config={{ responsive: true, displayModeBar: true }}
          />
                <div style={{ display: 'flex', gap: 4, marginTop: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 11 }}>
            <label style={{ margin: 0 }}>
              X min:&nbsp;
                    <input type="number" value={xMin} onChange={e => setXMin(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <label style={{ margin: 0 }}>
              X max:&nbsp;
                    <input type="number" value={xMax} onChange={e => setXMax(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <label style={{ margin: 0 }}>
              X step:&nbsp;
                    <input type="number" value={xStep} onChange={e => setXStep(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <label style={{ margin: 0 }}>
              Y min:&nbsp;
                    <input type="number" value={yMin} onChange={e => setYMin(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <label style={{ margin: 0 }}>
              Y max:&nbsp;
                    <input type="number" value={yMax} onChange={e => setYMax(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <label style={{ margin: 0 }}>
              Y step:&nbsp;
                    <input type="number" value={yStep} onChange={e => setYStep(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
          </div>
              </div>
              {/* Legend area */}
              <div style={{ flex: '1 1 0', minWidth: 260, maxWidth: 340, maxHeight: 374, overflow: 'auto', background: '#fafbfc', borderRadius: 8, boxShadow: '0 1px 4px #eee', padding: 12, marginLeft: 8, alignSelf: 'flex-start' }}>
                <h3 style={{ fontSize: 15, margin: '0 0 8px 0' }}>Legend</h3>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 4 }}>Visible</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>Color</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>Type</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>N</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>Spacing</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>Cut</th>
                      <th style={{ textAlign: 'left', padding: 4 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Kept traces */}
                    {planarTraces.map((trace, idx) => (
                      <tr
                        key={idx}
                        onMouseEnter={() => setPlanarHighlightedTrace(idx)}
                        onMouseLeave={() => setPlanarHighlightedTrace(null)}
                        style={{ background: planarHighlightedTrace === idx ? '#e6f7ff' : undefined }}
                      >
                        <td style={{ padding: 4 }}>
                          <input
                            type="checkbox"
                            checked={trace.visible}
                            onChange={e => {
                              const newTraces = planarTraces.slice();
                              newTraces[idx].visible = e.target.checked;
                              setPlanarTraces(newTraces);
                            }}
                            style={{ marginRight: 4 }}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <span style={{ display: 'inline-block', width: 16, height: 8, background: trace.color, borderRadius: 2, border: '1px solid #ccc' }}></span>
                        </td>
                        <td style={{ padding: 4 }}>{trace.params.arrayType}</td>
                        <td style={{ padding: 4 }}>
                          {trace.params.arrayType === 'circ'
                            ? (() => {
                                const parts = Array.isArray(trace.params.numElem)
                                  ? trace.params.numElem
                                  : String(trace.params.numElem).split(',').map(s => s.trim());
                                const total = parts.map(s => parseInt(s)).filter(n => !isNaN(n) && n > 0).reduce((a, b) => a + b, 0);
                                return `${total} (${parts.join(',')})`;
                              })()
                            : (Array.isArray(trace.params.numElem) ? trace.params.numElem.join('x') : trace.params.numElem)
                          }
                        </td>
                        <td style={{ padding: 4 }}>
                          {trace.params.arrayType === 'circ'
                            ? (trace.params.radii
                                ? (Array.isArray(trace.params.radii) ? trace.params.radii.join(',') : trace.params.radii)
                                : '')
                            : (Array.isArray(trace.params.elementSpacing) ? trace.params.elementSpacing.join('x') : trace.params.elementSpacing)
                          }
                        </td>
                        <td style={{ padding: 4 }}>{trace.params.cutAngle}°</td>
                        <td style={{ padding: 4 }}>
                          <button
                            onClick={() => handleRemovePlanarTrace(idx)}
                            style={{ background: 'none', border: 'none', color: '#FF4136', cursor: 'pointer', fontSize: 13, padding: 0 }}
                            title="Remove trace"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Current trace */}
                    {planarShowCurrent && result && result.theta && result.pattern && (
                      <tr>
                        <td style={{ padding: 4 }}>
                          <input
                            type="checkbox"
                            checked={planarShowCurrent}
                            onChange={e => setPlanarShowCurrent(e.target.checked)}
                            style={{ marginRight: 4 }}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <span style={{ display: 'inline-block', width: 16, height: 8, background: '#0074D9', borderRadius: 2, border: '1px solid #ccc' }}></span>
                        </td>
                        <td style={{ padding: 4 }}>{planarArrayType}</td>
                        <td style={{ padding: 4 }}>
                          {planarArrayType === 'circ'
                            ? (() => {
                                const parts = planarNumElemRaw.split(',').map(s => s.trim()).filter(s => s !== '');
                                const nums = parts.map(s => parseInt(s)).filter(n => !isNaN(n) && n > 0);
                                const total = nums.reduce((a, b) => a + b, 0);
                                return `${total} (${nums.join(',')})`;
                              })()
                            : (Array.isArray(planarNumElem) ? planarNumElem.join('x') : planarNumElem)
                        }
                        </td>
                        <td style={{ padding: 4 }}>
                          {planarArrayType === 'circ'
                            ? planarRadiusRaw
                            : (Array.isArray(planarElementSpacing) ? planarElementSpacing.join('x') : planarElementSpacing)
                        }
                        </td>
                        <td style={{ padding: 4 }}>{planarCutAngle}°</td>
                        <td style={{ padding: 4, color: '#888', fontSize: 12 }}>Current</td>
                      </tr>
                    )}
        </tbody>
      </table>
    </div>
      </div>
      
            {/* Manifold plot */}
          {result.manifold_x && result.manifold_y && (
              <div style={{ marginTop: 16, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', padding: 16 }}>
            <Plot
                  data={[{
                  x: result.manifold_x,
                  y: result.manifold_y,
                  type: 'scatter',
                  mode: 'markers',
                  name: 'Array Elements',
                  marker: { color: 'red', symbol: 'x', size: 8 },
                  showlegend: false,
                  }]}
              layout={{
                width: 528,
                height: 200,
                margin: { l: 50, r: 20, t: 30, b: 50 },
                xaxis: {
                  title: { text: 'X Position (λ)', font: { size: 12 } },
                  showgrid: true,
                  zeroline: true,
                  scaleanchor: 'y',
                  scaleratio: 1,
                },
                yaxis: {
                  title: { text: 'Y Position (λ)', font: { size: 12 } },
                  showgrid: true,
                  zeroline: true,
                  scaleratio: 1,
                },
                plot_bgcolor: '#fff',
                paper_bgcolor: '#fff',
              }}
              config={{ responsive: true, displayModeBar: false }}
            />
              </div>
          )}

            {/* Pattern parameters table */}
            <div style={{ marginTop: 24 }}>
              <h2>Pattern Parameters</h2>
              <table style={{ borderCollapse: 'collapse', width: '80%', background: '#fff' }}>
                <thead>
                  <tr>
                    <th style={{ padding: 6, border: '1px solid #eee' }}>Color</th>
                    <th style={{ padding: 6, border: '1px solid #eee' }}>Label</th>
                    <th style={{ padding: 6, border: '1px solid #eee' }}>Gain (dB)</th>
                    <th style={{ padding: 6, border: '1px solid #eee' }}>Peak Angle (deg)</th>
                    <th style={{ padding: 6, border: '1px solid #eee' }}>SLL (dB)</th>
                    <th style={{ padding: 6, border: '1px solid #eee' }}>HPBW (deg)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Kept traces */}
                  {planarTraces.map((trace, idx) => (
                    trace.visible && trace.patternParams ? (
                      <tr key={idx}>
                        <td style={{ padding: 6, border: '1px solid #eee' }}>
                          <span style={{ display: 'inline-block', width: 16, height: 8, background: trace.color, borderRadius: 2, border: '1px solid #ccc' }}></span>
                        </td>
                        <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.label}</td>
                        <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.patternParams.gain !== undefined ? trace.patternParams.gain.toFixed(2) : ''}</td>
                        <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.patternParams.peak_angle !== undefined ? trace.patternParams.peak_angle.toFixed(2) : ''}</td>
                        <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.patternParams.sll !== undefined ? trace.patternParams.sll.toFixed(2) : ''}</td>
                        <td style={{ padding: 6, border: '1px solid #eee' }}>{trace.patternParams.hpbw !== undefined ? trace.patternParams.hpbw.toFixed(2) : ''}</td>
                      </tr>
                    ) : null
                  ))}
                  {/* Current trace */}
                  {planarShowCurrent && result && result.gain !== undefined && (
                    <tr>
                      <td style={{ padding: 6, border: '1px solid #eee' }}>
                        <span style={{ display: 'inline-block', width: 16, height: 8, background: '#0074D9', borderRadius: 2, border: '1px solid #ccc' }}></span>
                      </td>
                      <td style={{ padding: 6, border: '1px solid #eee' }}>Current</td>
                      <td style={{ padding: 6, border: '1px solid #eee' }}>{result.gain.toFixed(2)}</td>
                      <td style={{ padding: 6, border: '1px solid #eee' }}>{result.peak_angle.toFixed(2)}</td>
                      <td style={{ padding: 6, border: '1px solid #eee' }}>{result.sll.toFixed(2)}</td>
                      <td style={{ padding: 6, border: '1px solid #eee' }}>{result.hpbw.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </>
      ) : planarPlotType === 'manifold' && result.manifold_x && result.manifold_y ? (
        <Plot
            data={[{
              x: result.manifold_x,
              y: result.manifold_y,
              type: 'scatter',
              mode: 'markers',
              name: 'Array Elements',
              marker: { color: 'red', symbol: 'x', size: 10 },
            }]}
          layout={{
            width: 528,
            height: 400,
            margin: { l: 50, r: 20, t: 30, b: 50 },
            title: { text: 'Array Manifold', font: { size: 16 } },
            xaxis: {
              title: { text: 'X Position (λ)', font: { size: 14 } },
              showgrid: true,
              zeroline: true,
              scaleanchor: 'y',
              scaleratio: 1,
            },
            yaxis: {
              title: { text: 'Y Position (λ)', font: { size: 14 } },
              showgrid: true,
              zeroline: true,
              scaleratio: 1,
            },
            plot_bgcolor: '#fff',
            paper_bgcolor: '#fff',
          }}
          config={{ responsive: true, displayModeBar: true }}
        />
        ) : result.plot_type === '3d_polar' && result.data ? (
          // Render native Plotly 3D polar plot
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', padding: 16 }}>
            <Plot
              data={[
                {
                  type: 'surface',
                  x: result.data.x,
                  y: result.data.y,
                  z: result.data.z,
                  colorscale: 'Viridis',
                  opacity: 0.8,
                  showscale: true,
                  colorbar: { title: 'Gain (dB)' }
                },
                {
                  type: 'scatter3d',
                  x: result.data.array_x,
                  y: result.data.array_y,
                  z: Array(result.data.array_x.length).fill(0),
                  mode: 'markers',
                  marker: { color: 'red', size: 3 },
                  name: 'Array Elements',
                  showlegend: false
                }
              ]}
              layout={{
                width: 600,
                height: 500,
                title: '3D Polar Array Pattern',
                scene: {
                  camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.5 }
                  },
                  xaxis: { title: {text:''}, showgrid: false, zeroline: false ,showticklabels: false},
                  yaxis: { title: {text:''}, showgrid: false, zeroline: false ,showticklabels: false},
                  zaxis: { title: {text:''}, showgrid: false, showline: false ,showticklabels: false}
                },
                margin: { l: 0, r: 0, t: 50, b: 0 }
              }}
              config={{ responsive: true, displayModeBar: true }}
            />
          </div>
      ) : result.plot ? (
        <img
          src={`data:image/png;base64,${result.plot}`}
          alt="Planar Array Plot"
          style={{ maxWidth: '80%', border: '1px solid #ccc', borderRadius: 8 }}
        />
      ) : null}
      
        {/* Simple parameter display for non-pattern-cut plots */}
        {result && (result.gain !== undefined || result.manifold_x) && planarPlotType !== 'pattern_cut' && (
        <>
          <h2 style={{ marginTop: 16 }}>Pattern Parameters</h2>
          <table style={{ borderCollapse: 'collapse', width: '80%', background: '#fff' }}>
            <tbody>
                {result.gain !== undefined && <tr><td style={{ padding: 6, border: '1px solid #eee' }}>Gain (dB)</td><td style={{ padding: 6, border: '1px solid #eee' }}>{result.gain.toFixed(2)}</td></tr>}
                {result.peak_angle !== undefined && <tr><td style={{ padding: 6, border: '1px solid #eee' }}>Peak Angle (deg)</td><td style={{ padding: 6, border: '1px solid #eee' }}>{result.peak_angle.toFixed(2)}</td></tr>}
                {result.sll !== undefined && <tr><td style={{ padding: 6, border: '1px solid #eee' }}>SLL (dB)</td><td style={{ padding: 6, border: '1px solid #eee' }}>{result.sll.toFixed(2)}</td></tr>}
                {result.hpbw !== undefined && <tr><td style={{ padding: 6, border: '1px solid #eee' }}>HPBW (deg)</td><td style={{ padding: 6, border: '1px solid #eee' }}>{result.hpbw.toFixed(2)}</td></tr>}
                {result.cut_angle !== undefined && <tr><td style={{ padding: 6, border: '1px solid #eee' }}>Cut Angle (deg)</td><td style={{ padding: 6, border: '1px solid #eee' }}>{result.cut_angle.toFixed(2)}</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div style={{ maxWidth: 1200, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 }}>
      <h1>Antenna Array Analysis Tool</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #eee' }}>
          <button
            onClick={() => setActiveTab('linear')}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              background: activeTab === 'linear' ? '#0074D9' : '#f5f5f5',
              color: activeTab === 'linear' ? 'white' : 'black',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              marginRight: 4
            }}
          >
            Linear Array
          </button>
          <button
            onClick={() => setActiveTab('planar')}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              background: activeTab === 'planar' ? '#0074D9' : '#f5f5f5',
              color: activeTab === 'planar' ? 'white' : 'black',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              marginLeft: 4
            }}
          >
            Planar Array
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 32 }}>
        {/* Left side - Form */}
        <div style={{ flex: '0 0 350px' }}>
          {activeTab === 'linear' ? renderLinearArrayForm() : renderPlanarArrayForm()}
        </div>

        {/* Right side - Results and legend table */}
        <div style={{ flex: 1, display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
          {result && (activeTab === 'linear' ? renderLinearArrayResults() : renderPlanarArrayResults())}
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: 24,
        right: 32,
        zIndex: 1000
      }}>
        <a
          href="https://forms.gle/wVhn4PmyDMxEJcD67"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            background: '#0074D9',
            color: 'white',
            borderRadius: '6px',
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            fontSize: 16,
            letterSpacing: 0.5,
            transition: 'background 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#005fa3'}
          onMouseOut={e => e.currentTarget.style.background = '#0074D9'}
        >
          Feedback
        </a>
      </div>
    </div>
  );
}

export default App;