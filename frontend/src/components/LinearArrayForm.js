import React from 'react';

const LinearArrayForm = ({
  numElem,
  setNumElem,
  elementSpacing,
  setElementSpacing,
  scanAngle,
  setScanAngle,
  elementPattern,
  setElementPattern,
  elementGain,
  setElementGain,
  plotType,
  setPlotType,
  window,
  setWindow,
  SLL,
  setSLL,
  windowType,
  setWindowType,
  realtime,
  setRealtime,
  handleLinearInputChange,
  handleIntegerInputChange,
  handleSubmit,
  loading,
  windowOptions
}) => {
  return (
    <form onSubmit={handleSubmit} aria-labelledby="linear-array-title">
      <h2 id="linear-array-title">Linear Array Analysis</h2>
      
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="num-elem">
          Number of Elements:
          <input
            id="num-elem"
            type="number"
            step="1"
            min="1"
            max="1000"
            value={numElem}
            onChange={e => handleIntegerInputChange(e.target.value, setNumElem)}
            required
            style={{ width: 80, marginLeft: 8 }}
            aria-describedby="num-elem-help"
          />
        </label>
        <div id="num-elem-help" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Enter a whole number between 1 and 1000
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="element-spacing">
          Element Spacing (λ):
          <input
            id="element-spacing"
            type="number"
            step="0.01"
            min="0.1"
            value={elementSpacing}
            onChange={e => {
              const inputValue = e.target.value;
              // Allow empty string, decimal point, and partial decimal inputs
              if (inputValue === '' || inputValue === '.' || inputValue === '0.' || inputValue === '0') {
                handleLinearInputChange(() => setElementSpacing(inputValue));
              } else {
                const value = parseFloat(inputValue);
                if (!isNaN(value) && value >= 0.1) {
                  handleLinearInputChange(() => setElementSpacing(inputValue));
                }
              }
            }}
            required
            style={{ width: 200, marginLeft: 8 }}
            aria-describedby="element-spacing-help"
          />
        </label>
        <div id="element-spacing-help" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Spacing in wavelengths (minimum 0.1λ)
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="scan-angle">
          Scan Angle (deg):
          <input
            id="scan-angle"
            type="number"
            step="1"
            min="-90"
            max="90"
            value={scanAngle}
            onChange={e => handleLinearInputChange(() => setScanAngle(e.target.value))}
            required
            style={{ width: 80, marginLeft: 8 }}
            aria-describedby="scan-angle-help"
          />
        </label>
        <div id="scan-angle-help" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Beam scan angle from -90° to 90°
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="plot-type">
          Plot Type:
          <select 
            id="plot-type"
            value={plotType} 
            onChange={e => handleLinearInputChange(() => setPlotType(e.target.value))} 
            style={{ width: 150, marginLeft: 8 }}
          >
            <option value="cartesian">Cartesian</option>
            <option value="polar">Polar</option>
          </select>
        </label>
      </div>

      <fieldset style={{ marginBottom: 16, border: '1px solid #ccc', padding: 12, borderRadius: 4 }}>
        <legend>Amplitude Tapering</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label>
            <input
              type="radio"
              name="windowType"
              value="window" 
              checked={windowType === 'window'} 
              onChange={e => handleLinearInputChange(() => setWindowType(e.target.value))} 
            />
            Pre-defined Window 
          </label>
          <label>
            <input
              type="radio"
              name="windowType"
              value="SLL" 
              checked={windowType === 'SLL'} 
              onChange={e => handleLinearInputChange(() => setWindowType(e.target.value))} 
            />
            Set SLL
          </label>
        </div>
        
        {windowType === 'window' && (
          <div style={{ marginTop: 12, marginLeft: 20 }}>
            <label htmlFor="window-function">
              Window Function:
              <select 
                id="window-function"
                value={window} 
                onChange={e => handleLinearInputChange(() => setWindow(e.target.value))} 
                style={{ width: 150, marginLeft: 8 }}
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
            <label htmlFor="sll-value">
              SLL (dB):
              <select
                id="sll-value"
                value={SLL} 
                onChange={e => handleLinearInputChange(() => setSLL(parseInt(e.target.value)))} 
                style={{ width: 100, marginLeft: 8 }} 
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
            onChange={e => handleLinearInputChange(() => setElementPattern(e.target.checked))} 
          />
          Element Pattern (cosine)
        </label>
      </div>



      {elementPattern && (
        <div style={{ marginBottom: 16, marginLeft: 20 }}>
          <label htmlFor="element-gain">
            Element Gain (dB):
            <input
              id="element-gain"
              type="number"
              step="1"
              value={elementGain}
              onChange={e => handleLinearInputChange(() => setElementGain(e.target.value))}
              disabled={!elementPattern}
              style={{ width: 80, marginLeft: 8 }}
            />
          </label>
        </div>
      )}

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
        aria-describedby={realtime ? "realtime-active" : undefined}
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
        <div id="realtime-active" style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Analysis runs automatically when realtime is enabled
        </div>
      )}
    </form>
  );
};

export default LinearArrayForm; 