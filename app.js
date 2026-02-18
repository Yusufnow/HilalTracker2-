// Globale Variablen für die App
let map;
let markers = {};
// Start-Koordinaten (Mekka)
let selectedLat = 21.4225;
let selectedLon = 39.8262;

// 1. Starten, sobald die Seite geladen ist
window.addEventListener("load", () => {
    initMap();
    setupInputs();
    
    // Offline-Modus aktivieren (falls verfügbar)
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./service-worker.js");
    }

    // Sofort einmal alles berechnen
    updateAll();
});

// 2. Karte einrichten
function initMap() {
    // Karte erstellen, Zoom-Knöpfe ausblenden für mehr Platz
    map = L.map('map', { zoomControl: false }).setView([selectedLat, selectedLon], 5);
    
    // Satellitenbild laden (Esri)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite'
    }).addTo(map);

    // Wenn man auf die Karte klickt -> Ort ändern
    map.on('click', (e) => {
        selectedLat = e.latlng.lat;
        selectedLon = e.latlng.lng;
        document.getElementById("locationName").innerText = "Markierter Ort";
        updateAll();
    });
}

// 3. Eingabefelder (Datum & Suche) einrichten
function setupInputs() {
    // Datum auf "Jetzt" setzen (lokale Zeit)
    const now = new Date();
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
    document.getElementById("dateInput").value = localIso;

    // Wenn Datum geändert wird -> neu berechnen
    document.getElementById("dateInput").addEventListener("change", updateAll);

    // Wenn Stadt gesucht wird
    document.getElementById("citySearch").addEventListener("change", async function() {
        const query = this.value;
        if (!query) return;

        // Suche über OpenStreetMap (Nominatim)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.length > 0) {
                // Ersten Treffer nehmen
                selectedLat = parseFloat(data[0].lat);
                selectedLon = parseFloat(data[0].lon);
                
                // Karte dort hin bewegen
                map.setView([selectedLat, selectedLon], 10);
                // Name anzeigen (nur den Stadtnamen, vor dem ersten Komma)
                document.getElementById("locationName").innerText = data[0].display_name.split(",")[0];
                
                updateAll();
            } else {
                alert("Stadt nicht gefunden!");
            }
        } catch (e) {
            console.error("Fehler bei der Suche:", e);
        }
    });
}

// 4. HAUPTFUNKTION: Alles aktualisieren
// Diese Funktion ruft die anderen Dateien auf (Astronomie, Himmel, Qibla)
function updateAll() {
    const date = new Date(document.getElementById("dateInput").value);

    // Roten Marker auf der Karte setzen
    if (markers.main) map.removeLayer(markers.main);
    markers.main = L.marker([selectedLat, selectedLon]).addTo(map);

    // --- Hier rufen wir die Funktionen aus den anderen Dateien auf ---
    // Wir prüfen mit "typeof", ob die Datei schon fertig ist, um Fehler zu vermeiden.

    // 1. Mond-Daten & Zeiten (aus astronomy.js)
    if (typeof updateMoonData === "function") {
        updateMoonData(date, selectedLat, selectedLon);
    }

    // 2. 3D Himmel (aus sky3d.js)
    if (typeof updateSkyView === "function") {
        updateSkyView(date, selectedLat, selectedLon);
    }

    // 3. Qibla Richtung (aus qibla.js)
    if (typeof updateQibla === "function") {
        updateQibla(selectedLat, selectedLon, map);
    }
}
