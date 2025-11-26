/* ---------------------------
    script.js - drag optimizado y robusto con lógica de ayuda
    --------------------------- */

document.addEventListener('DOMContentLoaded', () => {

    // --- ORDEN CORRECTO DE 8 CARTAS ---
    const correctOrder = [
        "CartasPFE-01.png",
        "CartasPFE-02.png",
        "CartasPFE-03.png",
        "CartasPFE-04.png",
        "CartasPFE-05.png",
        "CartasPFE-06.png",
        "CartasPFE-07.png",
        "CartasPFE-08.png" // Nueva carta para el paso 8
    ];

    /* DOM */
    const startScreen = document.getElementById('start-screen');
    const btnStart = document.getElementById('btn-start');
    const gameArea = document.getElementById('game-area');
    const timerEl = document.getElementById('timer');
    const scoreEl = document.getElementById('score');
    const btnCheck = document.getElementById('btn-check');
    const btnRestart = document.getElementById('btn-restart');
    const endScreen = document.getElementById('end-screen');
    const resultTitle = document.getElementById('result-title');
    const finalScoreEl = document.getElementById('final-score');
    const btnPlayAgain = document.getElementById('btn-play-again');

    // NUEVOS ELEMENTOS DOM
    const btnHelp = document.getElementById('btn-help');
    const solutionGuide = document.getElementById('solution-guide');
    const btnCloseGuide = document.getElementById('btn-close-guide');
    // ELEMENTOS PARA EL ZOOM DE IMAGEN
    const imageZoomOverlay = document.getElementById('image-zoom-overlay');
    const zoomedGuideImage = document.getElementById('zoomed-guide-image');
    const btnCloseZoom = document.getElementById('btn-close-zoom');


    /* estado global */
    let slots = [];             // se llenará dinámicamente
    let timer = null;
    let timeLeft = 300;
    let score = 0;
    // NUEVOS ESTADOS
    let attempts = 0;           // Contador de intentos de validación
    let helpButtonEnabled = false; // Estado del botón de ayuda

    /* drag state */
    let draggingCard = null;
    let dragClone = null;
    let originSlot = null;
    let currentX = 0, currentY = 0;
    let prevX = 0, prevY = 0;
    let dragging = false;
    let rafId = null;

    /* util */
    const shuffle = arr => arr.slice().sort(()=>Math.random()-0.5);

    function getSlots(){
        slots = Array.from(document.querySelectorAll('.slot'));
        return slots;
    }

    function createCardElement(imgName){
        const img = document.createElement('img');
        img.className = 'card';
        img.draggable = false;
        img.src = `Cartas/${imgName}`;
        img.alt = imgName;
        img.dataset.image = imgName;
        img.style.willChange = 'transform';
        img.addEventListener('pointerdown', onPointerDown);
        return img;
    }

    function placeShuffledCards(){
        getSlots();
        const shuffled = shuffle(correctOrder);
        slots.forEach((slot, i) => {
            slot.innerHTML = '';
            const card = createCardElement(shuffled[i]);
            slot.appendChild(card);
        });
    }

    /* --- drag handlers --- */
    function onPointerDown(e){
        // solo boton principal (mouse) o touch
        if (e.button && e.button !== 0) return;

        draggingCard = e.currentTarget;
        originSlot = draggingCard.parentElement;

        // coordenadas iniciales del puntero
        currentX = e.clientX;
        currentY = e.clientY;
        prevX = currentX;
        prevY = currentY;

        // crear clon visual que seguirá al cursor
        const rect = draggingCard.getBoundingClientRect();
        dragClone = draggingCard.cloneNode(true);
        dragClone.className = 'dragging-clone';
        dragClone.style.width = rect.width + 'px';
        dragClone.style.height = rect.height + 'px';
        // append antes para que exista en DOM
        document.body.appendChild(dragClone);

        // ocultar original
        draggingCard.style.visibility = 'hidden';

        dragging = true;
        document.addEventListener('pointermove', onPointerMove, {passive: false});
        document.addEventListener('pointerup', onPointerUp, {once: true});

        rafId = requestAnimationFrame(updateDragClone);
    }

    function onPointerMove(e){
        if(!dragging) return;
        e.preventDefault();
        currentX = e.clientX;
        currentY = e.clientY;
    }

    function updateDragClone(){
        if(!dragClone) return;

        const dx = currentX - prevX;
        const rot = Math.max(-14, Math.min(14, dx * 0.6));

        // movemos la copia con translate3d y la centramos con translate(-50%,-50%)
        dragClone.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%,-50%) scale(1.06) rotate(${rot}deg)`;

        // resaltar slot bajo el puntero
        const elem = document.elementFromPoint(currentX, currentY);
        const slotUnder = elem ? elem.closest('.slot') : null;
        getSlots().forEach(s => s.classList.toggle('over', s === slotUnder));

        prevX = currentX;
        prevY = currentY;

        if(dragging) rafId = requestAnimationFrame(updateDragClone);
    }

    function nearestSlotToPoint(x,y){
        getSlots();
        let best = null, bestD = Infinity;
        slots.forEach(s=>{
            const r = s.getBoundingClientRect();
            const cx = r.left + r.width/2;
            const cy = r.top + r.height/2;
            const d = Math.hypot(cx - x, cy - y);
            if (d < bestD) { bestD = d; best = s; }
        });
        return best;
    }

    function onPointerUp(e){
        dragging = false;
        cancelAnimationFrame(rafId);
        document.removeEventListener('pointermove', onPointerMove);

        // decidir slot objetivo por la posición actual
        const elem = document.elementFromPoint(currentX, currentY);
        let targetSlot = elem ? elem.closest('.slot') : null;
        if(!targetSlot) targetSlot = nearestSlotToPoint(currentX, currentY);
        if(!targetSlot) targetSlot = originSlot;

        // swap / mover
        if(targetSlot === originSlot){
            originSlot.appendChild(draggingCard);
        } else {
            const existing = targetSlot.querySelector('.card');
            if(existing) originSlot.appendChild(existing);
            targetSlot.appendChild(draggingCard);
        }

        // limpiar visuals
        getSlots().forEach(s => s.classList.remove('over'));

        // remover clon y restaurar original
        if(dragClone && dragClone.parentNode) dragClone.parentNode.removeChild(dragClone);
        dragClone = null;

        if(draggingCard) draggingCard.style.visibility = 'visible';
        draggingCard = null;
        originSlot = null;
    }

    /* --- helper para el tiempo / ayuda --- */
    function updateTimerDisplay(){
        // Actualiza el tiempo
        timeLeft--;
        
        // CÁLCULO Y FORMATO M:SS
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        // Asegura que los segundos siempre tengan dos dígitos (ej: 09, 08...)
        const formattedSeconds = seconds.toString().padStart(2, '0'); 
        
        if (timerEl) timerEl.textContent = `${minutes}:${formattedSeconds}s`;

        if(timeLeft <= 0){
            clearInterval(timer);
            showEnd(false);
        } 
        
        // Si han pasado 60 segundos (el contador bajó de 300 a 240) Y no se ha activado antes
        if(timeLeft <= 240 && !helpButtonEnabled){
            enableHelpButton();
        }
    }

    function enableHelpButton(){
        helpButtonEnabled = true;
        if(btnHelp) btnHelp.classList.remove('hidden');
    }

    // FUNCIONES GUÍA DE SOLUCIÓN
    function showGuide(){
        if(solutionGuide) solutionGuide.classList.remove('hidden');
    }

    function hideGuide(){
        if(solutionGuide) solutionGuide.classList.add('hidden');
    }
    
    // FUNCIONES PARA EL ZOOM DE IMAGEN
    function showZoom(){
        if(imageZoomOverlay) imageZoomOverlay.classList.remove('hidden');
    }

    function hideZoom(){
        if(imageZoomOverlay) imageZoomOverlay.classList.add('hidden');
    }


    /* --- game logic --- */
    function startTimer(){
        clearInterval(timer);
        timeLeft = 300;
        helpButtonEnabled = false; // Reinicia el estado del botón
        if(btnHelp) btnHelp.classList.add('hidden'); // Oculta el botón al iniciar

        // Muestra el tiempo inicial en 5:00s
        if (timerEl) timerEl.textContent = '5:00s'; 
        timer = setInterval(updateTimerDisplay, 1000);

        const music = document.getElementById('bg-music');
        if(music){
            music.volume = 0.28;
            music.play().catch(()=>{/* autoplay puede fallar sin interacción */});
        }
    }

    function startGame(){
        placeShuffledCards();
        score = 0; if(scoreEl) scoreEl.textContent = score;
        attempts = 0; // Reinicia intentos

        if(startScreen) startScreen.classList.add('hidden');
        if(gameArea) gameArea.classList.remove('hidden');
        if(endScreen) endScreen.classList.add('hidden');
        startTimer();

        const music = document.getElementById('bg-music');
        if(music){
            music.volume = 0.28;
            music.play().catch(()=>{/* autoplay puede fallar sin interacción */});
        }
    }

    function checkOrder(){
        getSlots();
        const current = slots.map(s => s.querySelector('.card')?.dataset.image || null);
        
        // La condición de que el array tenga la longitud correcta (8) ya está implícita 
        // porque el número de slots es 8 y se chequea que no haya slots vacíos.
        if(current.includes(null)){ alert('Faltan cartas en algunos slots.'); return; }

        attempts++; // Incrementa el contador de intentos

        // Si tiene más de 2 intentos fallidos, activa el botón de ayuda
        if(attempts > 2 && !helpButtonEnabled){
            enableHelpButton();
        }

        if(JSON.stringify(current) === JSON.stringify(correctOrder)){
            const bonus = Math.max(0, timeLeft) * 10;
            score = 1000 + bonus;
            if(scoreEl) scoreEl.textContent = score;
            clearInterval(timer);

            // Muestra la guía al resolver correctamente (para ampliar la información)
            showGuide();

            showEnd(true, score);
        } else {
            alert(`El orden no es correcto, llevas ${attempts} intentos. Sigue intentando.`);
        }
    }

    function restartGame(){
        placeShuffledCards();
        score = 0; if(scoreEl) scoreEl.textContent = score;
        attempts = 0; // Reinicia intentos
        clearInterval(timer);
        timeLeft = 300; 
        
        // Muestra el tiempo inicial en 5:00s
        if(timerEl) timerEl.textContent = '5:00s';
        startTimer();
        if(endScreen) endScreen.classList.add('hidden');
        if(gameArea) gameArea.classList.remove('hidden');
    }

    function showEnd(success, points=0){
        if(resultTitle) resultTitle.textContent = success ? '¡Correcto! 🎉' : 'Tiempo agotado ⏳';
        if(finalScoreEl) finalScoreEl.textContent = points;

        if(endScreen) endScreen.classList.remove('hidden');
        if(gameArea) gameArea.classList.add('hidden');

        const music = document.getElementById('bg-music');
        if(music){ music.pause(); music.currentTime = 0; }
    }

    /* listeners botones */
    if(btnStart) btnStart.addEventListener('click', startGame);
    if(btnCheck) btnCheck.addEventListener('click', checkOrder);
    if(btnRestart) btnRestart.addEventListener('click', restartGame);
    if(btnPlayAgain) btnPlayAgain.addEventListener('click', ()=>{
        if(startScreen) startScreen.classList.remove('hidden');
        if(endScreen) endScreen.classList.add('hidden');
    });

    // LISTENERS DEL BOTÓN DE AYUDA Y CERRAR
    if(btnHelp) btnHelp.addEventListener('click', showGuide);
    if(btnCloseGuide) btnCloseGuide.addEventListener('click', hideGuide);
    
    // LISTENERS PARA EL ZOOM DE LA IMAGEN DE LA GUÍA
    if(solutionGuide) { 
        const guideImage = solutionGuide.querySelector('.guide-image');
        if(guideImage) {
            guideImage.addEventListener('click', showZoom);
        }
    }
    if(btnCloseZoom) btnCloseZoom.addEventListener('click', hideZoom);
    if(zoomedGuideImage) zoomedGuideImage.addEventListener('click', hideZoom); 


    /* inicial */
    placeShuffledCards();
    if(gameArea) gameArea.classList.add('hidden');
    // Muestra el tiempo inicial en 5:00s
    if(timerEl) timerEl.textContent = '5:00s'; 

}); // DOMContentLoaded
