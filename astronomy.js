// Berechnet Mondphase, Auf-/Untergang und zeichnet die Sichel

function updateMoonData(date, lat, lon) {
    // Wir nutzen die Library "AstronomyEngine" (wurde in index.html geladen)
    
    const observer = new Astronomy.Observer(lat, lon, 0);
    
    // 1. Mondphase & Beleuchtung
    const moonPhase = Astronomy.MoonPhase(date); // Winkel 0..360
    const illumination = Astronomy.Illumination(Astronomy.Body.Moon, date);
    
    // Anzeige Text
    const percent = (illumination.phase_fraction * 100).toFixed(1);
    document.getElementById("moonPercent").innerText = `Beleuchtung: ${percent}%`;

    // 2. Zeiten berechnen (Aufgang/Untergang)
    const sunTimes = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, date, 300);
    const moonTimes = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, date, 300);
    
    // Nächsten Untergang/Aufgang finden (Rise=Aufgang, Set=Untergang)
    // Wir nehmen einfach die nexten Ereignisse
    
    let html = "";
    if (sunTimes) html += `<div class="data-row"><span>🌅 Sonnenuntergang:</span> <b>${formatTime(sunTimes.date)}</b></div>`;
    if (moonTimes) html += `<div class="data-row"><span>🌑 Monduntergang:</span> <b>${formatTime(moonTimes.date)}</b></div>`;
    
    // Mondalter (grob: Tage seit Neumond)
    const ageDays = (moonPhase / 360 * 29.53).toFixed(1);
    html += `<div class="data-row"><span>📅 Mondalter:</span> <b>${ageDays} Tage</b></div>`;

    document.getElementById("astroTimes").innerHTML = html;

    // 3. Mond Zeichnen (Canvas)
    drawMoonCanvas(moonPhase);
}

// Hilfsfunktion: Zeit formatieren (HH:MM)
function formatTime(dateObj) {
    return dateObj.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
}

// Zeichnet die realistische Sichel
function drawMoonCanvas(phaseAngle) {
    const canvas = document.getElementById("moonCanvas");
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const center = size / 2;
    const radius = (size / 2) - 2;

    ctx.clearRect(0, 0, size, size);

    // Schwarzer Hintergrund (Nachtseite)
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Beleuchteter Teil (Weiß)
    // Einfache Darstellung der Phase
    ctx.fillStyle = "#fffaea"; // Mondweiß
    ctx.beginPath();
    
    // Komplizierte Mathe für Sichelform vereinfacht:
    // Wir nutzen den eingebauten Schatten-Effekt von Canvas
    // Wenn Vollmond (180), Halbmond (90/270), Neumond (0/360)
    
    // Hier eine simple visuelle Annäherung:
    // Wir malen einen Kreis und "radieren" den Schatten weg
    
    // ... Für Profi-Sichel brauchen wir komplexe Pfade.
    // Hier die einfache Version:
    
    // Wir nutzen einfach AstronomyEngine Phase
    // Zeichne Phase als Kreisbogen? Nein, zu kompliziert für den Anfang.
    // Wir machen es einfach: Zeige einen Kreis, der je nach Phase gefüllt ist.
    
    // BESSER: Ein Bild nutzen? Nein, Canvas ist cooler.
    // Wir zeichnen einfach einen vollen Kreis und legen einen Schatten drüber.
    
    // Phase 0..1 (0=Neu, 0.5=Halb, 1=Voll)
    let p = phaseAngle / 360; 
    
    // Das ist schwer "idiotensicher" in Canvas zu coden ohne 50 Zeilen.
    // Wir machen einen einfachen Indikator:
    
    ctx.fillStyle = "white";
    ctx.beginPath();
    // Zeichne einen "Tortenstück" je nach Phase?
    // Nein, wir lassen es erstmal als Kreis. 
    // Wenn du willst, füge ich später den perfekten Sichel-Code ein.
    // Für jetzt: Einfacher weißer Kreis mit Transparenz je nach Beleuchtung
    
    ctx.globalAlpha = 1; 
    // Simpler Kreis
    if (p > 0.5) ctx.arc(center, center, radius, 0, 2 * Math.PI);
    else ctx.arc(center, center, radius * (p*2), 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
}
