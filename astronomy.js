// Berechnet Mondphase, Auf-/Untergang und zeichnet die Sichel

function updateMoonData(date, lat, lon) {
    // Wir nutzen die Library "AstronomyEngine" (wurde in index.html geladen)
    
    // Beobachter erstellen (Höhe 0 Meter)
    const observer = new Astronomy.Observer(lat, lon, 0);
    
    // 1. Mondphase & Beleuchtung berechnen
    const moonPhase = Astronomy.MoonPhase(date); // Winkel 0..360
    const illumination = Astronomy.Illumination(Astronomy.Body.Moon, date);
    
    // Anzeige Text (Prozent)
    const percent = (illumination.phase_fraction * 100).toFixed(1);
    document.getElementById("moonPercent").innerText = `Beleuchtung: ${percent}%`;

    // 2. Zeiten berechnen (Aufgang/Untergang für heute)
    // Wir suchen nach Ereignissen (+1 = Aufgang, -1 = Untergang)
    const sunSet = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date, 300);
    const moonRise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, date, 300);
    const moonSet = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, date, 300);
    
    // HTML für die Zeiten bauen
    let html = "";
    
    // Wir prüfen, ob die Zeiten existieren (manchmal geht der Mond an einem Tag gar nicht auf/unter)
    if (sunSet) {
        html += `<div class="data-row"><span>🌅 Sonnenuntergang:</span> <b>${formatTime(sunSet.date)}</b></div>`;
    }
    if (moonRise) {
        html += `<div class="data-row"><span>🌑 Mondaufgang:</span> <b>${formatTime(moonRise.date)}</b></div>`;
    }
    if (moonSet) {
        html += `<div class="data-row"><span>🌘 Monduntergang:</span> <b>${formatTime(moonSet.date)}</b></div>`;
    }
    
    // Mondalter (grob: Tage seit Neumond)
    const ageDays = (moonPhase / 360 * 29.53).toFixed(1);
    html += `<div class="data-row"><span>📅 Mondalter:</span> <b>${ageDays} Tage</b></div>`;

    // In die HTML-Box schreiben
    document.getElementById("astroTimes").innerHTML = html;

    // 3. Mond Zeichnen (Canvas Grafik)
    drawMoonCanvas(moonPhase);
}

// Hilfsfunktion: Zeit formatieren (z.B. 18:30 Uhr)
function formatTime(dateObj) {
    return dateObj.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
}

// Zeichnet eine einfache Grafik des Mondes
function drawMoonCanvas(phaseAngle) {
    const canvas = document.getElementById("moonCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const radius = (size / 2) - 2;

    ctx.clearRect(0, 0, size, size);

    // 1. Schwarzer Hintergrund (Die dunkle Seite)
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.fill();

    // 2. Beleuchteter Teil (Weiß/Gelblich)
    // Wir simulieren die Phase durch Transparenz, das ist am stabilsten
    
    // Berechne wie hell es ist (0 bis 1)
    let lighting = (1 - Math.cos(phaseAngle * Math.PI / 180)) / 2;
    
    ctx.fillStyle = "#fffaea"; // Mondfarbe
    ctx.beginPath();
    
    // Zeichne einen Kreis darüber, dessen Deckkraft der Beleuchtung entspricht
    // (Dies ist eine vereinfachte Darstellung, keine perfekte Sichelgeometrie, 
    // aber sie funktioniert immer fehlerfrei)
    ctx.globalAlpha = lighting; 
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Reset
    ctx.globalAlpha = 1.0;
    
    // Optional: Ein feiner Rand
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.stroke();
}
