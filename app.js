// Globale Variablen
let map;
let markers = {};
let layers = {}; 
let selectedLat = 21.4225; // Mekka Start
let selectedLon = 39.8262;

window.addEventListener("load", () => {
    initMap();
    setupInputs();
    
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./service-worker.js");
    }

    // Start-Berechnung
    updateAll(true); 
});

function initMap() {
    // Zoom auf 2 (Weltansicht)
    map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite'
    }).addTo(map);

    // --- Ebenen für ALLE Farben (auch Rot!) ---
    layers.green = L.layerGroup().addTo(map);   // Auge (Grün)
    layers.magenta = L.layerGroup().addTo(map); // Möglich (Magenta)
    layers.blue = L.layerGroup().addTo(map);    // Teleskop (Blau)
    layers.red = L.layerGroup().addTo(map);     // Unsichtbar (Rot)

    map.on('click', (e) => {
        selectedLat = e.latlng.lat;
        selectedLon = e.latlng.lng;
        document.getElementById("locationName").innerText = "Markierter Ort";
        updateAll(false); 
    });
}

function setupInputs() {
    const now = new Date();
    // Trick für lokale Zeit im Input-Feld
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
    document.getElementById("dateInput").value = localIso;

    // Bei neuem Datum -> Karte neu berechnen
    document.getElementById("dateInput").addEventListener("change", () => updateAll(true));

    // Suche
    document.getElementById("citySearch").addEventListener("change", async function() {
        const query = this.value;
        if (!query) return;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.length > 0) {
                selectedLat = parseFloat(data[0].lat);
                selectedLon = parseFloat(data[0].lon);
                map.setView([selectedLat, selectedLon], 6);
                document.getElementById("locationName").innerText = data[0].display_name.split(",")[0];
                updateAll(false);
            }
        } catch (e) { console.error(e); }
    });
}

function updateAll(recalculateMap = false) {
    const date = new Date(document.getElementById("dateInput").value);

    // Marker setzen
    if (markers.main) map.removeLayer(markers.main);
    markers.main = L.marker([selectedLat, selectedLon]).addTo(map);

    // Module updaten
    if (typeof updateMoonData === "function") updateMoonData(date, selectedLat, selectedLon);
    if (typeof updateSkyView === "function") updateSkyView(date, selectedLat, selectedLon);
    if (typeof updateQibla === "function") updateQibla(selectedLat, selectedLon, map);

    // Karte neu malen?
    if (recalculateMap) {
        drawVisibilityMap(date);
    }
}

function drawVisibilityMap(date) {
    // Status anzeigen
    const statusText = document.getElementById("locationName");
    const oldText = statusText.innerText;
    statusText.innerText = "⏳ Berechne Karte... (bitte warten)";

    // Alles löschen
    layers.green.clearLayers();
    layers.magenta.clearLayers();
    layers.blue.clearLayers();
    layers.red.clearLayers();

    // Schrittweite (je größer, desto schneller)
    const step = 5; 
    let lat = 60;

    function processChunk() {
        const start = performance.now();
        
        // Loop läuft für max 20ms, dann Pause für Browser
        while (lat > -60 && performance.now() - start < 20) {
            for (let lon = -180; lon < 180; lon += step) {
                const type = checkVisibility(date, lat, lon);
                
                // Farbe wählen
                let color = null;
                if (type === 'green') color = '#00FF00';
                else if (type === 'magenta') color = '#FF00FF';
                else if (type === 'blue') color = '#0055FF';
                else if (type === 'red') color = '#FF0000'; // Jetzt auch Rot!

                if (color) {
                    L.circleMarker([lat, lon], {
                        radius: 2,         // Punkte etwas kleiner
                        fillColor: color,
                        color: color,
                        weight: 0,
                        fillOpacity: 0.4
                    }).addTo(layers[type]);
                }
            }
            lat -= step;
        }

        if (lat > -60) {
            setTimeout(processChunk, 0); // Weiterrechnen
        } else {
            statusText.innerText = "Karte fertig ✅";
            setTimeout(() => { statusText.innerText = oldText; }, 2000);
        }
    }

    processChunk();
}

function checkVisibility(date, lat, lon) {
    const observer = new Astronomy.Observer(lat, lon, 0);
    const checkDate = new Date(date);
    checkDate.setUTCHours(12,0,0,0); 

    // Sonnenuntergang suchen
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, checkDate, 1);
    if (!sunset) return 'red'; // Kein Sonnenuntergang (Polartag/nacht) -> Unsichtbar

    const t = sunset.date;
    const sunEqu = Astronomy.Equator(Astronomy.Body.Sun, t, observer, true, true);
    const moonEqu = Astronomy.Equator(Astronomy.Body.Moon, t, observer, true, true);
    const moonHor = Astronomy.Horizon(t, observer, moonEqu.ra, moonEqu.dec, 'normal');

    const alt = moonHor.alt;
    const elongation = Astronomy.AngleBetween(sunEqu.vec, moonEqu.vec);

    // Kriterien für "Unsichtbar" (Rot)
    if (alt < 0.5) return 'red'; // Unter Horizont
    if (elongation < 6.4) return 'red'; // Danjon Limit

    // Odeh Kriterium (Parabel)
    let V = alt - (-0.1018 * Math.pow(elongation, 2) + 1.6787 * elongation - 5.5704);

    if (V >= 5.6) return 'green';      
    if (V >= 2.0) return 'magenta';    
    if (V >= -0.9) return 'blue';      
    
    return 'red'; // Wenn keins passt -> Unsichtbar
}
