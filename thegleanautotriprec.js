// ================================
// 1. Variables
// ================================

const openCageApiKey = '8d515bf9fd3f4663a42aabb9a10c4341'; 
const destinationsList = [
  { name: "Niagara Falls", coords: { lat: 43.060001, lng: -79.106667 } },
  { name: "Eaton Centre", coords: { lat: 43.654434, lng: -79.380852 } },
  { name: "Blue Mountain", coords: { lat: 44.501041, lng: -80.316208 } },
  { name: "CN Tower", coords: { lat: 43.642567, lng: -79.387054 } },
  { name: "Royal Ontario Museum", coords: { lat: 43.667679, lng: -79.394809 } },
  { name: "Ripley's Aquarium", coords: { lat: 43.642481, lng: -79.38605 } },
  { name: "Woodbine Beach", coords: { lat: 43.662247, lng: -79.308945 } },
  { name: "Art Gallery of Ontario", coords: { lat: 43.653603, lng: -79.392639 } },
  { name: "Toronto Zoo", coords: { lat: 43.817699, lng: -79.1858904 } },
  { name: "Canada's Wonderland", coords: { lat: 43.84167, lng: -79.54306 } },
  { name: "Rouge National Park", coords: { lat: 43.789969, lng: -79.121698 } }
];

let map;
let directionsService;
let directionsRenderer;
let slideIndex = 0;
let slideTimer;

// ================================
// 2. Functions
// ================================

function loadGoogleMapsApi() {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
  script.defer = true;
  script.async = true;
  document.head.appendChild(script);
}

function showSlides(n) {
  const slides = document.getElementsByClassName("slide");

  if (n >= slides.length) { slideIndex = 0; }
  if (n < 0) { slideIndex = slides.length - 1; }

  for (let i = 0; i < slides.length; i++) {
    slides[i].classList.remove('active');
  }

  slides[slideIndex].classList.add('active');
}

function nextSlide() {
  showSlides(++slideIndex);
}

function prevSlide() {
  showSlides(--slideIndex);
}

function resetTimer() {
  clearInterval(slideTimer);
  slideTimer = setInterval(nextSlide, 5000);
}

document.querySelector(".prev").addEventListener('click', () => {
  prevSlide();
  resetTimer();
});

document.querySelector(".next").addEventListener('click', () => {
  nextSlide();
  resetTimer();
});

document.addEventListener('DOMContentLoaded', () => {
  showSlides(slideIndex);
  slideTimer = setInterval(nextSlide, 5000);
});



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
  const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=8d515bf9fd3f4663a42aabb9a10c4341`);
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

let useOptimizedRoute = true; // Default: Fastest

document.getElementById('toggleOptimization').addEventListener('change', () => {
  useOptimizedRoute = !useOptimizedRoute;
  
  const modeLabel = document.getElementById('toggleModeLabel');
  if (useOptimizedRoute) {
    modeLabel.textContent = 'Mode: Fastest Route';
  } else {
    modeLabel.textContent = 'Mode: User Order';
  }
});

async function calculateRoute(event) {
  event.preventDefault();
  
  if (useOptimizedRoute) {
    await calculateOptimizedRoute();
  } else {
    await calculateUserOrderedRoute();
  }
}

async function calculateOptimizedRoute() {
  const address = document.getElementById('address').value;
  const postal = document.getElementById('postal').value;
  const selectedItems = document.querySelectorAll('.destination-item.selected');

  if (selectedItems.length === 0) {
    alert('Please select at least one destination!');
    return;
  }

  const startCoords = await geocodeAddress(`${address}, ${postal}, Ontario, Canada`);

  const waypoints = Array.from(selectedItems).map(item => ({
    location: new google.maps.LatLng(item.dataset.lat, item.dataset.lng),
    stopover: true
  }));

  const tempRequest = {
    origin: startCoords,
    destination: startCoords,
    waypoints: waypoints,
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: true 
  };

  directionsService.route(tempRequest, (response, status) => {
    if (status === 'OK') {
      const optimizedOrder = response.routes[0].waypoint_order;

      const reorderedWaypoints = optimizedOrder.map(i => waypoints[i]);

      const lastWaypoint = reorderedWaypoints.pop();
      const lastWaypointLocation = lastWaypoint.location;

      const finalRequest = {
        origin: startCoords,
        destination: lastWaypointLocation,
        waypoints: reorderedWaypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
      };

      directionsService.route(finalRequest, (newResponse, newStatus) => {
        if (newStatus === 'OK') {
          directionsRenderer.setDirections(newResponse);
          displayRouteDetails(newResponse);
        } else {
          alert('Directions re-request failed: ' + newStatus);
        }
      });

    } else {
      alert('Directions request failed: ' + status);
    }
  });
}


async function calculateUserOrderedRoute() {
  const address = document.getElementById('address').value;
  const postal = document.getElementById('postal').value;
  const selectedItems = document.querySelectorAll('.destination-item.selected');

  if (selectedItems.length === 0) {
    alert('Please select at least one destination!');
    return;
  }

  const startCoords = await geocodeAddress(`${address}, ${postal}, Ontario, Canada`);

  const orderedWaypoints = Array.from(selectedItems).map(item => ({
    location: new google.maps.LatLng(item.dataset.lat, item.dataset.lng),
    stopover: true
  }));

  const request = {
    origin: startCoords,
    destination: orderedWaypoints[orderedWaypoints.length - 1].location,
    waypoints: orderedWaypoints.slice(0, -1),
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: false
  };

  directionsService.route(request, (response, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(response);
      displayRouteDetails(response);
    } else {
      alert('Directions request failed: ' + status);
    }
  });
}

function displayRouteDetails(response) {
  let totalDistance = 0;
  let totalDuration = 0;
  let timeUnits = "";
  const route = response.routes[0];

  route.legs.forEach(leg => {
    totalDistance += leg.distance.value;
    totalDuration += leg.duration.value;
  });

  totalDistance /= 1000;
  if (totalDuration >=3600) {
    totalDuration /= 3600;
    timeUnits = "hours";
  }
  else if (totalDuration <3600){
    totalDuration /= 60;
    timeUnits = "minutes";
  }

  document.getElementById('output').innerHTML = `
    <p><strong>Total Distance:</strong> ${totalDistance.toFixed(2)} km</p>
    <p><strong>Total Time:</strong> ${totalDuration.toFixed(2)} ${timeUnits}</p>
    <details>
      <summary>Step-by-Step Directions</summary>
      <ol>
        ${route.legs.map(leg =>
          leg.steps.map(step => `<li>${step.instructions}</li>`).join('')
        ).join('')}
      </ol>
    </details>
  `;
}




function addCustomDestination() {
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
}

function printDirections() {
  const content = document.getElementById('output').innerHTML;
  const win = window.open('', '', 'width=800,height=600');
  win.document.write('<html><head><title>Print Directions</title></head><body>');
  win.document.write(content);
  win.document.close();
  win.print();
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 43.7, lng: -79.4 },
    zoom: 8
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
}

loadGoogleMapsApi();
// ================================
// 3. Event Listeners
// ================================

document.getElementById('locationForm').addEventListener('submit', calculateRoute);
document.getElementById('addCustom').addEventListener('click', addCustomDestination);
document.getElementById('printBtn').addEventListener('click', printDirections);

// ================================
// 4. Initialization
// ================================

document.addEventListener('DOMContentLoaded', () => {
  destinationsList.forEach(destination => {
    const li = createDestinationItem(destination.name, destination.coords);
    document.getElementById('destinations').appendChild(li);
  });

  Sortable.create(document.getElementById('destinations'), {
    animation: 150
  });

});
