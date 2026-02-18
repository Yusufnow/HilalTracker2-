// Zeichnet den Himmel (Sonne, Mond, Planeten) auf das Canvas

function updateSkyView(date, lat, lon) {
    const canvas = document.getElementById("skyCanvas");
    if (!canvas) return; // Abbruch, falls Canvas nicht gefunden
    const ctx = canvas.getContext("2d");
    
    // Canvas Größe an das Handy anpassen
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 200;

    // 1. Hintergrund malen (Farbverlauf für Dämmerung)
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, "#0b1026"); // Oben: Dunkles Nachtblau
    grad.addColorStop(1, "#4b2d5e"); // Unten: Lila/Orange (Sonnenuntergang)
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Horizont-Linie
    const horizonY = 150; // Horizont liegt bei 150px Höhe
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(canvas.width, horizonY);
    ctx.stroke();

    // 3. Positionen der Himmelskörper berechnen
    const observer = new Astronomy.Observer(lat, lon, 0);
    
    // Liste der Körper, die wir zeichnen wollen
    const bodies = [
        {name: "Sonne", obj: Astronomy.Body.Sun, color: "#FFD700", r: 14, glow: true},
        {name: "Mond", obj: Astronomy.Body.Moon, color: "#FFFFFF", r: 10, glow: false}, // Mond weiß
        {name: "Venus", obj: Astronomy.Body.Venus, color: "#00FFFF", r: 6, glow: true},  // Venus türkis
        {name: "Jupiter", obj: Astronomy.Body.Jupiter, color: "#FFDAB9", r: 5, glow: true}, // Jupiter beige
        {name: "Saturn", obj: Astronomy.Body.Saturn, color: "#F4A460", r: 4, glow: true}, // Saturn gelblich
        {name: "Mars", obj: Astronomy.Body.Mars, color: "#FF4500", r: 4, glow: true}      // Mars rot
    ];

    // Wir schauen Richtung Westen (270 Grad), weil dort der Hilal zu sehen ist
    const centerAz = 270; 
    const scaleX = 4; // Zoom-Faktor (Pixel pro Grad)
    const scaleY = 4; 

    bodies.forEach(body => {
        // Exakte Position berechnen (Astronomie-Bibliothek)
        const equ = Astronomy.Equator(body.obj, date, observer, true, true);
        const hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, 'normal');

        // Wo ist das Objekt relativ zu unserer Blickrichtung (Westen)?
        let deltaAz = hor.az - centerAz;

        // Mathe-Korrektur, damit Objekte nicht springen (360° Problem)
        if (deltaAz > 180) deltaAz -= 360;
        if (deltaAz < -180) deltaAz += 360;

        // X und Y Koordinaten auf dem Bildschirm berechnen
        const x = (canvas.width / 2) + (deltaAz * scaleX);
        const y = horizonY - (hor.alt * scaleY);

        // Nur zeichnen, wenn das Objekt im Bild ist
        if (x > -30 && x < canvas.width + 30 && y > -30 && y < canvas.height + 30) {
            
            // Leuchteffekt (Glow)
            if (body.glow) {
                ctx.beginPath();
                ctx.arc(x, y, body.r * 2.5, 0, 2 * Math.PI);
                ctx.fillStyle = body.color;
                ctx.globalAlpha = 0.3; // Durchsichtig
                ctx.fill();
                ctx.globalAlpha = 1.0; // Reset
            }

            // Der Körper selbst
            ctx.beginPath();
            ctx.arc(x, y, body.r, 0, 2 * Math.PI);
            ctx.fillStyle = body.color;
            ctx.fill();

            // Name darunter schreiben
            ctx.fillStyle = "white";
            ctx.font = "11px sans-serif";
            ctx.textAlign = "center";
            // Text nur anzeigen, wenn er nicht zu tief unter dem Horizont ist
            if (hor.alt > -5) {
                ctx.fillText(body.name, x, y + body.r + 15);
            }
        }
    });
}
