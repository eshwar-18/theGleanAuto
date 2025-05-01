
// Variables

const openCageApiKey = '8d515bf9fd3f4663a42aabb9a10c4341'; 
const orsApiKey = CONFIG.ORS_API_KEY;
const destinationsList = [
  { name: "Niagara Falls", coords: { lat: 43.0896, lng: -79.0849 } },
  { name: "Eaton Centre", coords: { lat: 43.6544, lng: -79.3807 } },
  { name: "Blue Mountain", coords: { lat: 44.5001, lng: -80.3036 } },
  { name: "CN Tower", coords: { lat: 43.6426, lng: -79.3871 } },
  { name: "Royal Ontario Museum", coords: { lat: 43.6677, lng: -79.3948 } },
  { name: "Ripley's Aquarium", coords: { lat: 43.6424, lng: -79.3860 } },
  { name: "Woodbine Beach", coords: { lat: 43.6635, lng: -79.3082 } },
  { name: "Art Gallery of Ontario", coords: { lat: 43.6536, lng: -79.3925 } },
  { name: "Toronto Zoo", coords: { lat: 43.8177, lng: -79.1859 } },
  { name: "Canada's Wonderland", coords: { lat: 43.8430, lng: -79.5393 } },
  { name: "Rouge National Park", coords: { lat: 43.8062, lng: -79.1745 } }
];

let map;
let routeLayer;
let markerGroup;

// Functions

function initMap() {
  map = L.map('map').setView([43.7, -79.4], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function createDestinationItem(name, coords) {
  const li = document.createElement('li');
  li.textContent = name;
  li.dataset.lat = coords.lat;
  li.dataset.lng = coords.lng;
  li.classList.add('destination-item');
  li.addEventListener('click', () => {
    li.classList.toggle('selected');
  });
  return li;
}

async function geocodeAddress(address) {
  const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${openCageApiKey}`);
  const data = await response.json();
  if (data.results.length > 0) {
    return {
      lat: data.results[0].geometry.lat,
      lng: data.results[0].geometry.lng
    };
  } else {
    throw new Error('Address not found');
  }
}

async function calculateRoute(event) {
  event.preventDefault();

  const address = document.getElementById('address').value;
  const postal = document.getElementById('postal').value;
  const selectedItems = Array.from(document.querySelectorAll('.destination-item.selected'));

  document.querySelectorAll('.destination-item .route-label').forEach(el => el.remove());

  selectedItems.forEach((item, index) => {
    const labelSpan = document.createElement('span');
    labelSpan.className = 'route-label';
    labelSpan.textContent = String.fromCharCode(66 + index);
    item.appendChild(labelSpan);
  });

  if (selectedItems.length === 0) {
    alert('Please select at least one destination!');
    return;
  }

  const startCoords = await geocodeAddress(`${address}, ${postal}, Ontario, Canada`);

  const coordsList = [
    [startCoords.lng, startCoords.lat],
    ...selectedItems.map(item => [
      parseFloat(item.dataset.lng),
      parseFloat(item.dataset.lat)
    ])
  ];

  if (routeLayer) map.removeLayer(routeLayer);
  if (markerGroup) map.removeLayer(markerGroup);

  const body = {
    coordinates: coordsList,
    format: 'geojson',
    instructions: true
  };

  try {
    const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: orsApiKey
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error("ORS request failed");

    const data = await res.json();

    routeLayer = L.geoJSON(data, {
      style: { color: '#1f78d1', weight: 5, opacity: 0.8 }
    }).addTo(map);

    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    markerGroup = L.layerGroup().addTo(map);
    coordsList.forEach(([lng, lat], index) => {
      const label = labels[index % labels.length];
      L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'marker-with-label',
          html: `
            <div class="marker-label" style="font-weight:bold; font-size:14px; margin-bottom:2px;">${label}</div>
            <div class="marker-dot" style="width:10px; height:10px; background:#1f78d1; border-radius:50%;"></div>
          `,
          iconAnchor: [10, 20]
        })
      }).addTo(markerGroup);
    });

    map.fitBounds(routeLayer.getBounds());

    const steps = data.features[0].properties.segments[0].steps;
    const totalDistance = data.features[0].properties.summary.distance / 1000;
    const totalTime = data.features[0].properties.summary.duration / 60;

    const output = document.getElementById('output');
    output.innerHTML = '';

    const distanceEl = document.createElement('p');
    distanceEl.innerHTML = `<strong>Total Distance:</strong> ${totalDistance.toFixed(2)} km`;

    const timeEl = document.createElement('p');
    timeEl.innerHTML = `<strong>Total Time:</strong> ${totalTime.toFixed(2)} minutes`;

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Step-by-Step Directions';
    details.appendChild(summary);

    const ol = document.createElement('ol');
    steps.forEach(step => {
      const li = document.createElement('li');
      li.innerHTML = step.instruction;
      ol.appendChild(li);
    });

    details.appendChild(ol);
    output.appendChild(distanceEl);
    output.appendChild(timeEl);
    output.appendChild(details);

    window.latestDirectionsHTML = ol.outerHTML;

  } catch (err) {
    console.error("ORS fetch failed:", err);
    alert("Failed to fetch route. Check API key or coordinates.");
  }
}

// Event Listeners

document.getElementById('locationForm').addEventListener('submit', calculateRoute);

document.getElementById('addCustom').addEventListener('click', () => {
  const name = document.getElementById('customName').value;
  const address = document.getElementById('customAddress').value;
  if (!name || !address) {
    alert('Please fill out both fields.');
    return;
  }
  geocodeAddress(address + ', Ontario, Canada')
    .then(coords => {
      const li = createDestinationItem(name, coords);
      li.classList.add('selected');
      document.getElementById('destinations').appendChild(li);
    })
    .catch(error => alert(error.message));
  document.getElementById('customName').value = '';
  document.getElementById('customAddress').value = '';
});

document.getElementById('printBtn').addEventListener('click', () => {
  const win = window.open('', '', 'width=800,height=600');
  win.document.write('<html><head><title>Print Directions</title></head><body>');
  win.document.write('<h2>Step-by-Step Directions</h2>');
  win.document.write(window.latestDirectionsHTML || 'No directions available.');
  win.document.write('</body></html>');
  win.document.close();
  win.print();
});

document.addEventListener('DOMContentLoaded', () => {
  destinationsList.forEach(destination => {
    const li = createDestinationItem(destination.name, destination.coords);
    document.getElementById('destinations').appendChild(li);
  });
  Sortable.create(document.getElementById('destinations'), {
    animation: 150
  });
  initMap();
});
