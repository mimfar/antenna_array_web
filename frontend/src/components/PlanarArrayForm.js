import React from 'react';

const PlanarArrayForm = ({
  arrayType,
  setArrayType,
  scanAngle,
  setScanAngle,
  numElem,
  setNumElem,
  elementSpacing,
  setElementSpacing,
  radius,
  setRadius,
  plotType,
  setPlotType,
  cutAngle,
  setCutAngle,
  realtime,
  setRealtime,
  handlePlanarInputChange,
  handlePlanarIntegerInputChange,
  handlePlanarSubmit,
  loading,
  windowType,
  setWindowType,
  window,
  setWindow,
  windowOptions,
  SLL,
  setSLL,
  elementPattern,
  setElementPattern,
  // Add the raw state variables for circular arrays
  numElemRaw,
  setNumElemRaw,
  radiusRaw,
  setRadiusRaw
}) => {
  // Calculate total elements for validation hints
  const getTotalElements = () => {
    if (arrayType === 'rect' || arrayType === 'tri') {
      return numElem[0] * numElem[1];
    } else if (arrayType === 'circ') {
      try {
        const elements = numElemRaw.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
        return elements.reduce((sum, n) => sum + n, 0);
      } catch {
        return 0;
      }
    }
    return 0;
  };

  const totalElements = getTotalElements();
  const maxElements = 1000; // Should match backend config
  const maxSpacing = 10.0; // Should match backend config
  return (
    <form onSubmit={handlePlanarSubmit} aria-labelledby="planar-array-title">
      <h2 id="planar-array-title">Planar Array Analysis</h2>
      
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="array-type">
          Array Type:
          <select 
            id="array-type"
            value={arrayType} 
            onChange={e => handlePlanarInputChange(() => setArrayType(e.target.value))} 
            style={{ width: 110, marginLeft: 8 }}
          >
            <option value="rect">Rectangular</option>
            <option value="tri">Triangular</option>
            <option value="circ">Circular</option>
          </select>
        </label>
      </div>



      {arrayType === 'rect' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="num-elem-rows">
              Number of Elements:
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <label style={{ fontSize: 12 }}>
                Rows:
                <input
                  id="num-elem-rows"
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={numElem[0]}
                  onChange={e => handlePlanarIntegerInputChange(e.target.value, 0, setNumElem)}
                  required
                  style={{ width: 60, marginLeft: 8 }}
                  aria-describedby="num-elem-help"
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Columns:
                <input
                  id="num-elem-cols"
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={numElem[1]}
                  onChange={e => handlePlanarIntegerInputChange(e.target.value, 1, setNumElem)}
                  required
                  style={{ width: 60, marginLeft: 8 }}
                  aria-describedby="num-elem-help"
                />
              </label>
            </div>
            <div id="num-elem-help" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Total elements: {totalElements} (max: {maxElements})
              {totalElements > maxElements && (
                <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                  {' '}⚠️ Exceeds limit
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="element-spacing-rows">
              Element Spacing:
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <label style={{ fontSize: 12 }}>
                Rows (λ):
                <input
                  id="element-spacing-rows"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max={maxSpacing}
                  value={elementSpacing[0]}
                  onChange={e => {
                    const inputValue = e.target.value;
                    // Allow empty string, decimal point, and partial decimal inputs
                    if (inputValue === '' || inputValue === '.' || inputValue === '0.' || inputValue === '0') {
                      handlePlanarInputChange(() => setElementSpacing([inputValue, elementSpacing[1]]));
                    } else {
                      const value = parseFloat(inputValue);
                      if (!isNaN(value) && value >= 0.1) {
                        handlePlanarInputChange(() => setElementSpacing([inputValue, elementSpacing[1]]));
                      }
                    }
                  }}
                  required
                  style={{ width: 60, marginLeft: 8 }}
                  aria-describedby="spacing-help"
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Columns (λ):
                <input
                  id="element-spacing-cols"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max={maxSpacing}
                  value={elementSpacing[1]}
                  onChange={e => {
                    const inputValue = e.target.value;
                    // Allow empty string, decimal point, and partial decimal inputs
                    if (inputValue === '' || inputValue === '.' || inputValue === '0.' || inputValue === '0') {
                      handlePlanarInputChange(() => setElementSpacing([elementSpacing[0], inputValue]));
                    } else {
                      const value = parseFloat(inputValue);
                      if (!isNaN(value) && value >= 0.1) {
                        handlePlanarInputChange(() => setElementSpacing([elementSpacing[0], inputValue]));
                      }
                    }
                  }}
                  required
                  style={{ width: 60, marginLeft: 8 }}
                  aria-describedby="spacing-help"
                />
              </label>
            </div>
            <div id="spacing-help" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Spacing range: 0.1 to {maxSpacing} wavelengths
              {(elementSpacing[0] > maxSpacing || elementSpacing[1] > maxSpacing) && (
                <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                  {' '}⚠️ Exceeds limit
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {arrayType === 'tri' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="num-elem-tri-rows">
              Number of Elements:
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <label style={{ fontSize: 12 }}>
                Rows:
                <input
                  id="num-elem-tri-rows"
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={numElem[0]}
                  onChange={e => handlePlanarIntegerInputChange(e.target.value, 0, setNumElem)}
                  required
                  style={{ width: 60, marginLeft: 8 }}
                  aria-describedby="num-elem-tri-help"
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Columns:
                <input
                  id="num-elem-tri-cols"
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={numElem[1]}
                  onChange={e => handlePlanarIntegerInputChange(e.target.value, 1, setNumElem)}
                  required
                  style={{ width: 60, marginLeft: 8 }}
                  aria-describedby="num-elem-tri-help"
                />
              </label>
            </div>
            <div id="num-elem-tri-help" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Total elements: {totalElements} (max: {maxElements})
              {totalElements > maxElements && (
                <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                  {' '}⚠️ Exceeds limit
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="element-spacing-tri-rows">
              Element Spacing:
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <label style={{ fontSize: 12 }}>
                Rows (λ):
                <input
                  id="element-spacing-tri-rows"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max={maxSpacing}
                  value={elementSpacing[0]}
                  onChange={e => {
                    const inputValue = e.target.value;
                    // Allow empty string, decimal point, and partial decimal inputs
                    if (inputValue === '' || inputValue === '.' || inputValue === '0.' || inputValue === '0') {
                      handlePlanarInputChange(() => setElementSpacing([inputValue, elementSpacing[1]]));
                    } else {
                      const value = parseFloat(inputValue);
                      if (!isNaN(value) && value >= 0.1) {
                        handlePlanarInputChange(() => setElementSpacing([inputValue, elementSpacing[1]]));
                      }
                    }
                  }}
                  required
                  style={{ width: 60, marginLeft: 8 }}
                  aria-describedby="spacing-tri-help"
                />
              </label>
              <label style={{ fontSize: 12 }}>
                Columns (λ):
                <input
                  id="element-spacing-tri-cols"
                  type="number"
                  step="0.01"
                  min="0.1"
                  max={maxSpacing}
                  value={elementSpacing[1]}
                  onChange={e => {
                    const inputValue = e.target.value;
                    // Allow empty string, decimal point, and partial decimal inputs
                    if (inputValue === '' || inputValue === '.' || inputValue === '0.' || inputValue === '0') {
                      handlePlanarInputChange(() => setElementSpacing([elementSpacing[0], inputValue]));
                    } else {
                      const value = parseFloat(inputValue);
                      if (!isNaN(value) && value >= 0.1) {
                        handlePlanarInputChange(() => setElementSpacing([elementSpacing[0], inputValue]));
                      }
                    }
                  }}
                  required
                  style={{ width: 60, marginLeft: 8 }}
                  aria-describedby="spacing-tri-help"
                />
              </label>
            </div>
            <div id="spacing-tri-help" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Spacing range: 0.1 to {maxSpacing} wavelengths
              {(elementSpacing[0] > maxSpacing || elementSpacing[1] > maxSpacing) && (
                <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                  {' '}⚠️ Exceeds limit
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {arrayType === 'circ' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="num-elem-circ">
              Number of Elements per ring:
            </label>
            <div style={{ marginTop: 4 }}>
              <input 
                id="num-elem-circ"
                type="text" 
                value={numElemRaw} 
                onChange={e => handlePlanarInputChange(() => setNumElemRaw(e.target.value))} 
                placeholder="8, 16, 24"
                style={{ width: '100%' }} 
                aria-describedby="num-elem-circ-help"
              />
              <div id="num-elem-circ-help" style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                Enter comma-separated positive integers (e.g., "8, 16, 24" for 3 rings)
                <br />
                Total elements: {totalElements} (max: {maxElements})
                {totalElements > maxElements && (
                  <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                    {' '}⚠️ Exceeds limit
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="radius-circ">
              Ring Radii:
            </label>
            <div style={{ marginTop: 4 }}>
              <input 
                id="radius-circ"
                type="text" 
                value={radiusRaw} 
                onChange={e => handlePlanarInputChange(() => setRadiusRaw(e.target.value))} 
                placeholder="0.5, 1.0, 1.5"
                style={{ width: '100%' }} 
                aria-describedby="radius-circ-help"
              />
              <div id="radius-circ-help" style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                Enter comma-separated positive numbers in wavelengths (e.g., "0.5, 1.0, 1.5")
                {(() => {
                  const numElemParts = numElemRaw.split(',').map(s => s.trim()).filter(s => s !== '');
                  const radiusParts = radiusRaw.split(',').map(s => s.trim()).filter(s => s !== '');
                  
                  // Show warning if either list is empty or if they have different lengths
                  if (numElemParts.length === 0 || radiusParts.length === 0) {
                    return (
                      <div style={{ color: '#f57c00', fontWeight: 'bold', marginTop: 4 }}>
                        ⚠️ Warning: Please complete both number of elements and radii lists
                      </div>
                    );
                  } else if (numElemParts.length !== radiusParts.length) {
                    return (
                      <div style={{ color: '#f57c00', fontWeight: 'bold', marginTop: 4 }}>
                        ⚠️ Warning: Number of elements ({numElemParts.length}) and radii ({radiusParts.length}) must have the same length
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="scan-angle-theta">
          Scan Angle:
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <label style={{ fontSize: 12 }}>
            Theta (deg):
            <input
              id="scan-angle-theta"
              type="number"
              step="any"
              min="-90"
              max="90"
              value={scanAngle[0]}
              onChange={e => {
                const inputValue = e.target.value;
                // Allow empty string, minus sign, and valid numbers
                if (inputValue === '' || inputValue === '-' || inputValue === '-.' || inputValue === '.') {
                  handlePlanarInputChange(() => setScanAngle([inputValue, scanAngle[1]]));
                } else {
                  const value = parseFloat(inputValue);
                  if (!isNaN(value) && value >= -90 && value <= 90) {
                    handlePlanarInputChange(() => setScanAngle([inputValue, scanAngle[1]]));
                  }
                }
              }}
              style={{ width: 60, marginLeft: 8 }}
              aria-describedby="scan-angle-help"
            />
          </label>
          <label style={{ fontSize: 12 }}>
            Phi (deg):
            <input
              id="scan-angle-phi"
              type="number"
              step="any"
              min="-360"
              max="360"
              value={scanAngle[1]}
              onChange={e => {
                const inputValue = e.target.value;
                // Allow empty string, minus sign, and valid numbers
                if (inputValue === '' || inputValue === '-' || inputValue === '-.' || inputValue === '.') {
                  handlePlanarInputChange(() => setScanAngle([scanAngle[0], inputValue]));
                } else {
                  const value = parseFloat(inputValue);
                  if (!isNaN(value) && value >= -360 && value <= 360) {
                    handlePlanarInputChange(() => setScanAngle([scanAngle[0], inputValue]));
                  }
                }
              }}
              style={{ width: 60, marginLeft: 8 }}
              aria-describedby="scan-angle-help"
            />
          </label>
        </div>
        <div id="scan-angle-help" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Elevation angle (-90° to 90°), Azimuth angle (-360° to 360°)
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="plot-type-planar">
          Plot Type:
          <select 
            id="plot-type-planar"
            value={plotType} 
            onChange={e => handlePlanarInputChange(() => setPlotType(e.target.value))} 
            style={{ width: 110, marginLeft: 8 }}
          >
            <option value="pattern_cut">Pattern Cut</option>
            <option value="manifold">Manifold</option>
            <option value="polar3d">3D Polar</option>
            <option value="contour">Contour</option>
            <option value="polarsurf">Polar Surface</option>
          </select>
        </label>
      </div>

      {plotType === 'pattern_cut' && (
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="cut-angle">
            Cut Angle (deg):
            <input
              id="cut-angle"
              type="number"
              step="1"
              min="-360"
              max="360"
              value={cutAngle}
              onChange={e => {
                const inputValue = e.target.value;
                // Allow empty string, minus sign, and valid numbers
                if (inputValue === '' || inputValue === '-' || inputValue === '-.' || inputValue === '.') {
                  handlePlanarInputChange(() => setCutAngle(inputValue));
                } else {
                  const value = parseFloat(inputValue);
                  if (!isNaN(value) && value >= -360 && value <= 360) {
                    handlePlanarInputChange(() => setCutAngle(inputValue));
                  }
                }
              }}
              required
              style={{ width: 60, marginLeft: 8 }}
              aria-describedby="cut-angle-help"
            />
          </label>
          <div id="cut-angle-help" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Azimuth cut angle: -360° to 360°
          </div>
        </div>
      )}

      <fieldset style={{ marginBottom: 16, border: '1px solid #ccc', padding: 12, borderRadius: 4 }}>
        <legend>Amplitude Tapering</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label>
            <input 
              type="radio" 
              name="planarWindowType" 
              value="window" 
              checked={windowType === 'window'} 
              onChange={e => handlePlanarInputChange(() => setWindowType(e.target.value))} 
              disabled={arrayType === 'tri' || arrayType === 'circ'}
            />
            Window Function
          </label>
          <label>
            <input 
              type="radio" 
              name="planarWindowType" 
              value="SLL" 
              checked={windowType === 'SLL'} 
              onChange={e => handlePlanarInputChange(() => setWindowType(e.target.value))} 
              disabled={arrayType === 'tri' || arrayType === 'circ'}
            />
            Set SLL
          </label>
        </div>
        
        {windowType === 'window' && (
          <div style={{ marginTop: 12, marginLeft: 20 }}>
            <label htmlFor="window-function-planar">
              Pre-defined Window:
              <select 
                id="window-function-planar"
                value={window} 
                onChange={e => handlePlanarInputChange(() => setWindow(e.target.value))} 
                style={{ width: 110, marginLeft: 8 }} 
                disabled={arrayType === 'tri' || arrayType === 'circ'}
              >
                <option value="">No Window</option>
                {windowOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        
        {windowType === 'SLL' && (
          <div style={{ marginTop: 12, marginLeft: 20 }}>
            <label htmlFor="sll-value-planar">
              SLL (dB):
              <select 
                id="sll-value-planar"
                value={SLL} 
                onChange={e => handlePlanarInputChange(() => setSLL(parseInt(e.target.value)))} 
                style={{ width: 100, marginLeft: 8 }} 
                disabled={arrayType === 'tri' || arrayType === 'circ'}
              >
                {Array.from({ length: 13 }, (_, i) => 20 + i * 5).map(value => (
                  <option key={value} value={value}>{value} dB</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </fieldset>

      <div style={{ marginBottom: 16 }}>
        <label>
          <input 
            type="checkbox" 
            checked={elementPattern} 
            onChange={e => handlePlanarInputChange(() => setElementPattern(e.target.checked))} 
          />
          Element Pattern (cosine)
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
          Realtime Analysis
        </label>
      </div>
      
      <button
        type="submit"
        disabled={realtime || loading}
        style={{
          background: realtime || loading ? '#ccc' : '#0074D9',
          color: realtime || loading ? '#888' : 'white',
          cursor: realtime || loading ? 'not-allowed' : 'pointer',
          border: 'none',
          borderRadius: 6,
          padding: '10px 22px',
          fontWeight: 600,
          fontSize: 16,
          marginTop: 8,
          minWidth: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}
        aria-describedby={realtime ? "realtime-active-planar" : undefined}
      >
        {loading && (
          <div style={{
            width: 16,
            height: 16,
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        )}
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
      {realtime && (
        <div id="realtime-active-planar" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Analysis runs automatically when realtime is enabled
        </div>
      )}
    </form>
  );
};

export default PlanarArrayForm; 