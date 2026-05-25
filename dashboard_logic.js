// dashboard_logic.js
// Lógica para Consola Táctica de Fútbol - Proyecto final

document.addEventListener("DOMContentLoaded", () => {
    // ── VARIABLES GLOBALES ──
    let isTrackingRunning = false;
    let trackingAnimationFrameId = null;
    let biomechRotationAngle = 0;
    let biomechFrame = 0;
    let isDraggingBiomech = false;
    let startX = 0;

    // ── 1. BASE DE DATOS DINÁMICA DEL PLANTEL (SQUAD DATABASE) ──
    // Features alineados con el modelo Random Forest del notebook (MDPI Paper):
    // edad, peso, lesion_previa, tiempo_entrenamiento, aceleraciones, deceleraciones, hsr_distancia, acwr
    const squad = [
        { id: 10, name: "Lionel Messi",    position: "Extremo Derecho / Mediapunta", avatar: "10", edad: 36, peso: 72, acwr: 1.10, dec: 80,  acc: 90,  hsr: 350,  prevInjury: false, trainTime: 210, sleep: 8.2, soreness: 2 },
        { id: 9,  name: "Luis Suárez",     position: "Delantero Centro",            avatar: "9",  edad: 37, peso: 86, acwr: 1.55, dec: 210, acc: 185, hsr: 850,  prevInjury: true,  trainTime: 390, sleep: 7.1, soreness: 6 },
        { id: 5,  name: "Sergio Busquets", position: "Pivote Organizador",          avatar: "5",  edad: 35, peso: 76, acwr: 1.20, dec: 95,  acc: 75,  hsr: 120,  prevInjury: false, trainTime: 185, sleep: 7.9, soreness: 3 },
        { id: 18, name: "Jordi Alba",       position: "Lateral Izquierdo",           avatar: "18", edad: 34, peso: 70, acwr: 1.42, dec: 190, acc: 220, hsr: 1100, prevInjury: false, trainTime: 360, sleep: 8.0, soreness: 4 },
        { id: 21, name: "Frenkie de Jong",  position: "Mediocentro Mixto",           avatar: "21", edad: 26, peso: 74, acwr: 1.15, dec: 140, acc: 160, hsr: 750,  prevInjury: false, trainTime: 270, sleep: 8.4, soreness: 1 },
        { id: 1,  name: "M. ter Stegen",   position: "Portero",                     avatar: "1",  edad: 31, peso: 85, acwr: 0.85, dec: 30,  acc: 40,  hsr: 50,   prevInjury: false, trainTime: 150, sleep: 8.5, soreness: 0 },
        { id: 8,  name: "Pedri González",  position: "Mediocentro Creativo",        avatar: "8",  edad: 21, peso: 68, acwr: 1.65, dec: 230, acc: 195, hsr: 980,  prevInjury: true,  trainTime: 420, sleep: 6.8, soreness: 7 }
    ];

    let selectedPlayerId = 10;

    // ── DATOS DE TRACKING 2D (FIX #1: variables que faltaban) ──
    const homePlayers = [
        { id: 1, x: 80, y: 160, vx: 0.0, vy: 0.0, color: "#00ff85" }, // portero
        { id: 10, x: 300, y: 155, vx: 1.1, vy: -0.6, color: "#00ff85" }, // messi
        { id: 9, x: 450, y: 100, vx: -0.9, vy: 0.8, color: "#00ff85" }, // suarez
        { id: 5, x: 210, y: 200, vx: 0.6, vy: 0.7, color: "#00ff85" }, // busquets
        { id: 18, x: 170, y: 260, vx: 1.2, vy: -0.5, color: "#00ff85" }, // alba
        { id: 21, x: 330, y: 240, vx: -0.7, vy: 0.9, color: "#00ff85" }, // de jong
        { id: 8, x: 390, y: 180, vx: 0.8, vy: -0.8, color: "#00ff85" }, // pedri
    ];

    const awayPlayers = [
        { id: 1, x: 520, y: 160, vx: 0.0, vy: 0.0, color: "#ff0055" },
        { id: 7, x: 380, y: 110, vx: -0.8, vy: 0.7, color: "#ff0055" },
        { id: 11, x: 430, y: 220, vx: -1.0, vy: -0.5, color: "#ff0055" },
        { id: 4, x: 460, y: 160, vx: -0.6, vy: 0.6, color: "#ff0055" },
        { id: 6, x: 360, y: 270, vx: 0.5, vy: -0.9, color: "#ff0055" },
        { id: 3, x: 490, y: 240, vx: -0.9, vy: 0.4, color: "#ff0055" },
        { id: 8, x: 420, y: 80, vx: 0.7, vy: 0.8, color: "#ff0055" },
    ];

    const ball = { x: 300, y: 155, speed: 0.07 };

    // ── DATOS DE BIOMECÁNICA 3D (FIX #2: kickFrames que faltaba) ──
    // Genera 25 fotogramas de una animación de pateo de balón
    const kickFrames = [];
    for (let i = 0; i < 25; i++) {
        const t = i / 24; // 0.0 → 1.0
        const swing = Math.sin(t * Math.PI);        // arco del swing de la pierna
        const torso = Math.sin(t * Math.PI * 0.5);  // inclinación del torso

        kickFrames.push({
            head: { x: 5 * torso, y: 0, z: 172 + 4 * torso },
            shoulder: { x: 8 * torso, y: 0, z: 130 + 2 * torso },
            hip: { x: 2 * torso, y: 0, z: 85 },
            knee: { x: 18 + 30 * swing, y: 0, z: 52 - 22 * swing },
            foot: { x: 28 + 50 * swing, y: 0, z: 8 + 32 * swing },
            hand: { x: -28 - 18 * swing, y: 22, z: 118 + 8 * swing }
        });
    }

    // ── ENLACES DE ELEMENTOS UI ──
    const playerSelector = document.getElementById("player-selector");
    const btnPlayTracking = document.getElementById("btn-play-tracking");

    const acwrSlider = document.getElementById("acwr-slider");
    const accSlider = document.getElementById("acc-slider");
    const decSlider = document.getElementById("dec-slider");
    const hsrSlider = document.getElementById("hsr-slider");
    const prevInjuryCheckbox = document.getElementById("prev-injury-checkbox");

    const acwrVal = document.getElementById("acwr-val");
    const accVal = document.getElementById("acc-val");
    const decVal = document.getElementById("dec-val");
    const hsrVal = document.getElementById("hsr-val");

    const gaugeFill = document.getElementById("gauge-fill");
    const gaugeText = document.getElementById("gauge-text");
    const riskBadge = document.getElementById("risk-badge");
    const riskRecommendation = document.getElementById("risk-recommendation");

    const appPlayerAvatar = document.getElementById("app-player-avatar");
    const appPlayerName = document.getElementById("app-player-name");
    const appPlayerPosition = document.getElementById("app-player-position");
    const playerAcwrMetric = document.getElementById("player-acwr-metric");
    const playerRiskMetric = document.getElementById("player-risk-metric");
    const playerCoachAdvice = document.getElementById("player-coach-advice");
    const appPlayerSleep = document.getElementById("app-player-sleep");
    const appPlayerSoreness = document.getElementById("app-player-soreness");

    const alertsTableBody = document.getElementById("alerts-table-body");
    const chatInput = document.getElementById("chat-input");
    const chatBtn = document.getElementById("chat-btn");
    const chatHistory = document.getElementById("chat-history");

    const trackingCanvas = document.getElementById("tracking-canvas");
    const trackingCtx = trackingCanvas ? trackingCanvas.getContext("2d") : null;

    const biomechCanvas = document.getElementById("biomech-canvas");
    const biomechCtx = biomechCanvas ? biomechCanvas.getContext("2d") : null;

    if (trackingCanvas) {
        trackingCanvas.width = 600;
        trackingCanvas.height = 320;
    }
    if (biomechCanvas) {
        biomechCanvas.width = 400;
        biomechCanvas.height = 250;
    }

    // Sincronizar tamaño lógico del tracking canvas con el contenedor real
    function resizeTrackingCanvas() {
        if (!trackingCanvas) return;
        const container = trackingCanvas.parentElement;
        if (!container) return;
        const containerWidth = container.clientWidth;
        if (containerWidth > 0) {
            const ratio = 320 / 600;
            trackingCanvas.width = containerWidth;
            trackingCanvas.height = Math.round(containerWidth * ratio);
        }
    }

    resizeTrackingCanvas();
    window.addEventListener("resize", resizeTrackingCanvas);

    // ── 2. NAVEGACIÓN POR PESTAÑAS (SPA) ──
    const tabs = [
        { btn: document.getElementById("btn-tab-dashboard"), content: document.getElementById("tab-dashboard") },
        { btn: document.getElementById("btn-tab-player-app"), content: document.getElementById("tab-player-app") },
        { btn: document.getElementById("btn-tab-training"), content: document.getElementById("tab-training-plans") },
        { btn: document.getElementById("btn-tab-alerts"), content: document.getElementById("tab-risk-alerts") }
    ];

    function activateTab(targetContentId) {
        tabs.forEach(t => {
            if (t.btn) t.btn.classList.remove("active");
            if (t.content) t.content.classList.remove("active");

            if (t.content && t.content.id === targetContentId) {
                if (t.btn) t.btn.classList.add("active");
                t.content.classList.add("active");

                const statusText = document.getElementById("status-text");
                if (statusText && t.btn) {
                    statusText.textContent = t.btn.textContent.trim();
                }
            }
        });
    }

    tabs.forEach(tab => {
        if (tab.btn) {
            tab.btn.addEventListener("click", () => {
                activateTab(tab.content.id);
            });
        }
    });

    // ── 3. POBLACIÓN DINÁMICA DEL SELECTOR DE JUGADORES ──
    function populatePlayerSelector() {
        if (!playerSelector) return;
        playerSelector.innerHTML = "";
        squad.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.name} (#${p.avatar})`;
            if (p.id === selectedPlayerId) opt.selected = true;
            playerSelector.appendChild(opt);
        });
    }

    function loadSelectedPlayer(playerId) {
        selectedPlayerId = parseInt(playerId);
        const p = squad.find(player => player.id === selectedPlayerId);
        if (!p) return;

        acwrSlider.value = p.acwr;
        decSlider.value = p.dec;
        accSlider.value = p.acc;
        hsrSlider.value = p.hsr;
        prevInjuryCheckbox.checked = p.prevInjury;

        calculateInjuryRisk();
    }

    if (playerSelector) {
        playerSelector.addEventListener("change", (e) => {
            loadSelectedPlayer(e.target.value);
        });
    }

    // ── EVENTOS DE LOS SLIDERS (recalcular en tiempo real) ──
    [acwrSlider, accSlider, decSlider, hsrSlider].forEach(slider => {
        if (slider) slider.addEventListener("input", calculateInjuryRisk);
    });
    if (prevInjuryCheckbox) {
        prevInjuryCheckbox.addEventListener("change", calculateInjuryRisk);
    }

    // ── 4. CÁLCULO DE RIESGO ALINEADO CON EL MODELO RF DEL NOTEBOOK (8 features MDPI) ──
    // Features: acwr, deceleraciones, aceleraciones, hsr, lesion_previa, edad, peso, tiempo_entrenamiento
    // Importancias del RF (notebook cell 18): acwr > dec > hsr > acc > lesion_previa > tiempo > peso > edad
    function getFormulaRisk(acwr, dec, hsr, acc, prevInjury, edad, peso, trainTime) {
        let baseProb = 0.03;

        // 1. ACWR — mayor importancia según el paper MDPI y el RF del notebook
        if      (acwr > 1.5)  baseProb += 0.42;  // Danger Zone clásica
        else if (acwr > 1.3)  baseProb += 0.18;
        else if (acwr < 0.7)  baseProb += 0.10;  // Sub-carga también es riesgo (sub-preparación)

        // 2. Deceleraciones excéntricas — 2° predictor en importancia del RF
        if      (dec > 200)   baseProb += 0.20;
        else if (dec > 150)   baseProb += 0.10;

        // 3. HSR (High-Speed Running) + ACWR combinados — sinergia detectada por el RF
        if (hsr > 900 && acwr > 1.3)  baseProb += 0.22;
        else if (hsr > 700)            baseProb += 0.07;

        // 4. Aceleraciones de alta intensidad — 4° predictor (incluido en el modelo RF)
        if      (acc > 250)   baseProb += 0.12;
        else if (acc > 180)   baseProb += 0.06;

        // 5. Lesión previa — factor binario con peso directo según MDPI
        if (prevInjury)       baseProb += 0.15;

        // 6. Tiempo de entrenamiento semanal acumulado (trainTime en minutos)
        if (trainTime > 380)  baseProb += 0.08;
        else if (trainTime > 300) baseProb += 0.04;

        // 7. Edad — contribución menor según el RF (jugadores > 33 tienen mayor riesgo recuperación)
        if (edad > 33)        baseProb += 0.05;

        return Math.min(Math.max(baseProb, 0.01), 0.99);
    }

    function calculateInjuryRisk() {
        const acwr = parseFloat(acwrSlider.value);
        const acc = parseInt(accSlider.value);
        const dec = parseInt(decSlider.value);
        const hsr = parseInt(hsrSlider.value);
        const prevInjury = prevInjuryCheckbox.checked;

        acwrVal.textContent = acwr.toFixed(2);
        accVal.textContent = acc;
        decVal.textContent = dec;
        hsrVal.textContent = `${hsr}m`;

        const p = squad.find(player => player.id === selectedPlayerId);
        if (p) { p.acwr = acwr; p.acc = acc; p.dec = dec; p.hsr = hsr; p.prevInjury = prevInjury; }

        // Llamar con los 8 features alineados con el modelo RF del notebook
        const finalProb = getFormulaRisk(acwr, dec, hsr, acc, prevInjury, p ? p.edad : 25, p ? p.peso : 75, p ? p.trainTime : 240);
        const percentage = Math.round(finalProb * 100);

        const circumference = 377;
        const offset = circumference - (finalProb * circumference);
        let riskText = "Bajo";
        let colorTheme = "#00ff85";

        if (gaugeFill) {
            gaugeFill.style.strokeDashoffset = offset;
            if (finalProb < 0.35) {
                gaugeFill.style.stroke = colorTheme;
                riskBadge.textContent = "Riesgo Bajo";
                riskBadge.className = "risk-level-badge low";
                riskRecommendation.innerHTML = `<strong>Recomendación:</strong> Carga óptima para ${p.name}. Apto para continuar a máxima intensidad.`;
            } else if (finalProb < 0.65) {
                colorTheme = "#ffaa00";
                gaugeFill.style.stroke = colorTheme;
                riskBadge.textContent = "Riesgo Moderado";
                riskBadge.className = "risk-level-badge medium";
                riskRecommendation.innerHTML = `<strong>Recomendación:</strong> Fatiga detectada en ${p.name}. Limitar piques en sprint y regular la sesión táctica.`;
                riskText = "Moderado";
            } else {
                colorTheme = "#ff0055";
                gaugeFill.style.stroke = colorTheme;
                riskBadge.textContent = "Riesgo Crítico";
                riskBadge.className = "risk-level-badge high";
                riskRecommendation.innerHTML = `<strong>Alerta Médica:</strong> Sobrecarga severa para ${p.name}. Riesgo de lesión inminente. Exclusión sugerida.`;
                riskText = "Crítico";
            }
        }

        if (gaugeText) gaugeText.textContent = `${percentage}%`;

        if (appPlayerAvatar) appPlayerAvatar.textContent = p.avatar;
        if (appPlayerName) appPlayerName.textContent = p.name;
        if (appPlayerPosition) appPlayerPosition.textContent = p.position;
        if (appPlayerSleep) appPlayerSleep.textContent = `${p.sleep} hrs`;
        if (appPlayerSoreness) appPlayerSoreness.textContent = `${p.soreness} / 10`;

        if (playerAcwrMetric) playerAcwrMetric.textContent = acwr.toFixed(2);
        if (playerRiskMetric) {
            playerRiskMetric.textContent = riskText.toUpperCase();
            playerRiskMetric.style.color = colorTheme;
        }

        if (playerCoachAdvice) {
            if (finalProb < 0.35) {
                playerCoachAdvice.innerHTML = `Hola ${p.name}, estás en tu <strong>zona óptima de rendimiento</strong> (ACWR en ${acwr.toFixed(2)}). Tus métricas de dolor y recuperación son óptimas. ¡Sigue así!`;
            } else if (finalProb < 0.65) {
                playerCoachAdvice.innerHTML = `¡Atención ${p.name}! El sensor reporta una acumulación de <strong>fatiga muscular</strong>. Hoy reduce tu entrenamiento de sprints y prioriza terapia de masajes.`;
            } else {
                playerCoachAdvice.innerHTML = `⚠️ <strong>ALERTA DE DESCANSO:</strong> Tu riesgo fisiológico es CRÍTICO (${percentage}%). El cuerpo médico te ha excluido de los ejercicios de campo hoy. Realiza hidroterapia.`;
            }
        }

        renderAlertsTable();
    }

    function renderAlertsTable() {
        if (!alertsTableBody) return;
        alertsTableBody.innerHTML = "";

        squad.forEach(p => {
            const prob = getFormulaRisk(p.acwr, p.dec, p.hsr, p.acc, p.prevInjury, p.edad, p.peso, p.trainTime);
            const percentage = Math.round(prob * 100);
            let riskText = "Bajo";
            let riskClass = "low";
            let colorTheme = "#00ff85";

            if (prob >= 0.35 && prob < 0.65) { riskText = "Medio"; riskClass = "medium"; colorTheme = "#ffaa00"; }
            else if (prob >= 0.65) { riskText = "Crítico"; riskClass = "high"; colorTheme = "#ff0055"; }

            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            if (p.id === selectedPlayerId) {
                tr.style.background = "rgba(0, 255, 133, 0.08)";
                tr.style.borderLeft = "4px solid var(--accent-volt)";
            }

            tr.innerHTML = `
                <td style="font-weight: bold; color: #fff;">${p.name} (#${p.avatar})</td>
                <td style="font-size: 0.85rem; color: var(--text-secondary);">${p.position}</td>
                <td>${p.acwr.toFixed(2)}</td>
                <td>${p.dec}</td>
                <td>${p.hsr}m</td>
                <td style="color: ${colorTheme}; font-weight: bold;">${percentage}%</td>
                <td><span class="risk-level-badge ${riskClass}">Riesgo ${riskText}</span></td>
            `;

            tr.addEventListener("click", () => {
                activateTab("tab-dashboard");
                selectedPlayerId = p.id;
                if (playerSelector) playerSelector.value = p.id;
                loadSelectedPlayer(p.id);
            });

            alertsTableBody.appendChild(tr);
        });
    }

    populatePlayerSelector();
    loadSelectedPlayer(10);

    // ── 5. TRACKING 2D (FIX #3: iniciar el loop en carga) ──
    function drawSoccerField() {
        if (!trackingCtx) return;
        const ctx = trackingCtx;
        const w = trackingCanvas.width;
        const h = trackingCanvas.height;

        ctx.fillStyle = "#05130b";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, w - 40, h - 40);

        ctx.beginPath();
        ctx.moveTo(w / 2, 20);
        ctx.lineTo(w / 2, h - 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 50, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fill();

        ctx.strokeRect(20, h / 2 - 60, 60, 120);
        ctx.strokeRect(w - 80, h / 2 - 60, 60, 120);
    }

    function animateTracking() {
        if (!trackingCtx) return;
        const ctx = trackingCtx;
        const w = trackingCanvas.width;
        const h = trackingCanvas.height;

        drawSoccerField();

        homePlayers.forEach(p => {
            if (isTrackingRunning) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 30 || p.x > w - 30) p.vx *= -1;
                if (p.y < 30 || p.y > h - 30) p.vy *= -1;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = "#fff";
            ctx.font = "9px Share Tech Mono";
            ctx.fillText(`H${p.id}`, p.x - 7, p.y - 12);
        });

        awayPlayers.forEach(p => {
            if (isTrackingRunning) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 30 || p.x > w - 30) p.vx *= -1;
                if (p.y < 30 || p.y > h - 30) p.vy *= -1;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, 2 * Math.PI);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = "#fff";
            ctx.font = "9px Share Tech Mono";
            ctx.fillText(`A${p.id}`, p.x - 7, p.y - 12);
        });

        if (isTrackingRunning) {
            const target = homePlayers[1];
            ball.x += (target.x - ball.x) * ball.speed;
            ball.y += (target.y - ball.y) * ball.speed;
        }

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        trackingAnimationFrameId = requestAnimationFrame(animateTracking);
    }

    if (btnPlayTracking) {
        btnPlayTracking.addEventListener("click", () => {
            isTrackingRunning = !isTrackingRunning;
            if (isTrackingRunning) {
                btnPlayTracking.textContent = "Pausar Tracking Metrica";
                btnPlayTracking.classList.remove("btn-primary");
                btnPlayTracking.classList.add("btn-secondary");
            } else {
                btnPlayTracking.textContent = "Iniciar Simulación Metrica";
                btnPlayTracking.classList.remove("btn-secondary");
                btnPlayTracking.classList.add("btn-primary");
            }
        });
    }

    // Iniciar el loop de tracking al cargar la página (campo visible desde el inicio)
    animateTracking();

    // ── 6. VISOR BIOMECÁNICO 3D (kickFrames ya definido arriba) ──
    function drawBiomechanics() {
        if (!biomechCtx) return;
        const ctx = biomechCtx;
        const w = biomechCanvas.width;
        const h = biomechCanvas.height;

        ctx.fillStyle = "#050811";
        ctx.fillRect(0, 0, w, h);

        const centerX = w / 2;
        const centerY = h / 2 + 30;
        const scale = 1.3;
        const frameData = kickFrames[biomechFrame];

        function project3D(pt) {
            const rad = (biomechRotationAngle * Math.PI) / 180;
            const rotatedX = pt.x * Math.cos(rad) - pt.y * Math.sin(rad);
            return {
                x: centerX + rotatedX * scale,
                y: centerY - pt.z * scale
            };
        }

        const projHead = project3D(frameData.head);
        const projShoulder = project3D(frameData.shoulder);
        const projHip = project3D(frameData.hip);
        const projKnee = project3D(frameData.knee);
        const projFoot = project3D(frameData.foot);
        const projHand = project3D(frameData.hand);

        ctx.strokeStyle = "rgba(0, 255, 133, 0.75)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(0, 255, 133, 0.4)";
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(projHead.x, projHead.y);
        ctx.lineTo(projShoulder.x, projShoulder.y);
        ctx.lineTo(projHip.x, projHip.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(projShoulder.x, projShoulder.y);
        ctx.lineTo(projHand.x, projHand.y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 0, 85, 0.95)";
        ctx.shadowColor = "rgba(255, 0, 85, 0.4)";
        ctx.beginPath();
        ctx.moveTo(projHip.x, projHip.y);
        ctx.lineTo(projKnee.x, projKnee.y);
        ctx.lineTo(projFoot.x, projFoot.y);
        ctx.stroke();

        const projKneeSupport = project3D({ x: -10, y: -10, z: 50 });
        const projFootSupport = project3D({ x: -12, y: -15, z: 0 });
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(projHip.x, projHip.y);
        ctx.lineTo(projKneeSupport.x, projKneeSupport.y);
        ctx.lineTo(projFootSupport.x, projFootSupport.y);
        ctx.stroke();

        const joints = [projHead, projShoulder, projHip, projKnee, projFoot, projHand];
        joints.forEach((j, idx) => {
            ctx.beginPath();
            ctx.arc(j.x, j.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = (idx === 3 || idx === 4) ? "#ff0055" : "#00ff85";
            ctx.fill();
        });

        biomechFrame = (biomechFrame + 1) % 25;

        const kneeAngleVal = document.getElementById("knee-angle-val");
        if (kneeAngleVal) {
            const angleVal = 110 + Math.abs(Math.sin(biomechFrame / 24 * Math.PI) * 55);
            kneeAngleVal.textContent = `${Math.round(angleVal)}°`;
        }
    }

    setInterval(drawBiomechanics, 60);

    if (biomechCanvas) {
        biomechCanvas.addEventListener("mousedown", (e) => {
            isDraggingBiomech = true;
            startX = e.clientX;
        });
        window.addEventListener("mouseup", () => {
            isDraggingBiomech = false;
        });
        biomechCanvas.addEventListener("mousemove", (e) => {
            if (!isDraggingBiomech) return;
            const deltaX = e.clientX - startX;
            startX = e.clientX;
            biomechRotationAngle = (biomechRotationAngle + deltaX * 0.8) % 360;
        });
    }

    // ── 7. MOTOR CONVERSACIONAL MULTI-AGENTE (ReAct / LangGraph Simulator) ──

    // Respuestas contextuales dinámicas por agente, usando datos reales del jugador seleccionado
    function getAgentLines(agentKey, p, gaugeVal) {
        if (agentKey === "fisico") return [
            `📡 Leyendo telemetría GPS de ${p.name}... ACWR actual: ${p.acwr.toFixed(2)} (Relación Carga Aguda:Crónica).`,
            `🔬 Modelo LSTM detecta ${p.dec} deceleraciones excéntricas y ${p.acc} aceleraciones de alta intensidad. Tiempo total semanal: ${p.trainTime} min.`,
            `⚠️ Riesgo de lesión no-contacto (Modelo RF/MDPI): ${gaugeVal}. ${p.prevInjury ? "Historial de lesión previa activo — Protocolo de alerta iniciado." : "Sin antecedentes de lesión registrados."}`
        ];
        if (agentKey === "tactico") return [
            `🗺️ Consultando base de datos StatsBomb para ${p.name} en posición: ${p.position}...`,
            `📊 Con ACWR=${p.acwr.toFixed(2)}, la tasa de pases clave cae aproximadamente un ${Math.round(Math.abs(p.acwr - 1) * 18)}% respecto al baseline óptimo del jugador. HSR acumulado (${p.hsr}m) reduce los cambios de dirección efectivos.`,
            `🎯 Recomendación táctica: ${p.acwr > 1.4 ? `Reubicar a ${p.name} en un rol de menor pressing. Evitar transiciones largas de campo en este microciclo.` : `${p.name} puede ejecutar su rol habitual con presión alta. Rendimiento táctico esperado: normal.`}`
        ];
        if (agentKey === "nutricional") return [
            `🥗 Calculando protocolo nutricional para ${p.name} (${p.peso} kg, ${p.edad} años)...`,
            `💊 Gasto calórico estimado por GPS: ${Math.round(p.hsr * 0.08 + p.dec * 2)} kcal adicionales. Se requiere recarga de carbohidratos complejos y proteínas de alto valor biológico.`,
            `💧 Prescripción: ${p.acwr > 1.4
                ? `Batido de recuperación (BCAA 6g + carbohidratos 45g) en los próximos 30 min. Hidratación isotónica: ${Math.round(p.peso * 0.035 * 1000)}ml en 2 horas.`
                : `Alimentación post-entrenamiento estándar. Hidratación base: ${Math.round(p.peso * 0.03 * 1000)}ml.`}`
        ];
        return [];
    }

    // Agregar un mensaje al historial del chat
    function appendMessage(sender, text, role) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-msg ${role}`;

        let senderClass = "orchestrator";
        if (sender.toLowerCase().includes("físico"))  senderClass = "physical";
        if (sender.toLowerCase().includes("táctico")) senderClass = "tactical";
        if (sender.toLowerCase().includes("nutri"))   senderClass = "nutrition";
        if (sender.toLowerCase().includes("usuario")) senderClass = "user";

        msgDiv.innerHTML = `<span class="msg-sender ${senderClass}">${sender}</span><p>${text}</p>`;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Enviar líneas de un agente en secuencia, con delay entre cada una
    function sequentialAppend(sender, lines, role, startDelay, onDone) {
        lines.forEach((line, i) => {
            setTimeout(() => {
                appendMessage(sender, line, role);
                chatHistory.scrollTop = chatHistory.scrollHeight;
                if (i === lines.length - 1 && onDone) onDone();
            }, startDelay + i * 980);
        });
    }

    // Detectar qué dominios toca la consulta del usuario
    function detectDomains(q) {
        const qL = q.toLowerCase();
        const d = {
            fisico:      /lesion|carga|físico|acwr|fatig|sprint|deceler|hsr|gps|muscul|sobrecarga|sensor/.test(qL),
            tactico:     /tácti|táctica|pase|statsbomb|posici|pressing|transici|ataque|defens|formaci|juego/.test(qL),
            nutricional: /nutri|dieta|carbohid|proteín|hidrat|bcaa|calor|recuper|comida|sueño|alimenta/.test(qL)
        };
        // Si la consulta pide análisis general o no encaja en ningún dominio → activar los 3
        if (!d.fisico && !d.tactico && !d.nutricional ||
            /todo|completo|todos|general|resumen|análisis|informe|estado del jugador/.test(qL)) {
            d.fisico = d.tactico = d.nutricional = true;
        }
        return d;
    }

    function processAgentQuery(query) {
        appendMessage("Usuario", query, "user");

        const p = squad.find(player => player.id === selectedPlayerId);
        const d = detectDomains(query);
        const active = ["fisico", "tactico", "nutricional"].filter(k => d[k]);

        // Mensaje del Orquestador: informa qué agentes se van a activar
        const agentLabels = { fisico: "Físico (LSTM/MDPI)", tactico: "Táctico (StatsBomb)", nutricional: "Nutricional" };
        const labelList = active.map(k => agentLabels[k]).join(" → ");
        const opening = active.length >= 2
            ? `🔗 Consulta multi-dominio detectada. Activando ${active.length} agentes: ${labelList}. Iniciando grafo de decisión ReAct...`
            : `Solicitud procesada. Dirigiendo al agente: ${labelList}.`;

        setTimeout(() => {
            appendMessage("Cerebro Orquestador", opening, "agent");

            // Programar las respuestas de cada agente en secuencia sin solapamiento
            const PER_LINE = 980;
            let cumulativeDelay = 1400;

            active.forEach(agentKey => {
                const lines = getAgentLines(agentKey, p, gaugeText ? gaugeText.textContent : "N/A");
                const label = agentLabels[agentKey];
                sequentialAppend(label, lines, "agent", cumulativeDelay, null);
                cumulativeDelay += lines.length * PER_LINE + 700;
            });

            // Síntesis final del Orquestador
            setTimeout(() => {
                const synthesis = active.length >= 2
                    ? `✅ Síntesis Multi-Agente completada para ${p.name}. Los ${active.length} agentes han emitido sus análisis de forma coordinada. Consulta "Planes de Entrenamiento" para el plan de acción integrado.`
                    : `✅ Análisis completado para ${p.name}. Consulta el panel de alertas para más detalles.`;
                appendMessage("Cerebro Orquestador — Síntesis Final", synthesis, "agent");
            }, cumulativeDelay);

        }, 500);
    }

    if (chatBtn) {
        chatBtn.addEventListener("click", () => {
            const query = chatInput.value.trim();
            if (query) { processAgentQuery(query); chatInput.value = ""; }
        });
    }

    if (chatInput) {
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const query = chatInput.value.trim();
                if (query) { processAgentQuery(query); chatInput.value = ""; }
            }
        });
    }

    window.triggerQuickPrompt = function (text) {
        processAgentQuery(text);
    };
});