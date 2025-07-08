# Antenna Array Analysis Tool

A web-based tool for interactive analysis and visualization of linear and planar antenna arrays. The frontend is built with React, and the backend uses Flask for fast numerical computations and plotting.

## Features

- **Linear and Planar Array Analysis**
- Interactive parameter controls (number of elements, spacing, scan angle, window/tapering, element pattern, etc.)
- Real-time pattern updates and trace comparison
- 2D and 3D pattern visualization (Plotly for 3D polar, matplotlib for others)
- Array manifold visualization
- Pattern parameter table (gain, SLL, HPBW, etc.)
- Keep/Clear traces, legend, and trace management
- Responsive, modern UI

## Project Structure

```
webapp_test/
  backend/      # Flask backend (API, computation, plotting)
  frontend/     # React frontend (UI, visualization)
```

## Getting Started

### Backend (Flask)

1. **Install dependencies:**
   ```sh
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Run the backend server:**
   ```sh
   flask run
   # or
   python app.py
   ```
   The API will be available at `http://127.0.0.1:5000/`.

### Frontend (React)

1. **Install dependencies:**
   ```sh
   cd frontend
   npm install
   ```
2. **Run the frontend app:**
   ```sh
   npm start
   ```
   The app will be available at `http://localhost:3000/`.

## Usage

- Open the frontend in your browser.
- Select Linear or Planar Array tab.
- Adjust parameters and see plots update in real time.
- Use trace management features to compare different configurations.
- For 3D polar plots, enjoy full interactivity with Plotly.

## Development & Contribution

- Fork and clone the repository.
- Use feature branches for new work.
- Submit pull requests for review.
- Please add clear commit messages and update documentation as needed.

## License

[MIT](LICENSE) 