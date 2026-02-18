// Speichert die gelbe Linie, damit wir sie löschen können, wenn sich der Ort ändert
let qiblaLine = null;

function updateQibla(lat, lon, map) {
    // Koordinaten der Kaaba in Mekka
    const kaabaLat = 21.4225;
    const kaabaLon = 39.8262;

    // 1. Richtung berechnen (Mathematik)
    const y = Math.sin((kaabaLon - lon) * Math.PI / 180);
    const x = Math.cos(lat * Math.PI / 180) * Math.tan(kaabaLat * Math.PI / 180) 
            - Math.sin(lat * Math.PI / 180) * Math.cos((kaabaLon - lon) * Math.PI / 180);
    
    let qibla = Math.atan2(y, x) * 180 / Math.PI;
    // Ergebnis muss immer positiv sein (0-360 Grad)
    qibla = (qibla + 360) % 360; 

    // Text in der App anzeigen
    // toFixed(1) bedeutet: eine Nachkommastelle (z.B. 125.4°)
    if(document.getElementById("qiblaDir")) {
        document.getElementById("qiblaDir").innerText = qibla.toFixed(1) + "°";
    }

    // 2. Entfernung berechnen (Haversine Formel für Luftlinie)
    const R = 6371; // Erdradius in km
    const dLat = (kaabaLat - lat) * Math.PI / 180;
    const dLon = (kaabaLon - lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat * Math.PI / 180) * Math.cos(kaabaLat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = R * c;
    
    // Entfernung anzeigen
    if(document.getElementById("kaabaDist")) {
        document.getElementById("kaabaDist").innerText = dist.toFixed(0) + " km";
    }

    // 3. Linie auf der Karte zeichnen (Gelb gestrichelt)
    
    // Alte Linie löschen, falls vorhanden
    if (qiblaLine) {
        map.removeLayer(qiblaLine);
    }
    
    // Neue Linie zeichnen
    qiblaLine = L.polyline([
        [lat, lon],       // Start: Dein Ort
        [kaabaLat, kaabaLon] // Ziel: Mekka
    ], {
        color: 'yellow',  // Gelbe Farbe
        weight: 4,        // Dicke
        opacity: 0.7,     // Leicht durchsichtig
        dashArray: '10, 10' // Gestrichelt
    }).addTo(map);
}
