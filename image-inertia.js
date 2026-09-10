"use strict";

/*
   External image drag + inertia controller for index-inertia.html
*/

(function () {
    const hasStartBindings =
        typeof startExplore !== "undefined" &&
        typeof updateStartImage !== "undefined" &&
        typeof startIndex !== "undefined";

    const hasHomeBindings =
        typeof homeExploreZone !== "undefined" &&
        typeof updateHomeImage !== "undefined" &&
        typeof activeImageIndex !== "undefined";

    if (!hasStartBindings && !hasHomeBindings) {
        console.warn(
            "image-inertia.js: required bindings not found."
        );
        return;
    }

    const STEP_THRESHOLD = 90;
    const MIN_INERTIA_SPEED = 0.015;
    const DECAY_PER_FRAME = 0.92;
    const MAX_DT_MS = 34;

    function clampDt(dt) {
        return Math.max(8, Math.min(MAX_DT_MS, dt));
    }

    function makeController(config) {
        let dragging = false;
        let lastX = 0;
        let lastT = 0;
        let velocityPxPerMs = 0;
        let accumulator = 0;
        let inertiaRaf = null;

        function syncBusyFlag() {
            window[config.busyFlag] =
                dragging || inertiaRaf !== null;
        }

        function stopInertia() {
            if (inertiaRaf !== null) {
                cancelAnimationFrame(inertiaRaf);
                inertiaRaf = null;
                syncBusyFlag();
            }
        }

        function stepByAccumulator() {
            while (Math.abs(accumulator) >= STEP_THRESHOLD) {
                if (accumulator < 0) {
                    config.stepNext();
                    accumulator += STEP_THRESHOLD;
                }
                else {
                    config.stepPrev();
                    accumulator -= STEP_THRESHOLD;
                }
            }
        }

        function onPointerDown(event) {
            stopInertia();

            dragging = true;
            syncBusyFlag();

            accumulator = 0;
            velocityPxPerMs = 0;

            lastX = event.clientX;
            lastT = performance.now();

            config.zone.setPointerCapture(
                event.pointerId
            );
        }

        function onPointerMove(event) {
            if (!dragging) return;

            const now = performance.now();
            const dx = event.clientX - lastX;
            const dt = clampDt(now - lastT);

            velocityPxPerMs = dx / dt;

            const boost = Math.min(
                8,
                Math.abs(velocityPxPerMs) * 18
            );

            accumulator += dx * Math.max(1, boost);
            stepByAccumulator();

            lastX = event.clientX;
            lastT = now;
        }

        function runInertiaFrame(prevTime) {
            function frame(now) {
                const dt = clampDt(now - prevTime);
                prevTime = now;

                accumulator += velocityPxPerMs * dt * 1.4;
                stepByAccumulator();

                velocityPxPerMs *= DECAY_PER_FRAME;

                if (
                    Math.abs(velocityPxPerMs) <
                    MIN_INERTIA_SPEED
                ) {
                    inertiaRaf = null;
                    syncBusyFlag();
                    return;
                }

                inertiaRaf =
                    requestAnimationFrame(frame);
            }

            inertiaRaf =
                requestAnimationFrame(frame);
            syncBusyFlag();
        }

        function onPointerEnd() {
            if (!dragging) return;

            dragging = false;
            syncBusyFlag();

            if (
                Math.abs(velocityPxPerMs) >=
                MIN_INERTIA_SPEED
            ) {
                runInertiaFrame(performance.now());
            }
            else {
                accumulator = 0;
            }
        }

        config.zone.addEventListener(
            "pointerdown",
            onPointerDown
        );
        config.zone.addEventListener(
            "pointermove",
            onPointerMove
        );
        config.zone.addEventListener(
            "pointerup",
            onPointerEnd
        );
        config.zone.addEventListener(
            "pointercancel",
            onPointerEnd
        );
        config.zone.addEventListener(
            "pointerleave",
            onPointerEnd
        );
    }

    if (hasStartBindings) {
        makeController({
            zone: startExplore,
            busyFlag: "__startInteractionBusy",
            stepNext: () => updateStartImage(startIndex + 1),
            stepPrev: () => updateStartImage(startIndex - 1)
        });
    }

    if (hasHomeBindings) {
        makeController({
            zone: homeExploreZone,
            busyFlag: "__homeInteractionBusy",
            stepNext: () => {
                activeImageIndex++;
                updateHomeImage(true);
            },
            stepPrev: () => {
                activeImageIndex--;
                updateHomeImage(true);
            }
        });
    }
})();