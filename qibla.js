let qiblaLine = null;

function updateQibla(lat, lon, map) {
    // Koordinaten Kaaba
    const kaabaLat = 21.4225;
    const kaabaLon = 39.8262;

    // Mathe: Richtung berechnen
    const y = Math.sin((kaabaLon - lon) * Math.PI / 180);
    const x = Math.cos(lat * Math.PI / 180) * Math.tan(kaabaLat * Math.PI / 180) 
            - Math.sin(lat * Math.PI / 180) * Math.cos((kaabaLon - lon) * Math.PI / 180);
    
    let qibla = Math.atan2(y, x) * 180 / Math.PI;
    qibla = (qibla + 360) % 360; // Immer positiv 0-360

    // Text anzeigen
    document.getElementById("qiblaDir").innerText = qibla.toFixed(1) + "°";

    // Distanz berechnen (Haversine Formel)
    const R = 6371; // Erdradius km
    const dLat = (kaabaLat - lat) * Math.PI / 180;
    const dLon = (kaabaLon - lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat * Math.PI / 180) * Math.cos(kaabaLat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = R * c;
    
    document.getElementById("kaabaDist").innerText = dist.toFixed(0) + " km";

    // Linie auf Karte zeichnen (Gelb)
    if (qiblaLine) map.removeLayer(qiblaLine);
    
    qiblaLine = L.polyline([
        [lat, lon],
        [kaabaLat, kaabaLon]
    ], {color: 'yellow', weight: 3, opacity: 0.7, dashArray: '10, 10'}).addTo(map);
}
