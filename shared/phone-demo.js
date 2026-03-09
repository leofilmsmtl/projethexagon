/**
 * Phone Demo Animation — Shared Source of Truth
 * Used by: index.html (presentation) and gameplay/index.html (GDD)
 * 
 * Expects these DOM elements to exist:
 *   #hexGrid, #hexStroke, #playerPuck, #enemyPuck, #fogOverlay,
 *   #hexTicks, #attackBtn, #attackIcon, #holdFill, #borderLoader,
 *   #traceLine, #captureFlash, #scorePopup, #hexCount, #scoreDisplay,
 *   #gamePhone, #hexMenu, #menuShield, #demoHint, #bottomPill
 * 
 * Config via data attribute on #gamePhone:
 *   data-fog-src="path/to/fog-texture.png"
 */
(function () {
    const HEX_R = 28, PHONE_W = 360, PHONE_H = 760;
    const HEX_W = Math.sqrt(3) * HEX_R;
    const COLS = 9, ROWS = 16;
    const hSp = HEX_W, vSp = 1.5 * HEX_R;

    function hexCenter(row, col) {
        return { x: col * hSp + (row % 2 === 1 ? hSp / 2 : 0) + HEX_W / 2, y: row * vSp + HEX_R };
    }
    function hexPts(cx, cy, r) {
        const pts = [];
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
        return pts;
    }
    function ptsStr(pts) { return pts.map(p => p.join(',')).join(' '); }

    // Build hex grid
    const svg = document.getElementById('hexGrid'); if (!svg) return;
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        const { x: cx, y: cy } = hexCenter(row, col);
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', ptsStr(hexPts(cx, cy, HEX_R)));
        poly.setAttribute('fill', 'none'); poly.setAttribute('stroke', 'none'); poly.setAttribute('stroke-width', '0');
        poly.setAttribute('data-row', row); poly.setAttribute('data-col', col);
        svg.appendChild(poly);
    }

    // Fog canvas
    const fogC = document.createElement('canvas');
    fogC.width = PHONE_W; fogC.height = PHONE_H; fogC.style.cssText = 'width:100%;height:100%;';
    const ctx = fogC.getContext('2d');
    document.getElementById('fogOverlay').appendChild(fogC);

    // Refs
    const hexStroke = document.getElementById('hexStroke');
    const puck = document.getElementById('playerPuck');
    const attackBtn = document.getElementById('attackBtn');
    const borderLoader = document.getElementById('borderLoader');
    const traceLine = document.getElementById('traceLine');
    const captureFlash = document.getElementById('captureFlash');
    const scorePopup = document.getElementById('scorePopup');
    const hexTicks = document.getElementById('hexTicks');
    const gamePhone = document.getElementById('gamePhone');
    const hint = document.getElementById('demoHint');

    const stealTarget = { row: 6, col: 3 };
    const enemyHexes = [[7, 3], [8, 4], [8, 3], [stealTarget.row, stealTarget.col]];
    const walkPath = [[8, 4], [8, 5], [7, 5], [7, 4], [7, 3], [6, 3], [6, 4], [5, 4], [5, 3], [6, 3]];

    let revealedHexes = new Set();
    let playerHexes = new Set();
    let fogPattern = null;
    let animationActive = false;

    const HEX_FILL_A = '55', HEX_STROKE_A = 'BB';
    const PLAYER_HEX = '#60a5fa';
    const ENEMY_HEX = '#f59e0b';

    // Load fog texture — path from data attribute or default
    const fogSrc = gamePhone.getAttribute('data-fog-src') || 'fog-texture.png';
    const fogImg = new Image();
    fogImg.src = fogSrc;
    fogImg.onload = function () {
        const tmpC = document.createElement('canvas');
        tmpC.width = fogImg.width / 2; tmpC.height = fogImg.height / 2;
        tmpC.getContext('2d').drawImage(fogImg, 0, 0, tmpC.width, tmpC.height);
        fogPattern = ctx.createPattern(tmpC, 'repeat');
        drawFullFog(); startStoryAnimation();
    };
    fogImg.onerror = function () {
        fogPattern = '#0A0A0F';
        drawFullFog(); startStoryAnimation();
    };

    function drawFullFog() {
        ctx.clearRect(0, 0, PHONE_W, PHONE_H);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = fogPattern;
        ctx.fillRect(0, 0, PHONE_W, PHONE_H);
    }

    function revealHex(row, col) {
        const key = row + ',' + col;
        if (revealedHexes.has(key)) return;
        revealedHexes.add(key);
        const { x: cx, y: cy } = hexCenter(row, col);
        const pts = hexPts(cx, cy, HEX_R + 2);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    function claimHex(row, col) {
        playerHexes.add(row + ',' + col);
        document.querySelectorAll('#hexGrid polygon').forEach(p => {
            if (+p.getAttribute('data-row') === row && +p.getAttribute('data-col') === col) {
                p.setAttribute('fill', PLAYER_HEX + HEX_FILL_A);
                p.setAttribute('stroke', PLAYER_HEX + HEX_STROKE_A);
                p.setAttribute('stroke-width', '1.5');
            }
        });
    }

    function markEnemy(row, col) {
        document.querySelectorAll('#hexGrid polygon').forEach(p => {
            if (+p.getAttribute('data-row') === row && +p.getAttribute('data-col') === col) {
                p.setAttribute('fill', ENEMY_HEX + HEX_FILL_A);
                p.setAttribute('stroke', ENEMY_HEX + HEX_STROKE_A);
                p.setAttribute('stroke-width', '1.5');
            }
        });
    }

    function movePuck(row, col) {
        const { x, y } = hexCenter(row, col);
        puck.style.transition = 'left 0.6s ease, top 0.6s ease';
        puck.style.left = x + 'px'; puck.style.top = y + 'px';
    }

    function showPopup(text, color) {
        scorePopup.textContent = text; scorePopup.style.color = color || '#fbbf24';
        scorePopup.style.textShadow = `0 0 30px ${color || '#fbbf24'}80`;
        scorePopup.style.transition = 'none';
        scorePopup.style.opacity = '1'; scorePopup.style.transform = 'translate(-50%,-50%) scale(1.2)';
        setTimeout(() => { scorePopup.style.transition = 'all 1s ease-out'; scorePopup.style.opacity = '0'; scorePopup.style.transform = 'translate(-50%,-80%) scale(0.8)'; }, 800);
    }

    function flash() {
        captureFlash.style.transition = 'none'; captureFlash.style.opacity = '0.6';
        setTimeout(() => { captureFlash.style.transition = 'opacity 0.4s'; captureFlash.style.opacity = '0'; }, 60);
    }

    let hexCount = 0, score = 0;
    function updateStats() {
        document.getElementById('hexCount').textContent = ' ' + hexCount;
        document.getElementById('scoreDisplay').textContent = ' ' + score.toLocaleString();
    }

    // ===== STORYTELLING ANIMATION =====
    function startStoryAnimation() {
        if (animationActive) return;
        animationActive = true;

        revealedHexes.clear(); playerHexes.clear();
        hexCount = 0; score = 0; updateStats();
        drawFullFog();
        puck.style.transition = 'none'; puck.style.opacity = '0';
        document.getElementById('enemyPuck').style.opacity = '0';
        document.getElementById('hexMenu').style.opacity = '0';
        hexStroke.setAttribute('points', ''); hexStroke.style.strokeDashoffset = '999'; hexStroke.style.filter = '';
        borderLoader.style.opacity = '0'; hexTicks.style.opacity = '0';
        attackBtn.style.color = ENEMY_HEX; attackBtn.style.animation = 'none';
        document.getElementById('attackIcon').textContent = '⚔️';

        document.querySelectorAll('#hexGrid polygon').forEach(p => {
            p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'none'); p.setAttribute('stroke-width', '0');
        });

        enemyHexes.forEach(([r, c]) => markEnemy(r, c));

        const steps = [];
        let t = 500;

        steps.push([t, () => { if (hint) hint.textContent = '🌑 La carte commence cachée sous le fog of war…'; }]);
        t += 2000;

        steps.push([t, () => {
            const start = walkPath[0];
            movePuck(start[0], start[1]);
            puck.style.transition = 'opacity 0.5s'; puck.style.opacity = '1';
            if (hint) hint.textContent = '🚶 Le joueur se déplace en marchant ou à vélo…';
        }]);
        t += 800;

        walkPath.forEach(([row, col]) => {
            steps.push([t, () => { movePuck(row, col); revealHex(row, col); }]);
            t += 200;
            if (enemyHexes.some(([er, ec]) => er === row && ec === col)) {
                steps.push([t, () => { if (hint) hint.textContent = '🔴 Territoire ennemi détecté !'; }]);
                t += 600;
            } else { t += 400; }
        });
        t += 400;

        const sc = hexCenter(stealTarget.row, stealTarget.col);
        const sPts = hexPts(sc.x, sc.y, HEX_R);
        steps.push([t, () => {
            movePuck(stealTarget.row, stealTarget.col);
            hexStroke.setAttribute('points', ptsStr(sPts));
            hexStroke.setAttribute('fill', ENEMY_HEX + '15');
            hexStroke.setAttribute('stroke', ENEMY_HEX);
            if (hint) { hint.innerHTML = '👇👇 <strong style="font-size:16px;">MAINTENEZ ⚔️ POUR VOLER !</strong> 👇👇'; hint.style.color = '#fbbf24'; hint.style.fontSize = '15px'; }
            attackBtn.style.animation = 'btnPulse 0.8s ease-in-out infinite';
            enableCapture();
            autoTimer = setTimeout(() => { if (captureEnabled && !isHolding) autoCapture(); }, 6000);
        }]);

        steps.forEach(([delay, fn]) => setTimeout(fn, delay));
    }

    // ===== INTERACTIVE CAPTURE =====
    let isHolding = false, holdInterval = null;
    const holdDuration = 3000;
    let captureEnabled = false;
    let autoTimer = null;

    function enableCapture() {
        captureEnabled = true;
        const bLen = traceLine.getTotalLength(), hLen = hexStroke.getTotalLength();
        traceLine.style.strokeDasharray = bLen; traceLine.style.strokeDashoffset = bLen;
        hexStroke.style.strokeDasharray = hLen; hexStroke.style.strokeDashoffset = hLen;
    }

    function autoCapture() {
        if (!captureEnabled || isHolding) return;
        if (hint) { hint.textContent = '🔥 Capture automatique…'; hint.style.color = ''; }
        attackBtn.style.animation = 'none';
        document.getElementById('holdFill').style.opacity = '1';
        borderLoader.style.opacity = '1'; hexTicks.style.opacity = '1';
        const bLen = traceLine.getTotalLength(), hLen = hexStroke.getTotalLength();
        traceLine.style.strokeDasharray = bLen; traceLine.style.strokeDashoffset = bLen;
        hexStroke.style.strokeDasharray = hLen; hexStroke.style.strokeDashoffset = hLen;
        const t0 = Date.now();
        const iv = setInterval(() => {
            const p = Math.min((Date.now() - t0) / holdDuration, 1);
            traceLine.style.strokeDashoffset = bLen * (1 - p);
            hexStroke.style.strokeDashoffset = hLen * (1 - p);
            document.querySelectorAll('.htick').forEach((tk, i) => {
                if (p >= (i + 1) / 6) { tk.style.background = ENEMY_HEX; tk.style.boxShadow = '0 0 8px ' + ENEMY_HEX + '99'; }
            });
            gamePhone.style.boxShadow = `0 0 ${30 + p * 50}px rgba(248,113,113,${0.15 + p * 0.4})`;
            if (p >= 1) { clearInterval(iv); captureSuccess(); }
        }, 16);
    }

    attackBtn.addEventListener('pointerdown', e => { e.preventDefault(); if (captureEnabled) { clearTimeout(autoTimer); startHold(); } });
    attackBtn.addEventListener('pointerup', cancelHold);
    attackBtn.addEventListener('pointerleave', cancelHold);

    function startHold() {
        if (isHolding) return; isHolding = true;
        attackBtn.style.animation = 'none';
        document.getElementById('holdFill').style.opacity = '1';
        borderLoader.style.opacity = '1'; hexTicks.style.opacity = '1';
        if (hint) { hint.textContent = '🔥 Capture en cours…'; hint.style.color = ''; hint.style.fontSize = ''; }
        const bLen = traceLine.getTotalLength(), hLen = hexStroke.getTotalLength();
        traceLine.style.strokeDasharray = bLen; traceLine.style.strokeDashoffset = bLen;
        hexStroke.style.strokeDasharray = hLen; hexStroke.style.strokeDashoffset = hLen;
        const t0 = Date.now();
        holdInterval = setInterval(() => {
            const p = Math.min((Date.now() - t0) / holdDuration, 1);
            traceLine.style.strokeDashoffset = bLen * (1 - p);
            hexStroke.style.strokeDashoffset = hLen * (1 - p);
            document.querySelectorAll('.htick').forEach((tk, i) => {
                if (p >= (i + 1) / 6) { tk.style.background = ENEMY_HEX; tk.style.boxShadow = '0 0 8px ' + ENEMY_HEX + '99'; }
            });
            gamePhone.style.boxShadow = `0 0 ${30 + p * 50}px rgba(248,113,113,${0.15 + p * 0.4})`;
            if (p >= 1) { clearInterval(holdInterval); captureSuccess(); }
        }, 16);
    }

    function cancelHold() {
        if (!isHolding) return; isHolding = false; clearInterval(holdInterval);
        document.getElementById('holdFill').style.opacity = '0';
        borderLoader.style.opacity = '0'; hexTicks.style.opacity = '0';
        const bLen = traceLine.getTotalLength(), hLen = hexStroke.getTotalLength();
        traceLine.style.strokeDashoffset = bLen; hexStroke.style.strokeDashoffset = hLen;
        document.querySelectorAll('.htick').forEach(tk => { tk.style.background = 'rgba(255,255,255,0.15)'; tk.style.boxShadow = 'none'; });
        gamePhone.style.boxShadow = '';
        if (captureEnabled && hint) {
            hint.innerHTML = '👇👇 <strong style="font-size:16px;">MAINTENEZ ⚔️ POUR VOLER !</strong> 👇👇';
            hint.style.color = '#fbbf24'; hint.style.fontSize = '15px';
        }
    }

    function captureSuccess() {
        isHolding = false; captureEnabled = false;
        flash(); showPopup('VOLÉ !', '#fbbf24');
        hexStroke.setAttribute('fill', PLAYER_HEX + HEX_FILL_A);
        hexStroke.setAttribute('stroke', PLAYER_HEX + HEX_STROKE_A);
        claimHex(stealTarget.row, stealTarget.col);
        hexCount++; score += 250; updateStats();
        document.getElementById('holdFill').style.opacity = '0';
        document.getElementById('attackIcon').textContent = '👑'; attackBtn.style.color = PLAYER_HEX;
        if (hint) { hint.textContent = '✅ Territoire volé ! +250 pts'; hint.style.color = ''; hint.style.fontSize = ''; }
        setTimeout(() => {
            borderLoader.style.opacity = '0'; hexTicks.style.opacity = '0';
            traceLine.style.strokeDashoffset = '999';
            document.querySelectorAll('.htick').forEach(tk => { tk.style.background = 'rgba(255,255,255,0.15)'; tk.style.boxShadow = 'none'; });
            gamePhone.style.boxShadow = '';
        }, 600);

        const enemyPuck = document.getElementById('enemyPuck');
        const hexMenu = document.getElementById('hexMenu');
        const stealPos = hexCenter(stealTarget.row, stealTarget.col);

        // Phase 1: Our puck keeps exploring north
        const postWalk1 = [[5, 3], [5, 2], [4, 2], [4, 3], [3, 3]];
        let pt = 1200;
        postWalk1.forEach(([r, c]) => { setTimeout(() => { movePuck(r, c); revealHex(r, c); }, pt); pt += 600; });

        // Phase 2: Enemy spawns from the RIGHT side
        const t1 = 1800;
        const eEnterPath = [[6, 8], [6, 7], [6, 6], [6, 5], [6, 4], [6, 3]];
        setTimeout(() => {
            const start = hexCenter(eEnterPath[0][0], eEnterPath[0][1]);
            enemyPuck.style.transition = 'none';
            enemyPuck.style.left = start.x + 'px'; enemyPuck.style.top = start.y + 'px';
            enemyPuck.style.opacity = '1';
            if (hint) { hint.textContent = '⚠️ Un joueur ennemi arrive…'; hint.style.color = ENEMY_HEX; }
        }, t1);
        eEnterPath.forEach(([r, c], i) => {
            setTimeout(() => {
                const pos = hexCenter(r, c);
                enemyPuck.style.transition = 'left 0.5s ease, top 0.5s ease';
                enemyPuck.style.left = pos.x + 'px'; enemyPuck.style.top = pos.y + 'px';
            }, t1 + 400 + i * 550);
        });

        // Phase 3: Enemy recaptures
        const t2 = t1 + 400 + eEnterPath.length * 550 + 400;
        setTimeout(() => {
            flash(); markEnemy(stealTarget.row, stealTarget.col);
            hexStroke.setAttribute('points', ''); hexStroke.setAttribute('fill', 'none');
            if (hint) { hint.textContent = '🔄 Il a récupéré son territoire !'; hint.style.color = ''; }
        }, t2);

        // Phase 4: Enemy exits right
        const eExitPath = [[6, 4], [6, 5], [6, 6], [6, 7], [6, 8], [6, 9]];
        eExitPath.forEach(([r, c], i) => {
            setTimeout(() => {
                const pos = hexCenter(r, c);
                enemyPuck.style.transition = 'left 0.45s ease-in, top 0.45s ease-in';
                enemyPuck.style.left = pos.x + 'px'; enemyPuck.style.top = pos.y + 'px';
            }, t2 + 400 + i * 450);
        });

        // Phase 5: Return and re-steal
        const t3 = t2 + 1800;
        const returnPath = [[3, 3], [4, 3], [5, 3], [6, 3]];
        setTimeout(() => { if (hint) { hint.textContent = '💪 On retourne le reprendre !'; hint.style.color = PLAYER_HEX; } }, t3);
        returnPath.forEach(([r, c], i) => { setTimeout(() => movePuck(r, c), t3 + i * 500); });

        // Phase 6: Auto re-capture
        const t4 = t3 + returnPath.length * 500 + 400;
        setTimeout(() => {
            flash(); claimHex(stealTarget.row, stealTarget.col);
            hexCount++; score += 250; updateStats();
            if (hint) { hint.textContent = '✅ Territoire repris ! Et si on le protégeait…'; hint.style.color = ''; }
        }, t4);

        // Phase 7: Show context menu
        const t5 = t4 + 1500;
        setTimeout(() => {
            hexMenu.style.left = stealPos.x + 'px'; hexMenu.style.top = (stealPos.y - 10) + 'px';
            hexMenu.style.opacity = '1'; hexMenu.style.transform = 'translate(-50%, -100%) scale(1)';
            if (hint) { hint.textContent = '👆 Cliquez sur votre hex pour voir les options'; hint.style.color = ''; }
        }, t5);

        // Phase 8: Highlight shield
        const t6 = t5 + 2000;
        setTimeout(() => {
            const shieldBtn = document.getElementById('menuShield');
            shieldBtn.style.background = 'rgba(96,165,250,0.2)'; shieldBtn.style.boxShadow = '0 0 12px rgba(96,165,250,0.3)';
            if (hint) { hint.textContent = '🛡️ Sélection : Protéger pour 500 pts'; hint.style.color = '#93c5fd'; }
        }, t6);

        // Phase 9: Apply shield
        const t7 = t6 + 2000;
        setTimeout(() => {
            hexMenu.style.opacity = '0'; hexMenu.style.transform = 'translate(-50%, -100%) scale(0.9)';
            document.getElementById('menuShield').style.background = ''; document.getElementById('menuShield').style.boxShadow = '';
            score -= 500; updateStats(); flash();
            const sPts = hexPts(stealPos.x, stealPos.y, HEX_R + 3);
            hexStroke.setAttribute('points', ptsStr(sPts));
            hexStroke.setAttribute('fill', 'rgba(147,197,253,0.12)');
            hexStroke.setAttribute('stroke', 'rgba(255,255,255,0.7)');
            hexStroke.setAttribute('stroke-width', '2.5');
            hexStroke.style.strokeDasharray = '8 4'; hexStroke.style.strokeDashoffset = '0';
            hexStroke.style.filter = 'drop-shadow(0 0 8px rgba(147,197,253,0.6)) drop-shadow(0 0 20px rgba(96,165,250,0.3))';
            if (hint) { hint.innerHTML = '🛡️ <strong>Hex protégé 24h !</strong> Personne ne peut le voler'; hint.style.color = '#93c5fd'; }
            showPopup('🛡️', '#93c5fd');
        }, t7);

        // Phase 10: Loop
        setTimeout(() => { hexStroke.style.filter = ''; if (hint) hint.style.color = ''; animationActive = false; startStoryAnimation(); }, t7 + 4000);
    }
})();
