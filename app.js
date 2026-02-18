// Globale Variablen für die App
let map;
let markers = {};
let selectedLat = 21.4225; // Start: Mekka
let selectedLon = 39.8262;

// 1. Starten, sobald die Seite geladen ist
window.addEventListener("load", () => {
    initMap();
    setupInputs();
    
    // Offline-Modus (Service Worker) aktivieren
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./service-worker.js")
            .then(() => console.log("Service Worker registriert"))
            .catch(err => console.log("SW Fehler:", err));
    }

    // Einmal alles berechnen zum Start
    updateAll();
});

// 2. Karte initialisieren (Leaflet)
function initMap() {
    // Karte erstellen
    map = L.map('map', { zoomControl: false }).setView([selectedLat, selectedLon], 5);
    
    // Satellitenbild-Layer hinzufügen
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite',
        maxZoom: 18
    }).addTo(map);

    // Wenn man auf die Karte klickt -> Ort ändern
    map.on('click', (e) => {
        selectedLat = e.latlng.lat;
        selectedLon = e.latlng.lng;
        document.getElementById("locationName").innerText = "Markierter Ort";
        updateAll();
    });
}

// 3. Eingabefelder einrichten (Datum & Suche)
function setupInputs() {
    // Datum auf "Jetzt" setzen (unter Berücksichtigung der Zeitzone)
    const now = new Date();
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
    document.getElementById("dateInput").value = localIso;

    // Wenn Datum geändert wird -> Neu berechnen
    document.getElementById("dateInput").addEventListener("change", updateAll);

    // Stadtsuche (wenn man Enter drückt oder den Fokus verliert)
    document.getElementById("citySearch").addEventListener("change", async function() {
        const query = this.value;
        if (!query) return;

        // Wir nutzen die kostenlose OpenStreetMap Suche (Nominatim)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.length > 0) {
                // Ersten Treffer nehmen
                selectedLat = parseFloat(data[0].lat);
                selectedLon = parseFloat(data[0].lon);
                
                // Karte dorthin bewegen
                map.setView([selectedLat, selectedLon], 10);
                
                // Name anzeigen (nur den ersten Teil, z.B. "Berlin")
                document.getElementById("locationName").innerText = data[0].display_name.split(",")[0];
                
                updateAll();
            } else {
                alert("Ort nicht gefunden!");
            }
        } catch (e) {
            console.error("Fehler bei der Suche:", e);
        }
    });
}

// 4. Hauptfunktion: Alles aktualisieren
function updateAll() {
    const date = new Date(document.getElementById("dateInput").value);

    // Marker auf der Karte setzen
    if (markers.main) map.removeLayer(markers.main);
    markers.main = L.marker([selectedLat, selectedLon]).addTo(map);

    // Jetzt rufen wir die Funktionen aus den anderen Dateien auf
    // Wir prüfen erst, ob die Dateien schon fertig sind (typeof check), damit es keinen Absturz gibt
    
    // Mond-Daten (aus astronomy.js)
    if (typeof updateMoonData === "function") {
        updateMoonData(date, selectedLat, selectedLon);
    }

    // 3D Himmel (aus sky3d.js)
    if (typeof updateSkyView === "function") {
        updateSkyView(date, selectedLat, selectedLon);
    }

    // Qibla Richtung (aus qibla.js)
    if (typeof updateQibla === "function") {
        updateQibla(selectedLat, selectedLon, map);
    }
}
