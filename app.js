// Globale Variablen
let map;
let markers = {};
let selectedLat = 21.4225; // Start: Mekka
let selectedLon = 39.8262;

// 1. Starten wenn Seite geladen ist
window.addEventListener("load", () => {
    initMap();
    setupInputs();
    
    // Service Worker für Offline (PWA)
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./service-worker.js");
    }

    // Start-Update
    updateAll();
});

// 2. Karte initialisieren
function initMap() {
    map = L.map('map', { zoomControl: false }).setView([selectedLat, selectedLon], 5);
    
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite'
    }).addTo(map);

    // Klick auf Karte setzt neuen Ort
    map.on('click', (e) => {
        selectedLat = e.latlng.lat;
        selectedLon = e.latlng.lng;
        document.getElementById("locationName").innerText = "Gewählter Ort";
        updateAll();
    });
}

// 3. Inputs einrichten
function setupInputs() {
    // Datum auf Heute setzen
    const now = new Date();
    // Offset für korrekte lokale Zeit im Input
    const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
    document.getElementById("dateInput").value = localIso;

    // Bei Datumsänderung updaten
    document.getElementById("dateInput").addEventListener("change", updateAll);

    // Stadtsuche
    document.getElementById("citySearch").addEventListener("change", async function() {
        const query = this.value;
        if (!query) return;

        // Nominatim Suche (OpenStreetMap)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.length > 0) {
                selectedLat = parseFloat(data[0].lat);
                selectedLon = parseFloat(data[0].lon);
                
                // Karte bewegen
                map.setView([selectedLat, selectedLon], 10);
                document.getElementById("locationName").innerText = data[0].display_name.split(",")[0];
                updateAll();
            } else {
                alert("Stadt nicht gefunden!");
            }
        } catch (e) {
            console.error("Suchfehler", e);
        }
    });
}

// 4. HAUPTFUNKTION: Alles aktualisieren
function updateAll() {
    const date = new Date(document.getElementById("dateInput").value);

    // Marker auf Karte setzen
    if (markers.main) map.removeLayer(markers.main);
    markers.main = L.marker([selectedLat, selectedLon]).addTo(map);

    // --- Module aufrufen (die in anderen Dateien sind) ---
    
    // 1. Mond Daten (aus astronomy.js)
    if (typeof updateMoonData === "function") {
        updateMoonData(date, selectedLat, selectedLon);
    }

    // 2. 3D Himmel (aus sky3d.js)
    if (typeof updateSkyView === "function") {
        updateSkyView(date, selectedLat, selectedLon);
    }

    // 3. Qibla (aus qibla.js)
    if (typeof updateQibla === "function") {
        updateQibla(selectedLat, selectedLon, map);
    }
}
