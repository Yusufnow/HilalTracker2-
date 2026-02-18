// Globale Variablen
let map;
let markers = {};
let layers = {}; // Hier speichern wir die bunten Punkte
let selectedLat = 21.4225;
let selectedLon = 39.8262;

window.addEventListener("load", () => {
    initMap();
    setupInputs();
    
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./service-worker.js");
    }

    // Startet Berechnung sofort
    updateAll(true); 
});

function initMap() {
    // Zoom auf 2, damit man die Welt sieht
    map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite'
    }).addTo(map);

    // --- WICHTIG: Die Ebenen für die bunten Punkte ---
    layers.green = L.layerGroup().addTo(map);   // Auge (Grün)
    layers.magenta = L.layerGroup().addTo(map); // Möglich (Magenta)
    layers.blue = L.layerGroup().addTo(map);    // Teleskop (Blau)

    map.on('click', (e) => {
        selectedLat = e.latlng.lat;
        selectedLon = e.latlng.lng;
        document.getElementById("locationName").innerText = "Markierter Ort";
        // false = Karte NICHT neu berechnen (spart Zeit, nur Ort ändern)
        updateAll(false); 
    });
}

function setupInputs() {
    const now = new Date();
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
    document.getElementById("dateInput").value = localIso;

    // Wenn Datum geändert wird -> ALLES neu berechnen (auch die bunten Punkte!)
    document.getElementById("dateInput").addEventListener("change", () => updateAll(true));

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
                map.setView([selectedLat, selectedLon], 8);
                document.getElementById("locationName").innerText = data[0].display_name.split(",")[0];
                updateAll(false);
            }
        } catch (e) { console.error(e); }
    });
}

function updateAll(recalculateMap = false) {
    const date = new Date(document.getElementById("dateInput").value);

    // Roten Marker setzen
    if (markers.main) map.removeLayer(markers.main);
    markers.main = L.marker([selectedLat, selectedLon]).addTo(map);

    // Andere Module updaten
    if (typeof updateMoonData === "function") updateMoonData(date, selectedLat, selectedLon);
    if (typeof updateSkyView === "function") updateSkyView(date, selectedLat, selectedLon);
    if (typeof updateQibla === "function") updateQibla(selectedLat, selectedLon, map);

    // --- HIER WERDEN DIE PUNKTE GEMALT ---
    if (recalculateMap) {
        drawVisibilityMap(date);
    }
}

// Die Funktion, die gefehlt hat:
function drawVisibilityMap(date) {
    // 1. Alte Punkte löschen
    layers.green.clearLayers();
    layers.magenta.clearLayers();
    layers.blue.clearLayers();

    console.log("Berechne Sichtbarkeitskarte...");
    
    // Rastergröße (4 Grad Abstand). Kleiner = genauer, aber langsamer.
    const step = 4; 
    
    // Wir nutzen eine Funktion, die stückweise arbeitet, damit das Handy nicht einfriert
    let lat = 60;

    function processChunk() {
        const start = performance.now();
        
        // Immer nur für 15 Millisekunden rechnen, dann kurz Pause machen
        while (lat > -60 && performance.now() - start < 15) {
            for (let lon = -180; lon < 180; lon += step) {
                // Berechnen, welche Farbe der Punkt haben soll
                const type = checkVisibility(date, lat, lon);
                
                if (type) {
                    let color = (type === 'green') ? '#00FF00' : (type === 'magenta') ? '#FF00FF' : '#0055FF';
                    
                    L.circleMarker([lat, lon], {
                        radius: 3,
                        fillColor: color,
                        color: color,
                        weight: 0,
                        fillOpacity: 0.5
                    }).addTo(layers[type]);
                }
            }
            lat -= step;
        }

        if (lat > -60) {
            setTimeout(processChunk, 0); // Kurz Pause für den Browser, dann weiter
        } else {
            console.log("Karte fertig!");
        }
    }

    processChunk();
}

// Die mathematische Logik (Odeh Kriterium)
function checkVisibility(date, lat, lon) {
    // Bibliothek AstronomyEngine nutzen
    const observer = new Astronomy.Observer(lat, lon, 0);
    const checkDate = new Date(date);
    checkDate.setUTCHours(12,0,0,0); // Wir prüfen den Abend dieses Tages

    // Sonnenuntergang suchen (+1 bedeutet nächster Untergang)
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, checkDate, 1);
    if (!sunset) return null;

    const t = sunset.date;
    const sunEqu = Astronomy.Equator(Astronomy.Body.Sun, t, observer, true, true);
    const moonEqu = Astronomy.Equator(Astronomy.Body.Moon, t, observer, true, true);
    const moonHor = Astronomy.Horizon(t, observer, moonEqu.ra, moonEqu.dec, 'normal');

    const alt = moonHor.alt; // Mondhöhe
    const arcv = alt; 
    const elongation = Astronomy.AngleBetween(sunEqu.vec, moonEqu.vec); // Winkelabstand zur Sonne
    
    // Kriterien (Danjon Limit & Höhe)
    if (alt < 0.5) return null; // Mond schon untergegangen oder zu tief
    if (elongation < 6.4) return null; // Zu nah an der Sonne (physikalisch unsichtbar)

    // Odeh Parameter V (Parabel-Kurve)
    // Diese Formel sorgt für die typische Kurvenform auf der Karte
    let V = arcv - (-0.1018 * Math.pow(elongation, 2) + 1.6787 * elongation - 5.5704);

    if (V >= 5.6) return 'green';      // Mit Auge sichtbar
    if (V >= 2.0) return 'magenta';    // Wetter muss perfekt sein
    if (V >= -0.9) return 'blue';      // Nur Teleskop
    
    return null;
}
