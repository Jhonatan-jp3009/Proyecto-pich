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
    const squad = [
        { id: 10, name: "Lionel Messi", position: "Extremo Derecho / Mediapunta", avatar: "10", acwr: 1.10, dec: 80, acc: 90, hsr: 350, prevInjury: false, sleep: 8.2, soreness: 2 },
        { id: 9, name: "Luis Suárez", position: "Delantero Centro", avatar: "9", acwr: 1.55, dec: 210, acc: 185, hsr: 850, prevInjury: true, sleep: 7.1, soreness: 6 },
        { id: 5, name: "Sergio Busquets", position: "Pivote Organizador", avatar: "5", acwr: 1.20, dec: 95, acc: 75, hsr: 120, prevInjury: false, sleep: 7.9, soreness: 3 },
        { id: 18, name: "Jordi Alba", position: "Lateral Izquierdo", avatar: "18", acwr: 1.42, dec: 190, acc: 220, hsr: 1100, prevInjury: false, sleep: 8.0, soreness: 4 },
        { id: 21, name: "Frenkie de Jong", position: "Mediocentro Mixto", avatar: "21", acwr: 1.15, dec: 140, acc: 160, hsr: 750, prevInjury: false, sleep: 8.4, soreness: 1 },
        { id: 1, name: "M. ter Stegen", position: "Portero", avatar: "1", acwr: 0.85, dec: 30, acc: 40, hsr: 50, prevInjury: false, sleep: 8.5, soreness: 0 },
        { id: 8, name: "Pedri González", position: "Mediocentro Creativo", avatar: "8", acwr: 1.65, dec: 230, acc: 195, hsr: 980, prevInjury: true, sleep: 6.8, soreness: 7 }
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

    // ── 4. CÁLCULO DE RIESGO E INTEGRACIÓN MULTI-TAB ──
    function getFormulaRisk(acwr, dec, hsr, prevInjury) {
        let baseProb = 0.03;
        if (acwr > 1.5) baseProb += 0.38;
        else if (acwr < 0.7) baseProb += 0.12;
        if (dec > 180) baseProb += 0.18;
        if (hsr > 900 && acwr > 1.4) baseProb += 0.22;
        if (prevInjury) baseProb += 0.15;
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

        const finalProb = getFormulaRisk(acwr, dec, hsr, prevInjury);
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
            const prob = getFormulaRisk(p.acwr, p.dec, p.hsr, p.prevInjury);
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

    // ── 7. MOTOR CONVERSACIONAL DE AGENTE DE IA (RAG) ──
    function appendMessage(sender, text, role) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-msg ${role}`;

        let senderClass = "orchestrator";
        if (sender.toLowerCase().includes("físico")) senderClass = "physical";
        if (sender.toLowerCase().includes("táctico")) senderClass = "tactical";
        if (sender.toLowerCase().includes("nutri")) senderClass = "nutrition";
        if (sender.toLowerCase().includes("usuario")) senderClass = "user";

        msgDiv.innerHTML = `<span class="msg-sender ${senderClass}">${sender}</span><p>${text}</p>`;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function processAgentQuery(query) {
        appendMessage("Usuario", query, "user");

        setTimeout(() => {
            appendMessage("Cerebro Orquestador", "Solicitud ruteada con éxito. Ejecutando agentes del grafo...", "agent");

            setTimeout(() => {
                const qLower = query.toLowerCase();
                const currentP = squad.find(player => player.id === selectedPlayerId);

                if (qLower.includes("lesion") || qLower.includes("carga") || qLower.includes("físico")) {
                    appendMessage("Agente Físico (LSTM)", `Evaluando sensores de ${currentP.name}. Su relación de carga aguda:crónica (ACWR) se encuentra en ${currentP.acwr.toFixed(2)}. El nivel de fatiga general aconseja regular su participación táctica inmediata.`, "agent");
                } else if (qLower.includes("recupera") || qLower.includes("nutri")) {
                    appendMessage("Agente Nutricional", `Prescripción para ${currentP.name}: Debido al volumen de sprint y deceleraciones acumuladas, se prescribe batido recuperador rico en aminoácidos de cadena ramificada (BCAA) y carbohidratos de asimilación rápida en los próximos 45 minutos.`, "agent");
                } else if (qLower.includes("tácti") || qLower.includes("pase") || qLower.includes("statsbomb")) {
                    appendMessage("Agente Táctico (StatsBomb)", `Analizando datos de StatsBomb para ${currentP.name}. La fatiga física impactará directamente su precisión en transiciones en un 12%. Sugerimos reposicionamiento táctico conservador.`, "agent");
                } else {
                    appendMessage("Agente Físico (LSTM)", `Evaluando métricas de la plantilla. Riesgo estimado para ${currentP.name}: ${gaugeText.textContent}.`, "agent");
                }

                setTimeout(() => {
                    appendMessage("Cerebro Orquestador - Final", "Planes de prevención adaptativos calculados y listos para consulta del staff.", "agent");
                }, 1500);
            }, 1000);
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