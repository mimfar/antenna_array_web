import React, { useState, useEffect, useRef } from 'react';
import Plot from 'react-plotly.js';
import LinearArrayForm from './components/LinearArrayForm';
import PlanarArrayForm from './components/PlanarArrayForm';

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
  // INPUT VALIDATION & SANITIZATION UTILITIES
  // ============================================================================
  
  const sanitizeNumber = (value, min = null, max = null) => {
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    if (min !== null && num < min) return null;
    if (max !== null && num > max) return null;
    return num;
  };
  
  const sanitizeInteger = (value, min = null, max = null) => {
    const num = parseInt(value);
    if (isNaN(num) || !Number.isInteger(num)) return null;
    if (min !== null && num < min) return null;
    if (max !== null && num > max) return null;
    return num;
  };
  
  const sanitizeArray = (value, minLength = 1, maxLength = null) => {
    if (!Array.isArray(value)) return null;
    if (value.length < minLength) return null;
    if (maxLength !== null && value.length > maxLength) return null;
    return value;
  };
  
  const validateLinearArrayInputs = (data) => {
    const errors = [];
    
    const num_elem = sanitizeInteger(data.num_elem, 1, 1000);
    if (num_elem === null) errors.push('num_elem must be an integer between 1 and 1000');
    
    const element_spacing = sanitizeNumber(data.element_spacing, 0.1, 10.0);
    if (element_spacing === null) errors.push('element_spacing must be a number between 0.1 and 10.0');
    
    const scan_angle = sanitizeNumber(data.scan_angle, -90, 90);
    if (scan_angle === null) errors.push('scan_angle must be a number between -90 and 90');
    
    // Validate SLL if present
    if (data.SLL !== undefined) {
      const SLL = sanitizeNumber(data.SLL, 20, 80);
      if (SLL === null) errors.push('SLL must be a number between 20 and 80');
    }
    
    return { isValid: errors.length === 0, errors, sanitizedData: { ...data, num_elem, element_spacing, scan_angle } };
  };
  
  const validatePlanarArrayInputs = (data) => {
    const errors = [];
    
    if (!['rect', 'tri', 'circ'].includes(data.array_type)) {
      errors.push('array_type must be rect, tri, or circ');
    }
    
    const scan_angle = sanitizeArray(data.scan_angle, 2, 2);
    if (scan_angle === null) {
      errors.push('scan_angle must be an array of 2 numbers');
    } else {
      // Validate theta (elevation angle): -90 to 90 degrees
      if (scan_angle[0] < -90 || scan_angle[0] > 90) {
        errors.push('Theta (elevation angle) must be between -90° and 90°');
      }
      // Validate phi (azimuth angle): -360 to 360 degrees
      if (scan_angle[1] < -360 || scan_angle[1] > 360) {
        errors.push('Phi (azimuth angle) must be between -360° and 360°');
      }
    }
    
    // Validate cut angle if present
    if (data.cut_angle !== undefined) {
      const cut_angle = sanitizeNumber(data.cut_angle);
      if (cut_angle === null) {
        errors.push('cut_angle must be a number');
      } else if (cut_angle < -360 || cut_angle > 360) {
        errors.push('Cut angle must be between -360° and 360°');
      }
    }
    
    // Validate SLL if present
    if (data.SLL !== undefined) {
      const SLL = sanitizeNumber(data.SLL, 20, 80);
      if (SLL === null) errors.push('SLL must be a number between 20 and 80');
    }
    
    return { isValid: errors.length === 0, errors, sanitizedData: { ...data, scan_angle } };
  };

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
  const [planarCoordinateType, setPlanarCoordinateType] = useState('cartesian');  // Coordinate type: 'cartesian' or 'polar'
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
  const [axisLocked, setAxisLocked] = useState(false);                     // Lock axis limits

  // Planar array axis limits (separate from linear array)
  const [planarXMin, setPlanarXMin] = useState('');                         // Planar X-axis minimum value
  const [planarXMax, setPlanarXMax] = useState('');                         // Planar X-axis maximum value
  const [planarYMin, setPlanarYMin] = useState('');                         // Planar Y-axis minimum value
  const [planarYMax, setPlanarYMax] = useState('');                         // Planar Y-axis maximum value
  const [planarXStep, setPlanarXStep] = useState('30');                     // Planar X-axis tick step
  const [planarYStep, setPlanarYStep] = useState('10');                     // Planar Y-axis tick step
  const [planarAxisLocked, setPlanarAxisLocked] = useState(false);          // Lock planar axis limits

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
  
  // Request management for preventing overlapping requests
  const [currentAbortController, setCurrentAbortController] = useState(null);
  const [debounceTimers, setDebounceTimers] = useState({});

  // Utility functions for request management
  const cancelCurrentRequest = () => {
    if (currentAbortController) {
      currentAbortController.abort();
      setCurrentAbortController(null);
    }
  };

  const createNewRequest = () => {
    cancelCurrentRequest();
    const newController = new AbortController();
    setCurrentAbortController(newController);
    return newController;
  };

  const debounceAnalysis = (analysisFunction, delay = 300) => {
    // Clear existing timer for this analysis type
    const timerKey = analysisFunction.name;
    if (debounceTimers[timerKey]) {
      clearTimeout(debounceTimers[timerKey]);
    }
    
    // Set new timer
    const newTimer = setTimeout(() => {
      analysisFunction();
      setDebounceTimers(prev => ({ ...prev, [timerKey]: null }));
    }, delay);
    
    setDebounceTimers(prev => ({ ...prev, [timerKey]: newTimer }));
  };

  // Helper for input change with realtime analysis
  const handleLinearInputChange = (handler) => {
    handler();
    // Don't trigger analysis here - the useEffect will handle it
  };

  const handleIntegerInputChange = (value, setter) => {
    // Sanitize to integer immediately
    const sanitized = sanitizeInteger(value, 1, 1000);
    if (sanitized !== null) {
      setter(sanitized);
      // Don't trigger analysis here - the useEffect will handle it
    }
  };
  const handlePlanarInputChange = (handler) => {
    handler();
    // Don't trigger analysis here - the useEffect will handle it
  };

  const handlePlanarIntegerInputChange = (value, index, setter) => {
    // Sanitize to integer immediately
    const sanitized = sanitizeInteger(value, 1, 100);
    if (sanitized !== null) {
      const currentArray = [...planarNumElem];
      currentArray[index] = sanitized;
      setter(currentArray);
      // Don't trigger analysis here - the useEffect will handle it
    }
  };

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================
  
  /**
   * Analyzes linear array parameters and returns pattern data
   */
  const analyzeLinearArray = async () => {
    const controller = createNewRequest();
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      // Validate inputs
      const validation = validateLinearArrayInputs({
        num_elem: numElem,
        element_spacing: elementSpacing,
        scan_angle: scanAngle
      });
      
      if (!validation.isValid) {
        setError(`Please fix the following issues:\n${validation.errors.join('\n')}`);
        setLoading(false);
        return;
      }
    
      const API_URL = process.env.REACT_APP_API_URL || '';

      const response = await fetch(`${API_URL}/api/linear-array/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_elem: validation.sanitizedData.num_elem,
          element_spacing: validation.sanitizedData.element_spacing,
          scan_angle: validation.sanitizedData.scan_angle,
          element_pattern: Boolean(elementPattern),
          element_gain: Number(elementGain),
          window: windowType === 'window' ? (window || null) : null,
          SLL: windowType === 'SLL' ? Number(SLL) : null,
          plot_type: plotType,
          show_manifold: true
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      // Don't show error if request was cancelled
      if (err.name === 'AbortError') {
        console.log('Linear array analysis cancelled');
        return;
      }
      
      console.error('Linear array analysis error:', err);
      setError(err.message || 'Failed to analyze linear array. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Analyzes planar array parameters and returns pattern data
   * Supports rectangular, triangular, and circular array configurations
   */
  const analyzePlanarArray = async () => {
    const controller = createNewRequest();
    
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
    
    // For circular arrays, only proceed if both lists have the same length
    if (planarArrayType === 'circ') {
      if (validatedNumElem.length !== validatedRadius.length) {
        // Don't set error, just return without making API call
        setLoading(false);
        return;
      }
    }
    
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
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      // Don't show error if request was cancelled
      if (err.name === 'AbortError') {
        console.log('Planar array analysis cancelled');
        return;
      }
      
      console.error('Planar array analysis error:', err);
      setError(err.message || 'Failed to analyze planar array. Please try again.');
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

  // Add toggle function for axis lock
  const toggleAxisLock = () => {
    setAxisLocked(!axisLocked);
  };

  // Add toggle function for planar axis lock
  const togglePlanarAxisLock = () => {
    setPlanarAxisLocked(!planarAxisLocked);
  };

  // Add toggle function for planar cartesian/polar plot types
  const togglePlanarCoordinateType = () => {
    if (result && activeTab === 'planar' && planarPlotType === 'pattern_cut') {
      const newCoordinateType = planarCoordinateType === 'cartesian' ? 'polar' : 'cartesian';
      setPlanarCoordinateType(newCoordinateType);
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
      // Only update axis limits if not locked
      if (!axisLocked) {
      setXMin(result.theta[0]);
      setXMax(result.theta[result.theta.length - 1]);
      setYMin(result.ymin);
        // Only set yMax automatically if there are no kept traces and it's empty or matches auto-set value
        // This allows users to customize Ymax while still providing good defaults
        if (traces.length === 0 && (yMax === '' || yMax === autoYMax)) {
      setYMax(result.ymax);
          setAutoYMax(result.ymax);
      }
      }
      // Always update step values (these don't affect the plot range)
      setXStep('30');
      setYStep('10');
    }
  }, [result, traces.length, axisLocked]);

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
      // Only update axis limits if not locked
      if (!planarAxisLocked) {
        setPlanarXMin(result.theta[0]);
        setPlanarXMax(result.theta[result.theta.length - 1]);
        setPlanarYMin(result.ymin);
        // Only set Ymax if it's empty or matches the auto-set value to allow user customization
        if (planarYMax === '' || planarYMax === planarAutoYMax) {
          setPlanarYMax(result.ymax);
          setPlanarAutoYMax(result.ymax);
        }
      }
      // Always update step values (these don't affect the plot range)
      setPlanarXStep('30');
      setPlanarYStep('10');
    }
  }, [activeTab, planarPlotType, result, planarYMax, planarAutoYMax, planarAxisLocked]);

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
      debounceAnalysis(analyzeLinearArray, 100);
    }
    // Optionally, you could clear the result or show a message if invalid
  }, [numElem, elementSpacing, scanAngle, window, SLL, windowType, elementPattern, plotType, activeTab, realtime]);

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
      debounceAnalysis(analyzeLinearArray, 100);
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
      debounceAnalysis(analyzePlanarArray, 300);
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
      debounceAnalysis(analyzePlanarArray, 300);
    }
  }
  }, [activeTab, planarArrayType, planarNumElem, planarNumElemRaw, planarElementSpacing, planarRadiusRaw, planarScanAngle, planarElementPattern, planarWindow, planarSLL, planarWindowType, planarPlotType, planarCutAngle, realtime]);

  // Cleanup effect to cancel pending requests and clear timers
  useEffect(() => {
    return () => {
      // Cancel any pending requests
      cancelCurrentRequest();
      
      // Clear any pending debounce timers
      Object.values(debounceTimers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

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
    // Only update yMax if it is empty or matches the previous auto-set value
    // This allows users to customize Ymax while still providing good defaults
    if (!axisLocked && (yMax === '' || yMax === autoYMax)) {
      setYMax(largestYMax);
      setAutoYMax(largestYMax);
    }
  }, [traces, showCurrent, result, axisLocked, yMax, autoYMax]);

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
    // Only update yMax if it is empty or matches the previous auto-set value
    // This allows users to customize Ymax while still providing good defaults
    if (!planarAxisLocked && (planarYMax === '' || planarYMax === planarAutoYMax)) {
      setPlanarYMax(String(largestYMax));
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
  // UNIFIED COMPONENTS FOR NON-PATTERN-CUT PLOTS
  // ============================================================================
  
  // Reusable simple legend component for non-pattern-cut plots
  const renderSimpleLegend = (result, planarArrayType, planarNumElemRaw, planarElementSpacing, planarRadiusRaw, planarCutAngle, dataCheck) => {
    return (
      <div className="legend-container" style={{ flex: '0 0 20%', minWidth: 200, maxWidth: 350, maxHeight: 374, overflow: 'auto', background: '#fafbfc', borderRadius: 8, boxShadow: '0 1px 4px #eee', padding: 12, marginLeft: 8, alignSelf: 'flex-start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 15, margin: 0 }}>Current Analysis</h3>
        </div>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 4 }}>Color</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Type</th>
              <th style={{ textAlign: 'left', padding: 4 }}>N</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Spacing</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Cut</th>
            </tr>
          </thead>
          <tbody>
            {/* Current trace only */}
            {result && dataCheck && (
              <tr>
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
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Reusable simple pattern parameters table for non-pattern-cut plots
  const renderSimplePatternParams = (result) => {
    return (
      <div style={{ marginTop: 50, padding: '0 16px 16px 16px' }}>
        <h2>Pattern Parameters</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%', background: '#fff' }}>
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
            {/* Current trace only */}
            {result && result.gain !== undefined && (
              <tr>
                <td style={{ padding: 6, border: '1px solid #eee' }}>
                  <span style={{ display: 'inline-block', width: 16, height: 8, background: '#0074D9', borderRadius: 2, border: '1px solid #eee' }}></span>
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
    );
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  /**
   * Renders the linear array parameter input form
   * Includes all controls for array configuration and analysis options
   */




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
          r: [result.gain-1],
          theta: [result.peak_angle],
          text: [`Peak: ${result.gain.toFixed(1)} dB @ ${result.peak_angle.toFixed(1)}°`],
          textfont: { color: 'green', size: 12 },
          showlegend: false,
          hoverinfo: 'skip'
        });
        polarAnnotations.push({
          type: 'scatterpolar',
          mode: 'text',
          r: [result.gain - 6],
          theta: [result.peak_angle],
          text: [`HPBW: ${result.hpbw.toFixed(1)}°`],
          textfont: { color: 'black', size: 12 },
          showlegend: false,
          hoverinfo: 'skip'
        });
        polarAnnotations.push({
          type: 'scatterpolar',
          mode: 'text',
          r: [result.gain - result.sll - 3],
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
      // Calculate height based on 2:3 aspect ratio (height = width * 2/3)
      // We'll use a reasonable default width and let Plotly handle the scaling
      const defaultWidth = 600;
      const calculatedHeight = Math.round(defaultWidth * (2/3));
      
      const baseLayout = {
        width: undefined,
        height: calculatedHeight,
        margin: { l: 60, r: 20, t: 30, b: 40 },
        showlegend: false,
        plot_bgcolor: '#fff',
        paper_bgcolor: '#fff',
        autosize: true,
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
      <div style={{ marginBottom: 24 }}>
      </div>
      
      {result && result.theta && result.pattern && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
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
        </div>
      )}
      
        {/* Main results area */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
          {/* Plot area */}
          <div className="plot-container" style={{ flex: '0 0 55%', minWidth: 400, maxWidth: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0 }}>
          <Plot
              data={getPlotData()}
              layout={getPlotLayout()}
            config={{ responsive: true, displayModeBar: true }}
          />
            <div style={{ display: 'flex', gap: 4, marginTop: 50, marginBottom: 16, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', fontSize: 11 }}>
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
              <button
                onClick={toggleAxisLock}
                style={{
                  background: axisLocked ? '#0074D9' : '#f0f0f0',
                  color: axisLocked ? 'white' : '#333',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
                title={axisLocked ? "Unlock axis limits" : "Lock axis limits"}
              >
                {axisLocked ? '🔒' : '🔓'} {axisLocked ? 'Locked' : 'Lock'}
              </button>
            </div>
            
            {/* Manifold plot */}
            {result && result.manifold && numElem <= 60 && (() => {
              const x = Array.isArray(result.manifold[0]) ? result.manifold[0] : result.manifold;
              const y = Array(x.length).fill(0);
              const markerSize = numElem > 30 ? 4 : 10;
              return (
                <Plot
                  key="manifold-plot"
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
                    width: undefined,
                    height: 90,
                    margin: { l: 60, r: 20, t: 30, b: 40 },
                    showlegend: false,
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
                    autosize: true,
                  }}
                  config={{ responsive: true, displayModeBar: false, useResizeHandler: true }}
                  style={{ marginTop: 50 }}
                />
              );
            })()}
            
            {/* Pattern parameters table */}
            <div style={{ marginTop: 50, padding: '0 16px 16px 16px' }}>
              <h2>Pattern Parameters</h2>
              <table style={{ borderCollapse: 'collapse', width: '100%', background: '#fff' }}>
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
                  {/* Current trace - shown first */}
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
                </tbody>
              </table>
            </div>
          </div>
          {/* Legend area */}
          <div className="legend-container" style={{ flex: '0 0 20%', minWidth: 200, maxWidth: 350, maxHeight: 374, overflow: 'auto', background: '#fafbfc', borderRadius: 8, boxShadow: '0 1px 4px #eee', padding: 12, marginLeft: 8, alignSelf: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>Legend</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  onClick={handleKeepTrace}
                  disabled={loading || !result || !result.theta || !result.pattern}
                  style={{ 
                    padding: '4px 8px',
                    fontSize: 11, 
                    background: '#e0e0e0',
                    color: 'black',
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  title="Keep current trace"
                >
                  Keep
                </button>
                <button 
                  onClick={handleClearTraces}
                  disabled={loading || traces.length === 0}
                  style={{ 
                    padding: '4px 8px', 
                    fontSize: 11, 
                    background: '#fff',
                    color: 'black',
                    border: '1px solid #ddd',
                    borderRadius: 3,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                  title="Clear all traces"
                >
                  Clear
                </button>
              </div>
            </div>
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
                {/* Current trace - shown first */}
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
              </tbody>
            </table>
          </div>
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
              ...(planarCoordinateType === 'cartesian' 
                ? { x: trace.x, y: trace.y, type: 'scatter', mode: 'lines' }
                : { r: trace.y, theta: trace.x, type: 'scatterpolar', mode: 'lines' }
              ),
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
            ...(planarCoordinateType === 'cartesian'
              ? { x: result.theta, y: result.pattern, type: 'scatter', mode: 'lines' }
              : { r: result.pattern, theta: result.theta, type: 'scatterpolar', mode: 'lines' }
            ),
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
        if (planarCoordinateType === 'cartesian') {
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
        
        // SLL line
        if (planarCoordinateType === 'cartesian') {
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
          });
        }
      }

      // Add polar text annotations for planar array
      const polarAnnotations = [];
      if (
        planarCoordinateType === 'polar' &&
        planarAnnotate &&
        result &&
        result.peak_angle !== undefined &&
        result.gain !== undefined
      ) {
        polarAnnotations.push({
          type: 'scatterpolar',
          mode: 'text',
          r: [result.gain-1],
          theta: [result.peak_angle],
          text: [`Peak: ${result.gain.toFixed(1)} dB @ ${result.peak_angle.toFixed(1)}°`],
          textfont: { color: 'green', size: 12 },
          showlegend: false,
          hoverinfo: 'skip'
        });
        polarAnnotations.push({
          type: 'scatterpolar',
          mode: 'text',
          r: [result.gain - 6],
          theta: [result.peak_angle],
          text: [`HPBW: ${result.hpbw.toFixed(1)}°`],
          textfont: { color: 'black', size: 12 },
          showlegend: false,
          hoverinfo: 'skip'
        });
        polarAnnotations.push({
          type: 'scatterpolar',
          mode: 'text',
          r: [result.gain - result.sll - 3],
          theta: [result.peak_angle],
          text: [`SLL: ${result.sll.toFixed(1)}dB`],
          textfont: { color: 'black', size: 12 },
          showlegend: false,
          hoverinfo: 'skip'
        });
      }

      return [...baseTraces, ...currentTrace, ...annotationTraces, ...polarAnnotations];
    };

    /**
     * Generates plot layout for planar array pattern cuts
     */
    const getPlanarPlotLayout = () => {
      // Calculate height based on 2:3 aspect ratio (height = width * 2/3)
      // We'll use a reasonable default width and let Plotly handle the scaling
      const defaultWidth = 600;
      const calculatedHeight = Math.round(defaultWidth * (2/3));
      
      const baseLayout = {
        width: undefined,
        height: calculatedHeight,
        margin: { l: 60, r: 20, t: 30, b: 40 },
        showlegend: false,
        plot_bgcolor: '#fff',
        paper_bgcolor: '#fff',
        autosize: true,
      };

      if (planarCoordinateType === 'cartesian') {
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
            range: planarXMin !== '' && planarXMax !== '' ? [Number(planarXMin), Number(planarXMax)] : undefined,
            dtick: planarXStep !== '' ? Number(planarXStep) : undefined,
          automargin: true,
        },
        yaxis: {
          title: { text: 'dB', font: { size: 12, color: '#222' } },
          showgrid: true,
            range: planarYMin !== '' && planarYMax !== '' ? [Number(planarYMin), Number(planarYMax)] : undefined,
            dtick: planarYStep !== '' ? Number(planarYStep) : undefined,
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
              range: planarYMin !== '' && planarYMax !== '' ? [Number(planarYMin), Number(planarYMax)] : undefined,
              dtick: planarYStep !== '' ? Number(planarYStep) : undefined,
              title: 'Array Factor (dB)',
            },
            angularaxis: {
              range: planarXMin !== '' && planarXMax !== '' ? [Number(planarXMin), Number(planarXMax)] : undefined,
              dtick: planarXStep !== '' ? Number(planarXStep) : undefined,
              direction: 'clockwise',
              rotation: 90,
              tickmode: 'array',
              tickvals: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
              ticktext: ['0°', '30°', '60°', '90°', '120°', '150°', '180°', '-150°','-120','-90','-60','-30'],
            }
          },
        };
      }
    };

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
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
            <button 
              onClick={togglePlanarCoordinateType} 
              style={{ 
                padding: '8px 16px',
                fontSize: 14, 
                background: planarCoordinateType === 'cartesian' ? '#0074D9' : '#f5f5f5',
                color: planarCoordinateType === 'cartesian' ? 'white' : 'black',
                border: '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              {planarCoordinateType === 'cartesian' ? 'Switch to Polar' : 'Switch to Cartesian'}
            </button>
          </div>
        )}
        
                      {(() => {
                                 const condition = planarPlotType === 'pattern_cut' && result.theta && result.pattern;
                return condition;
              })() ? (
          <>
            {/* Main results area with plot and legend */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
              {/* Plot area */}
              <div className="plot-container" style={{ flex: '0 0 55%', minWidth: 400, maxWidth: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0 }}>
                <Plot
                  key={`pattern-cut-${planarPlotType}-${planarCoordinateType}`}
                  data={getPlanarPlotData()}
                  layout={getPlanarPlotLayout()}
            config={{ responsive: true, displayModeBar: true }}
          />
                <div style={{ display: 'flex', gap: 4, marginTop: 50, marginBottom: 16, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', fontSize: 11 }}>
                  {planarCoordinateType === 'cartesian' && (
                    <>
            <label style={{ margin: 0 }}>
              X min:&nbsp;
                        <input type="number" value={planarXMin} onChange={e => setPlanarXMin(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <label style={{ margin: 0 }}>
              X max:&nbsp;
                        <input type="number" value={planarXMax} onChange={e => setPlanarXMax(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <label style={{ margin: 0 }}>
              X step:&nbsp;
                        <input type="number" value={planarXStep} onChange={e => setPlanarXStep(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
                    </>
                  )}
            <label style={{ margin: 0 }}>
              Y min:&nbsp;
                    <input type="number" value={planarYMin} onChange={e => setPlanarYMin(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <label style={{ margin: 0 }}>
              Y max:&nbsp;
                    <input type="number" value={planarYMax} onChange={e => setPlanarYMax(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <label style={{ margin: 0 }}>
              Y step:&nbsp;
                    <input type="number" value={planarYStep} onChange={e => setPlanarYStep(e.target.value)} style={{ width: 36, fontSize: 11, padding: '0 2px' }} />
            </label>
            <button
              onClick={togglePlanarAxisLock}
              style={{
                background: planarAxisLocked ? '#0074D9' : '#f0f0f0',
                color: planarAxisLocked ? 'white' : '#333',
                border: '1px solid #ccc',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
              title={planarAxisLocked ? "Unlock axis limits" : "Lock axis limits"}
            >
              {planarAxisLocked ? '🔒' : '🔓'} {planarAxisLocked ? 'Locked' : 'Lock'}
            </button>
          </div>
                

                
                {/* Pattern parameters table */}
                <div style={{ marginTop: 50, padding: '0 16px 16px 16px' }}>
                  <h2>Pattern Parameters</h2>
                  <table style={{ borderCollapse: 'collapse', width: '100%', background: '#fff' }}>
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
                      {/* Current trace only */}
                      {result && result.gain !== undefined && (
                        <tr>
                          <td style={{ padding: 6, border: '1px solid #eee' }}>
                            <span style={{ display: 'inline-block', width: 16, height: 8, background: '#0074D9', borderRadius: 2, border: '1px solid #eee' }}></span>
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
              
                            {/* Legend area */}
              {renderSimpleLegend(result, planarArrayType, planarNumElemRaw, planarElementSpacing, planarRadiusRaw, planarCutAngle, result.theta && result.pattern)}
      </div>
      
            
        </>
              ) : planarPlotType === 'manifold' ? (
          <>
            {/* Main results area with plot and legend */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
              {/* Plot area */}
              <div className="plot-container" style={{ flex: '0 0 55%', minWidth: 400, maxWidth: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0 }}>
            <Plot
                  key={`manifold-${planarPlotType}`}
                  data={[{
                  x: result.manifold_x,
                  y: result.manifold_y,
                  type: 'scatter',
                  mode: 'markers',
                  name: 'Array Elements',
                    marker: { color: 'red', symbol: 'x', size: 10 },
                  }]}
              layout={{
                    width: undefined,
                    height: Math.round(600 * (2/3)), // 2:3 aspect ratio (400px)
                margin: { l: 50, r: 20, t: 30, b: 50 },
                    title: { text: 'Array Manifold', font: { size: 16 } },
                xaxis: {
                      title: { text: 'X Position (λ)', font: { size: 14 } },
                  showgrid: true,
                  zeroline: true,
                  scaleanchor: 'y',
                  scaleratio: 1,
                  constrain: 'domain',
                },
                yaxis: {
                      title: { text: 'Y Position (λ)', font: { size: 14 } },
                  showgrid: true,
                  zeroline: true,
                  scaleanchor: 'x',
                  scaleratio: 1,
                  constrain: 'domain',
                },
                plot_bgcolor: '#fff',
                paper_bgcolor: '#fff',
                    autosize: true,
              }}
                  config={{ responsive: true, displayModeBar: true }}
            />

            {/* Pattern parameters table */}
            {renderSimplePatternParams(result)}
              </div>
              
              {/* Legend area */}
              <div className="legend-container" style={{ flex: '0 0 20%', minWidth: 200, maxWidth: 350, maxHeight: 374, overflow: 'auto', background: '#fafbfc', borderRadius: 8, boxShadow: '0 1px 4px #eee', padding: 12, marginLeft: 8, alignSelf: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 15, margin: 0 }}>Current Analysis</h3>
                </div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 4 }}>Color</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>Type</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>N</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>Spacing</th>
                      <th style={{ textAlign: 'left', padding: 4 }}>Cut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Current trace only */}
                    {result && result.data_polar3d && (
                      <tr>
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
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : planarPlotType === 'polar3d' && result.data_polar3d ? (
          <>
            {/* Main results area with plot and legend */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
              {/* Plot area */}
              <div className="plot-container" style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0, flex: '0 0 55%', minWidth: 400, maxWidth: '100%' }}>
            {(() => {
              // Safety check for complete polar3d data structure
              if (!result.data_polar3d.array_x || !result.data_polar3d.array_y || !result.data_polar3d.x || !result.data_polar3d.y || !result.data_polar3d.z) {
                return <div>⏳ Loading 3D polar data...</div>;
              }
              
              return (
                <Plot
                  key={`3d-polar-${planarPlotType}`}
                  data={[
                    {
                      type: 'surface',
                      x: result.data_polar3d.x,
                      y: result.data_polar3d.y,
                      z: result.data_polar3d.z,
                      colorscale: 'Viridis',
                      opacity: 0.8,
                      showscale: true,
                      colorbar: { title: 'Gain (dB)' }
                    },
                    {
                      type: 'scatter3d',
                      x: result.data_polar3d.array_x,
                      y: result.data_polar3d.array_y,
                      z: Array(result.data_polar3d.array_x.length).fill(0),
                      mode: 'markers',
                      marker: { color: 'red', size: 3 },
                      name: 'Array Elements',
                      showlegend: false
                    }
                  ]}
                  layout={{
                    width: undefined,
                    height: Math.round(600 * (2/3)), // 2:3 aspect ratio (400px)
                    title: '3D Polar Array Pattern',
                    scene: {
                      camera: {
                        eye: { x: 1.5, y: 1.5, z: 1.5 }
                      },
                      xaxis: { title: {text:''}, showgrid: false, zeroline: false ,showticklabels: false},
                      yaxis: { title: {text:''}, showgrid: false, zeroline: false ,showticklabels: false},
                      zaxis: { title: {text:''}, showgrid: false, showline: false ,showticklabels: false}
                    },
                    margin: { l: 0, r: 0, t: 50, b: 0 },
                    autosize: true
                  }}
                  config={{ responsive: true, displayModeBar: true }}
                />
              );
            })()}
                
                {/* Pattern parameters table */}
                <div style={{ marginTop: 50, padding: '0 16px 16px 16px' }}>
                  <h2>Pattern Parameters</h2>
                  <table style={{ borderCollapse: 'collapse', width: '100%', background: '#fff' }}>
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
                            <span style={{ display: 'inline-block', width: 16, height: 8, background: '#0074D9', borderRadius: 2, border: '1px solid #eee' }}></span>
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
              
              {/* Legend area */}
              {/* Legend area */}
              {renderSimpleLegend(result, planarArrayType, planarNumElemRaw, planarElementSpacing, planarRadiusRaw, planarCutAngle, result.data_polar3d)}
            </div>
          </>
        ) : planarPlotType === 'contour' && result.data_contour ? (
          <>
            {/* Main results area with plot and legend */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
              {/* Plot area */}
              <div className="plot-container" style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0, flex: '0 0 55%', minWidth: 400, maxWidth: '100%' }}>
            {(() => {
              // Debug: Log the data structure
              // console.log('Contour data:', result.data);
              const contourData = result.data_contour;
              
              // Check if data exists and has the right structure
              if (!contourData.theta || !contourData.phi || !contourData.intensity) {
                return <div>❌ Invalid contour data structure</div>;
              }
              
              // Data is now clean 1D vectors + 2D intensity matrix
              const x = contourData.phi;      // 1D phi vector
              const y = contourData.theta;    // 1D theta vector
              const z = contourData.intensity; // 2D intensity matrix
              
              // Transpose Z matrix to match Plotly's expected format
              const zTransposed = z[0].map((_, colIndex) => z.map(row => row[colIndex]));
              
              
              return (
                <Plot
                  key={`contour-${planarPlotType}`}
                  data={[{
                    type: 'contour',
                    x: x,
                    y: y,
                    z: zTransposed,
                    colorscale: 'Hot',
                    contours: {
                      coloring: 'heatmap',
                      showlabels: true
                    },
                    colorbar: {
                      title: 'Gain (dB)',
                      titleside: 'right'
                    },
                    zmin: contourData.peak - contourData.g_range,
                    zmax: contourData.peak
                  }]}
                  layout={{
                    width: undefined,
                    height: Math.round(600 * (2/3)), // 2:3 aspect ratio (400px)
                    title: 'Antenna Array Pattern Contour',
                    xaxis: {
                      title: 'φ (degrees)',
                      range: [-180, 180],
                      type: 'linear',
                      autorange: false,
                      constrain: 'domain',
                      tickmode: 'array',
                      tickvals: [-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180],
                      ticktext: ['-180°', '-150°', '-120°', '-90°', '-60°', '-30°', '0°', '30°', '60°', '90°', '120°', '150°', '180°']
                    },
                    yaxis: {
                      title: 'θ (degrees)',
                      range: [0, 180],
                      type: 'linear',
                      autorange: false,
                      constrain: 'domain',
                      tickmode: 'array',
                      tickvals: [0, 30, 60, 90, 120, 150, 180],
                      ticktext: ['0°', '30°', '60°', '90°', '120°', '150°', '180°']
                    },
                    plot_bgcolor: '#fff',
                    paper_bgcolor: '#fff',
                    autosize: true
                  }}
                  config={{ responsive: true, displayModeBar: true }}
                />
              );
            })()}
                
                {/* Pattern parameters table */}
                {renderSimplePatternParams(result)}
              </div>
              
                            {/* Legend area */}
              {renderSimpleLegend(result, planarArrayType, planarNumElemRaw, planarElementSpacing, planarRadiusRaw, planarCutAngle, result.data_contour)}
            </div>
          </>
        ) : planarPlotType === 'polarsurf' && result.plot ? (
          <>
            {/* Main results area with plot and legend */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
              {/* Plot area */}
              <div className="plot-container" style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: 0, flex: '0 0 55%', minWidth: 400, maxWidth: '100%' }}>
            <img 
              src={`data:image/png;base64,${result.plot}`} 
              alt="Polar Surface Pattern"
                  style={{ 
                    width: '100%', 
                    maxWidth: '800px', 
                    height: 'auto', 
                    objectFit: 'contain',
                    aspectRatio: '3/2' // Maintain 2:3 aspect ratio
                  }}
                />
                
                {/* Pattern parameters table */}
                {renderSimplePatternParams(result)}
              </div>
              
              {/* Legend area */}
              {renderSimpleLegend(result, planarArrayType, planarNumElemRaw, planarElementSpacing, planarRadiusRaw, planarCutAngle, result.plot)}
            </div>
        </>
        ) : null}
      

    </div>
  );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8f9fa',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: 32,
        color: '#333'
      }}>
        <h1 style={{ 
          fontSize: 'clamp(2rem, 5vw, 3rem)', 
          margin: 0, 
          fontWeight: 700
        }}>
          Antenna Array Analysis
        </h1>
        <p style={{ 
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', 
          margin: '8px 0 0 0', 
          opacity: 0.7,
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {/* Analyze linear and planar antenna arrays with real-time visualization */}
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: 24,
        gap: 8
      }}>
          <button
            onClick={() => setActiveTab('linear')}
            style={{
            background: activeTab === 'linear' ? '#0074D9' : '#e9ecef',
            color: activeTab === 'linear' ? 'white' : '#495057',
              border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 'clamp(0.9rem, 2vw, 1rem)',
            fontWeight: 600,
              cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '120px'
            }}
          onMouseOver={e => e.currentTarget.style.background = activeTab === 'linear' ? '#005fa3' : '#dee2e6'}
          onMouseOut={e => e.currentTarget.style.background = activeTab === 'linear' ? '#0074D9' : '#e9ecef'}
          >
            Linear Array
          </button>
          <button
            onClick={() => setActiveTab('planar')}
            style={{
            background: activeTab === 'planar' ? '#0074D9' : '#e9ecef',
            color: activeTab === 'planar' ? 'white' : '#495057',
              border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            fontSize: 'clamp(0.9rem, 2vw, 1rem)',
            fontWeight: 600,
              cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '120px'
            }}
          onMouseOver={e => e.currentTarget.style.background = activeTab === 'planar' ? '#005fa3' : '#dee2e6'}
          onMouseOut={e => e.currentTarget.style.background = activeTab === 'planar' ? '#0074D9' : '#e9ecef'}
          >
            Planar Array
          </button>
      </div>
      
      {/* Main Content */}
      <div style={{ 
        display: 'flex', 
        gap: 24,
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
      }}>
        {/* Left side - Form */}
        <div className="form-container" style={{ 
          flex: window.innerWidth <= 768 ? 'none' : '0 0 25%',
          width: window.innerWidth <= 768 ? '100%' : 'auto',
          minWidth: window.innerWidth <= 768 ? 'auto' : '300px',
          maxWidth: window.innerWidth <= 768 ? 'auto' : '450px'
        }}>
          {activeTab === 'linear' ? (
            <LinearArrayForm
              numElem={numElem}
              setNumElem={setNumElem}
              elementSpacing={elementSpacing}
              setElementSpacing={setElementSpacing}
              scanAngle={scanAngle}
              setScanAngle={setScanAngle}
              elementPattern={elementPattern}
              setElementPattern={setElementPattern}
              elementGain={elementGain}
              setElementGain={setElementGain}
              plotType={plotType}
              setPlotType={setPlotType}
              window={window}
              setWindow={setWindow}
              SLL={SLL}
              setSLL={setSLL}
              windowType={windowType}
              setWindowType={setWindowType}
              realtime={realtime}
              setRealtime={setRealtime}
              handleLinearInputChange={handleLinearInputChange}
              handleIntegerInputChange={handleIntegerInputChange}
              handleSubmit={handleSubmit}
              loading={loading}
              windowOptions={windowOptions}
            />
          ) : (
            <PlanarArrayForm
              arrayType={planarArrayType}
              setArrayType={setPlanarArrayType}
              scanAngle={planarScanAngle}
              setScanAngle={setPlanarScanAngle}
              numElem={planarNumElem}
              setNumElem={setPlanarNumElem}
              elementSpacing={planarElementSpacing}
              setElementSpacing={setPlanarElementSpacing}
              radius={planarRadiusRaw}
              setRadius={setPlanarRadiusRaw}
              plotType={planarPlotType}
              setPlotType={setPlanarPlotType}
              cutAngle={planarCutAngle}
              setCutAngle={setPlanarCutAngle}
              realtime={realtime}
              setRealtime={setRealtime}
              handlePlanarInputChange={handlePlanarInputChange}
              handlePlanarIntegerInputChange={handlePlanarIntegerInputChange}
              handlePlanarSubmit={handleSubmit}
              loading={loading}
              windowType={planarWindowType}
              setWindowType={setPlanarWindowType}
              window={planarWindow}
              setWindow={setPlanarWindow}
              windowOptions={windowOptions}
              SLL={planarSLL}
              setSLL={setPlanarSLL}
              elementPattern={planarElementPattern}
              setElementPattern={setPlanarElementPattern}
              numElemRaw={planarNumElemRaw}
              setNumElemRaw={setPlanarNumElemRaw}
              radiusRaw={planarRadiusRaw}
              setRadiusRaw={setPlanarRadiusRaw}
            />
          )}
        </div>

        {/* Right side - Results and legend table */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          gap: 24,
          flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
        }}>
        <div style={{ flex: 1 }}>
            {error && (
              <div style={{ 
                color: '#d32f2f', 
                marginBottom: 16, 
                padding: 12, 
                background: '#ffebee', 
                borderRadius: 8, 
                border: '1px solid #ffcdd2',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}
          {result && (activeTab === 'linear' ? renderLinearArrayResults() : renderPlanarArrayResults())}
          </div>
        </div>
      </div>

      {/* Feedback Button */}
      <div style={{
        position: 'fixed',
        top: window.innerWidth <= 768 ? 'auto' : 24,
        bottom: window.innerWidth <= 768 ? 24 : 'auto',
        right: window.innerWidth <= 768 ? 24 : 32,
        zIndex: 1000
      }}>
        <a
          href="https://forms.gle/wVhn4PmyDMxEJcD67"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: 'clamp(8px, 2vw, 10px) clamp(16px, 3vw, 22px)',
            background: '#0074D9',
            color: 'white',
            borderRadius: '6px',
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            fontSize: 'clamp(14px, 2.5vw, 16px)',
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