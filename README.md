# UNP Organization Platform – React Demo

Converted from the supplied single-file HTML demo into a simple React + Vite project.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Structure
```text
unp-react/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx          # React application and UI logic
    ├── components/      # Reserved for reusable components
    ├── pages/           # Reserved for page-level components
    ├── data/            # Reserved for API/demo data modules
    └── styles/
        └── app.css      # Main styling and responsive layout
```

## Included
- Dashboard
- Province → District → Local Authority navigation
- Schematic Sri Lanka map
- People directory and search
- Add / Assign person form
- Assignment preview and save behavior
- Person details drawer
- Remove person demo action
- Responsive mobile bottom navigation
- Demo-only in-memory data
- Original green/gold visual direction

## Boundary data
The province map uses GeoBoundaries open ADM1 boundaries for Sri Lanka, based on OpenStreetMap and Wambacher source data. The dataset is licensed under the Open Data Commons Open Database License (ODbL 1.0).

- GeoBoundaries record: https://www.geoboundaries.org/api/current/gbOpen/LKA/ADM1/
- Source attribution: OpenStreetMap contributors and Wambacher
