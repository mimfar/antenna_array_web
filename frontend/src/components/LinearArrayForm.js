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
  handleSubmit,
  loading,
  windowOptions
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <h2>Linear Array Analysis</h2>
      
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
        <label>Scan Angle (deg):&nbsp;
          <input
            type="number"
            step="1"
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
        <label>Plot Type:&nbsp;
          <select value={plotType} onChange={e => handleLinearInputChange(() => setPlotType(e.target.value))} style={{ width: 150 }}>
            <option value="cartesian">Cartesian</option>
            <option value="polar">Polar</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Tapering Method:&nbsp;
          <input
            type="radio"
            name="windowType"
            value="window" 
            checked={windowType === 'window'} 
            onChange={e => handleLinearInputChange(() => setWindowType(e.target.value))} 
          />
          &nbsp;Pre-defined Window 
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
              step="1"
              min="10"
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
      </div>

      {elementPattern && (
        <div style={{ marginBottom: 16, marginLeft: 20 }}>
          <label>Element Gain (dB):&nbsp;
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
      )}

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

export default LinearArrayForm; 