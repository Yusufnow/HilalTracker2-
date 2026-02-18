// Globale Variablen
let map;
let markers = {};
let layers = {}; 
let selectedLat = 21.4225; // Mekka Start
let selectedLon = 39.8262;
let terminatorLayer = null; // Für den Tag/Nacht Schatten

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
    
    // Satellitenkarte
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite'
    }).addTo(map);

    // --- Ebenen für ALLE Farben ---
    // Wir fügen sie in einer bestimmten Reihenfolge hinzu, damit Wichtiges oben liegt
    layers.red = L.layerGroup().addTo(map);     // Unsichtbar (ganz unten)
    layers.blue = L.layerGroup().addTo(map);    // Teleskop
    layers.magenta = L.layerGroup().addTo(map); // Möglich
    layers.green = L.layerGroup().addTo(map);   // Auge (ganz oben)

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
    // Das ausgewählte Datum mit Uhrzeit
    const date = new Date(document.getElementById("dateInput").value);

    // 1. Tag/Nacht Schatten aktualisieren (basiert auf der eingestellten Uhrzeit)
    if (terminatorLayer) map.removeLayer(terminatorLayer);
    // Wir nutzen eine externe Bibliothek für den Schatten, falls geladen. 
    // Wenn nicht, passiert hier nichts (auch okay).
    if (L.terminator) {
        terminatorLayer = L.terminator({ time: date.toUTCString() }).addTo(map);
        terminatorLayer.bringToBack(); // Schatten hinter die Punkte
    }

    // 2. Marker setzen
    if (markers.main) map.removeLayer(markers.main);
    markers.main = L.marker([selectedLat, selectedLon]).addTo(map);

    // 3. Module updaten (Tabs unten)
    if (typeof updateMoonData === "function") updateMoonData(date, selectedLat, selectedLon);
    if (typeof updateSkyView === "function") updateSkyView(date, selectedLat, selectedLon);
    if (typeof updateQibla === "function") updateQibla(selectedLat, selectedLon, map);

    // 4. Karte neu malen? (Nur wenn Datum geändert wurde)
    if (recalculateMap) {
        drawVisibilityMap(date);
    }
}

function drawVisibilityMap(date) {
    const statusText = document.getElementById("locationName");
    const oldText = statusText.innerText;
    statusText.innerText = "⏳ Berechne Karte... (bitte warten)";

    // Alles löschen
    layers.green.clearLayers();
    layers.magenta.clearLayers();
    layers.blue.clearLayers();
    layers.red.clearLayers();

    // Schrittweite (größer = schneller, aber ungenauer)
    const step = 4; 
    let lat = 60;

    // Wir nutzen nur den Tag des Datums für die Berechnung, Uhrzeit egal
    const calculationDate = new Date(date);
    calculationDate.setHours(0,0,0,0);

    function processChunk() {
        const start = performance.now();
        
        // Loop läuft für max 25ms, dann Pause für Browser
        while (lat > -60 && performance.now() - start < 25) {
            for (let lon = -180; lon < 180; lon += step) {
                // Hier wird jetzt der ganze Tag geprüft!
                const type = checkVisibility(calculationDate, lat, lon);
                
                let color = null;
                if (type === 'green') color = '#00FF00';
                else if (type === 'magenta') color = '#FF00FF';
                else if (type === 'blue') color = '#0055FF';
                else if (type === 'red') color = '#FF0000';

                if (color) {
                    // HIER: PUNKTE DICKER GEMACHT (Radius 5 statt 2, Opacity erhöht)
                    L.circleMarker([lat, lon], {
                        radius: 5,         // Deutlich größer
                        fillColor: color,
                        color: color,      // Rand auch farbig
                        weight: 1,         // Dünner Rand
                        opacity: 0.8,      // Rand Deckkraft
                        fillOpacity: 0.6   // Füllung Deckkraft
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

// --- DIE WICHTIGSTE ÄNDERUNG IST HIER ---
function checkVisibility(baseDate, lat, lon) {
    const observer = new Astronomy.Observer(lat, lon, 0);
    
    // WICHTIG: Wir suchen den Sonnenuntergang an diesem spezifischen Ort für diesen Tag.
    // Wir starten die Suche um Mitternacht (+0 Tage) und suchen den nächsten Untergang (Sunset = 1).
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, baseDate, 1);
    
    if (!sunset) return 'red'; // Polartag/nacht -> Unsichtbar

    // t ist jetzt der EXAKTE Zeitpunkt des Sonnenuntergangs an diesem Ort
    const t = sunset.date;

    // Jetzt berechnen wir die Positionen genau zu diesem Zeitpunkt 't'
    const sunEqu = Astronomy.Equator(Astronomy.Body.Sun, t, observer, true, true);
    const moonEqu = Astronomy.Equator(Astronomy.Body.Moon, t, observer, true, true);
    const moonHor = Astronomy.Horizon(t, observer, moonEqu.ra, moonEqu.dec, 'normal');

    const alt = moonHor.alt; // Mondhöhe über Horizont bei Sonnenuntergang
    const elongation = Astronomy.AngleBetween(sunEqu.vec, moonEqu.vec); // Winkelabstand

    // Kriterien (Rote Zone)
    // Wenn Mond schon untergegangen (Höhe < 0.5 Grad wegen Refraktion)
    if (alt < 0.5) return 'red'; 
    // Danjon Limit (unter 6.4 Grad physikalisch unsichtbar)
    if (elongation < 6.4) return 'red'; 

    // Odeh Kriterium (Die Formel für die Parabel-Kurven)
    let V = alt - (-0.1018 * Math.pow(elongation, 2) + 1.6787 * elongation - 5.5704);

    if (V >= 5.6) return 'green';       // Auge
    if (V >= 2.0) return 'magenta';    // Perfektes Wetter
    if (V >= -0.9) return 'blue';      // Teleskop
    
    return 'red'; // Sonst unsichtbar
}
