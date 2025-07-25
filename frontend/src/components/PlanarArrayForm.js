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
  return (
    <form onSubmit={handlePlanarSubmit}>
      <h2>Planar Array Analysis</h2>
      
      <div style={{ marginBottom: 16 }}>
        <label>Array Type:&nbsp;
          <select value={arrayType} onChange={e => handlePlanarInputChange(() => setArrayType(e.target.value))} style={{ width: 150 }}>
            <option value="rect">Rectangular</option>
            <option value="tri">Triangular</option>
            <option value="circ">Circular</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Scan Angle:</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <label style={{ fontSize: 12 }}>
            Theta (deg):&nbsp;
            <input
              type="number"
              step="any"
              value={scanAngle[0]}
              onChange={e => handlePlanarInputChange(() => setScanAngle([e.target.value, scanAngle[1]]))}
              style={{ width: 60 }}
            />
          </label>
          <label style={{ fontSize: 12 }}>
            Phi (deg):&nbsp;
            <input
              type="number"
              step="any"
              value={scanAngle[1]}
              onChange={e => handlePlanarInputChange(() => setScanAngle([scanAngle[0], e.target.value]))}
              style={{ width: 60 }}
            />
          </label>
        </div>
      </div>

      {arrayType === 'rect' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label>Number of Elements (X, Y):&nbsp;
              <input
                type="number"
                min="1"
                max="100"
                value={numElem[0]}
                onChange={e => handlePlanarInputChange(() => setNumElem([e.target.value, numElem[1]]))}
                required
                style={{ width: 60, marginRight: 8 }}
              />
              <input
                type="number"
                min="1"
                max="100"
                value={numElem[1]}
                onChange={e => handlePlanarInputChange(() => setNumElem([numElem[0], e.target.value]))}
                required
                style={{ width: 60 }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Element Spacing (λ) (X, Y):&nbsp;
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={elementSpacing[0]}
                onChange={e => handlePlanarInputChange(() => setElementSpacing([e.target.value, elementSpacing[1]]))}
                required
                style={{ width: 60, marginRight: 8 }}
              />
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={elementSpacing[1]}
                onChange={e => handlePlanarInputChange(() => setElementSpacing([elementSpacing[0], e.target.value]))}
                required
                style={{ width: 60 }}
              />
            </label>
          </div>
        </>
      )}

      {arrayType === 'tri' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label>Number of Elements (X, Y):&nbsp;
              <input
                type="number"
                min="1"
                max="100"
                value={numElem[0]}
                onChange={e => handlePlanarInputChange(() => setNumElem([e.target.value, numElem[1]]))}
                required
                style={{ width: 60, marginRight: 8 }}
              />
              <input
                type="number"
                min="1"
                max="100"
                value={numElem[1]}
                onChange={e => handlePlanarInputChange(() => setNumElem([numElem[0], e.target.value]))}
                required
                style={{ width: 60 }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Element Spacing (λ) (X, Y):&nbsp;
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={elementSpacing[0]}
                onChange={e => handlePlanarInputChange(() => setElementSpacing([e.target.value, elementSpacing[1]]))}
                required
                style={{ width: 60, marginRight: 8 }}
              />
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={elementSpacing[1]}
                onChange={e => handlePlanarInputChange(() => setElementSpacing([elementSpacing[0], e.target.value]))}
                required
                style={{ width: 60 }}
              />
            </label>
          </div>
        </>
      )}

      {arrayType === 'circ' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label>Number of Elements per ring:</label>
            <div style={{ marginTop: 4 }}>
              <input 
                type="text" 
                value={numElemRaw} 
                onChange={e => handlePlanarInputChange(() => setNumElemRaw(e.target.value))} 
                placeholder="8, 16, 24"
                style={{ width: '100%' }} 
              />
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                Enter comma-separated positive integers (e.g., "8, 16, 24" for 3 rings)
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Ring Radii:</label>
            <div style={{ marginTop: 4 }}>
              <input 
                type="text" 
                value={radiusRaw} 
                onChange={e => handlePlanarInputChange(() => setRadiusRaw(e.target.value))} 
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
        <label>Plot Type:&nbsp;
          <select value={plotType} onChange={e => handlePlanarInputChange(() => setPlotType(e.target.value))} style={{ width: 150 }}>
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
          <label>Cut Angle (deg):&nbsp;
            <input
              type="number"
              step="1"
              min="0"
              max="360"
              value={cutAngle}
              onChange={e => handlePlanarInputChange(() => setCutAngle(e.target.value))}
              required
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
              checked={windowType === 'window'} 
              onChange={e => handlePlanarInputChange(() => setWindowType(e.target.value))} 
              disabled={arrayType === 'tri' || arrayType === 'circ'}
            />
            &nbsp;Window Function
          </label>
          <label style={{ display: 'block', marginBottom: 4 }}>
            <input 
              type="radio" 
              name="planarWindowType" 
              value="SLL" 
              checked={windowType === 'SLL'} 
              onChange={e => handlePlanarInputChange(() => setWindowType(e.target.value))} 
              disabled={arrayType === 'tri' || arrayType === 'circ'}
            />
            &nbsp;Set SLL
          </label>
        </div>
      </div>
      
      {windowType === 'window' && (
        <div style={{ marginBottom: 16, marginLeft: 20 }}>
          <label>Pre-defined Window:&nbsp;
            <select value={window} onChange={e => handlePlanarInputChange(() => setWindow(e.target.value))} style={{ width: 150 }} disabled={arrayType === 'tri' || arrayType === 'circ'}>
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
              onChange={e => handlePlanarInputChange(() => setSLL(e.target.value))} 
              style={{ width: 80 }} 
              disabled={arrayType === 'tri' || arrayType === 'circ'}
            />
          </label>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label>
          <input type="checkbox" checked={elementPattern} onChange={e => handlePlanarInputChange(() => setElementPattern(e.target.checked))} />
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
};

export default PlanarArrayForm; 