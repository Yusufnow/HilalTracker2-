// Globale Variablen
let map;
let markers = {};
let gridLayer = null; // Hier speichern wir die bunten Punkte
let selectedLat = 21.4225;
let selectedLon = 39.8262;

window.addEventListener("load", () => {
    initMap();
    setupInputs();
    
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./service-worker.js");
    }

    // Sofort einmal alles berechnen
    updateAll();
});

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([selectedLat, selectedLon], 3);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite'
    }).addTo(map);

    // Layer-Gruppe für die bunten Punkte erstellen
    gridLayer = L.layerGroup().addTo(map);

    map.on('click', (e) => {
        selectedLat = e.latlng.lat;
        selectedLon = e.latlng.lng;
        document.getElementById("locationName").innerText = "Markierter Ort";
        updateSinglePoint(); // Nur Daten aktualisieren, Karte nicht neu malen (spart Zeit)
    });
}

function setupInputs() {
    const now = new Date();
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
    document.getElementById("dateInput").value = localIso;

    // Wenn Datum geändert wird -> ALLES neu berechnen (auch die Karte)
    document.getElementById("dateInput").addEventListener("change", updateAll);

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
                updateSinglePoint(); 
            } else {
                alert("Stadt nicht gefunden!");
            }
        } catch (e) {
            console.error(e);
        }
    });
}

function updateAll() {
    // 1. Die Karte mit den Punkten neu zeichnen
    drawVisibilityMap();
    // 2. Die Daten für den ausgewählten Ort updaten
    updateSinglePoint();
}

function updateSinglePoint() {
    const date = new Date(document.getElementById("dateInput").value);

    // Marker setzen
    if (markers.main) map.removeLayer(markers.main);
    markers.main = L.marker([selectedLat, selectedLon]).addTo(map);

    if (typeof updateMoonData === "function") updateMoonData(date, selectedLat, selectedLon);
    if (typeof updateSkyView === "function") updateSkyView(date, selectedLat, selectedLon);
    if (typeof updateQibla === "function") updateQibla(selectedLat, selectedLon, map);
}

// --- HIER IST DIE FEHLENDE LOGIK FÜR DIE BUNTE KARTE ---

function drawVisibilityMap() {
    const dateInput = new Date(document.getElementById("dateInput").value);
    
    // Alte Punkte löschen
    gridLayer.clearLayers();
    
    // Wir nutzen setTimeout, damit die UI nicht einfriert
    setTimeout(() => {
        const step = 4; // Raster-Größe (4 Grad Schritte)
        
        // Wir scannen die Weltkarte
        // Von 60° Nord bis 60° Süd (darüber/darunter ist Mond selten sichtbar)
        for (let lat = 60; lat >= -60; lat -= step) {
            for (let lon = -180; lon <= 180; lon += step) {
                
                const result = calculateOdeh(lat, lon, dateInput);
                
                if (result.visible) {
                    L.circleMarker([lat, lon], {
                        radius: 3,
                        fillColor: result.color,
                        color: result.color,
                        weight: 0,
                        fillOpacity: 0.5
                    }).addTo(gridLayer);
                }
            }
        }
    }, 100);
}

// Die mathematische Berechnung (Odeh Kriterium)
function calculateOdeh(lat, lon, date) {
    // 1. Sonnenuntergang berechnen
    const observer = new Astronomy.Observer(lat, lon, 0);
    // Wir setzen die Uhrzeit auf 12:00 UTC, um den Sonnenuntergang des Tages zu finden
    const checkDate = new Date(date);
    checkDate.setUTCHours(12, 0, 0, 0);
    
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, checkDate, 1);
    // Wenn kein Sonnenuntergang (Polartag), abbrechen
    if (!sunset) return { visible: false };

    const time = sunset.date;

    // 2. Positionen berechnen
    const sunPos = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
    const moonPos = Astronomy.Equator(Astronomy.Body.Moon, time, observer, true, true);
    const moonHor = Astronomy.Horizon(time, observer, moonPos.ra, moonPos.dec, 'normal');

    const alt = moonHor.alt; // Mondhöhe
    const arcv = alt; 
    // Winkelabstand (Elongation)
    const elongation = Astronomy.AngleBetween(sunPos.vec, moonPos.vec);
    const w = Math.abs(elongation); // Topozentrische Breite (grob Elongation)

    // 3. Ausschlusskriterien (Danjon Limit)
    if (alt <= 0.5) return { visible: false }; // Mond unter Horizont
    if (elongation <= 6.4) return { visible: false }; // Zu nah an Sonne

    // 4. Odeh V-Parameter Formel
    // V = ARCV - ( -0.1018*W^3 + 1.6787*W^2 ... vereinfachte Parabel für Performance)
    // Wir nutzen hier die Formel, die die typische Kurve erzeugt:
    
    let V = arcv - (-0.1018 * Math.pow(w, 2) + 1.6787 * w - 5.5704);

    if (V >= 5.6) return { visible: true, color: '#00FF00' };   // Grün (Auge)
    if (V >= 2.0) return { visible: true, color: '#FF00FF' };   // Magenta (Schwierig)
    if (V >= -0.9) return { visible: true, color: '#0055FF' };  // Blau (Teleskop)
    
    return { visible: false };
}
