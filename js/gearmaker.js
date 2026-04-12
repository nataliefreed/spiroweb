// js/gearmaker.js
// Interactive gear design tool for Spirogator.
// Uses a separate paper.PaperScope so it coexists with the simulator's PaperScript scope.
// Initialized lazily the first time the "Make Gears" tab is clicked.

var GearMaker = (function ($) {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────────────────
    var TOOTH_W       = 10;
    var TOOTH_H       = 5;
    var RING_W        = 20;   // extra radius for outer (ring) gears
    var DEFAULT_TEETH = 40;
    var MIN_TEETH     = 6;
    var MAX_TEETH     = 200;
    var HANDLE_R      = 7;    // resize handle circle radius
    var HOLE_R        = 5;    // pen hole circle radius
    var GRID_STEP     = 50;

    // ── Module state ────────────────────────────────────────────────────────────
    var sc;                   // paper.PaperScope instance
    var initialized = false;

    var gears       = [];     // array of gearData objects
    var selected    = null;   // gearData | holeData | null
    var dragMode    = null;   // 'gear' | 'hole' | 'handle'
    var dragPayload = null;
    var lastPt      = null;   // previous mouse position (for computing delta in drag)
    var lastClickMs = 0;      // for manual double-click detection
    var lastClickPt = null;

    var selGroup    = null;   // Group holding the selection ring + handles
    var handleItems = [];     // 4 handle circles, indices 0=N 1=E 2=S 3=W

    // ── Geometry helpers ────────────────────────────────────────────────────────

    function numTeethToRadius(n) {
        var a = 2 * Math.PI / n;
        return 0.5 * TOOTH_W / Math.sin(a / 2);
    }

    function radiusToNumTeeth(r) {
        if (r < TOOTH_W * 0.6) return MIN_TEETH;
        var sinVal = Math.min(1, TOOTH_W / (2 * r));
        var a = 2 * Math.asin(sinVal);
        return Math.max(MIN_TEETH, Math.min(MAX_TEETH, Math.round(2 * Math.PI / a)));
    }

    // Polar → Point (absolute canvas coords)
    function pol(cx, cy, r, theta) {
        return new sc.Point(cx + r * Math.cos(theta), cy + r * Math.sin(theta));
    }

    // Polar → Point (relative to origin)
    function polO(r, theta) {
        return new sc.Point(r * Math.cos(theta), r * Math.sin(theta));
    }

    // ── Gear path builders ──────────────────────────────────────────────────────
    // These are ports of the Gear() constructor in paperscript.js, rewritten in
    // plain JS (no PaperScript operator overloading — use .add()/.subtract() etc.)

    function buildFlower(cx, cy, n, r) {
        var ta   = 2 * Math.PI / n;
        var sag  = r * (1 - Math.cos(ta / 2));
        var path = new sc.Path();
        path.moveTo(pol(cx, cy, r, 0));

        for (var i = 1; i <= n; i++) {
            var aa = (i - 1) * ta;
            var ab = (i - 0.5) * ta;
            var ac = i * ta;

            var a = pol(cx, cy, r, aa);
            var b = pol(cx, cy, r, ab);
            var c = pol(cx, cy, r, ac);

            // Normal vector to chord b→c, rotated 90°
            var nvec  = c.subtract(b).normalize().rotate(90);
            var guide = new sc.Point(cx, cy).subtract(nvec.multiply(2 * (r - sag)));

            var ai = pol(cx, cy, r - TOOTH_H, aa);
            var bi = pol(cx, cy, r - TOOTH_H, ab);
            var ao = guide.add(polO(r - TOOTH_H, Math.PI + ac));
            var bo = guide.add(polO(r - TOOTH_H, Math.PI + ab));

            path.cubicCurveTo(ai, bi, b);
            path.cubicCurveTo(ao, bo, c);
        }
        path.closed = true;
        return path;
    }

    function buildPointy(cx, cy, n, r) {
        var ta   = 2 * Math.PI / n;
        var path = new sc.Path();
        for (var i = 0; i < n; i++) {
            var base   = i * ta;
            var mid    = base + ta * 0.5;
            var valley = pol(cx, cy, r - TOOTH_H * 0.5, base);
            var peak   = pol(cx, cy, r + TOOTH_H * 0.5, mid);
            if (i === 0) path.moveTo(valley);
            else         path.lineTo(valley);
            path.lineTo(peak);
        }
        path.closed = true;
        return path;
    }

    function buildWavy(cx, cy, n, r) {
        var ta   = 2 * Math.PI / n;
        var path = new sc.Path();
        for (var i = 0; i < n; i++) {
            var a0   = i * ta;
            var a1   = a0 + ta;
            var p0   = pol(cx, cy, r, a0);
            var peak = pol(cx, cy, r + TOOTH_H * 0.7, a0 + ta * 0.5);
            if (i === 0) path.moveTo(p0);
            else         path.lineTo(p0);
            // rising curve to peak
            path.cubicCurveTo(
                pol(cx, cy, r + TOOTH_H * 0.55, a0 + ta * 0.2),
                pol(cx, cy, r + TOOTH_H * 0.55, a0 + ta * 0.35),
                peak
            );
            // falling curve to next valley
            path.cubicCurveTo(
                pol(cx, cy, r + TOOTH_H * 0.55, a0 + ta * 0.65),
                pol(cx, cy, r + TOOTH_H * 0.55, a0 + ta * 0.8),
                pol(cx, cy, r, a1)
            );
        }
        path.closed = true;
        return path;
    }

    // Build (or rebuild) the Paper.js item for a gearData object.
    // Sets gd.item and gd.radius.
    function makeGearItem(gd) {
        var cx = gd.center.x, cy = gd.center.y;
        var n  = gd.numTeeth;
        var r  = numTeethToRadius(n);

        var innerPath;
        if      (gd.toothShape === 'pointy') innerPath = buildPointy(cx, cy, n, r);
        else if (gd.toothShape === 'wavy')   innerPath = buildWavy(cx, cy, n, r);
        else                                 innerPath = buildFlower(cx, cy, n, r);

        var item;
        if (gd.isInner) {
            // Solid gear
            innerPath.strokeColor = new sc.Color(0.35);
            innerPath.fillColor   = new sc.Color(0.72, 0.35);
            innerPath.strokeWidth = 1.5;
            item = innerPath;
        } else {
            // Ring gear — compound path with even-odd fill rule
            var outerCirc = new sc.Path.Circle(new sc.Point(cx, cy), r + RING_W);
            item = new sc.CompoundPath({
                children:    [outerCirc, innerPath],
                strokeColor: new sc.Color(0.35),
                fillColor:   new sc.Color(0.72, 0.35),
                strokeWidth: 1.5,
                fillRule:    'evenodd'
            });
        }

        gd.item   = item;
        gd.radius = r;
    }

    // ── Gear CRUD ───────────────────────────────────────────────────────────────

    function createGear(center, numTeeth, isInner, shape) {
        var gd = {
            type:       'gear',
            center:     center.clone(),
            numTeeth:   numTeeth,
            isInner:    isInner,
            toothShape: shape,
            holes:      [],
            item:       null,
            radius:     0
        };
        makeGearItem(gd);
        gears.push(gd);
        return gd;
    }

    function rebuildGear(gd) {
        if (gd.item) gd.item.remove();
        makeGearItem(gd);
        // Keep hole dots visually on top of the fresh gear path
        gd.holes.forEach(function (h) { h.item.bringToFront(); });
        if (selGroup) selGroup.bringToFront();
    }

    function deleteGear(gd) {
        gd.holes.forEach(function (h) { h.item.remove(); });
        if (gd.item) gd.item.remove();
        var idx = gears.indexOf(gd);
        if (idx !== -1) gears.splice(idx, 1);
    }

    function duplicateGear(gd) {
        var offset = new sc.Point(28, 28);
        var ng = createGear(gd.center.add(offset), gd.numTeeth, gd.isInner, gd.toothShape);
        gd.holes.forEach(function (h) { createHole(ng, h.localPt.clone()); });
        return ng;
    }

    // ── Hole CRUD ───────────────────────────────────────────────────────────────

    // localPt is the hole's position relative to the gear center.
    function createHole(gd, localPt) {
        var worldPt = gd.center.add(localPt);
        var hp = new sc.Path.Circle(worldPt, HOLE_R);
        hp.strokeColor = new sc.Color(0.15, 0.35, 0.85);
        hp.fillColor   = new sc.Color(0.35, 0.6, 1, 0.9);
        hp.strokeWidth = 1.5;
        var hd = { type: 'hole', gear: gd, localPt: localPt.clone(), item: hp };
        gd.holes.push(hd);
        return hd;
    }

    function syncHolePos(hd) {
        hd.item.position = hd.gear.center.add(hd.localPt);
    }

    function deleteHole(hd) {
        var idx = hd.gear.holes.indexOf(hd);
        if (idx !== -1) hd.gear.holes.splice(idx, 1);
        hd.item.remove();
    }

    // ── Selection overlay ────────────────────────────────────────────────────────

    function clearSelUI() {
        if (selGroup) { selGroup.remove(); selGroup = null; }
        handleItems = [];
    }

    function buildSelUI() {
        clearSelUI();
        if (!selected) return;

        selGroup = new sc.Group();

        if (selected.type === 'gear') {
            var gd   = selected;
            var selR = gd.radius + (gd.isInner ? 0 : RING_W) + 14;

            // Dashed selection ring
            var ring = new sc.Path.Circle(gd.center, selR);
            ring.strokeColor = new sc.Color(0.2, 0.5, 1, 0.85);
            ring.strokeWidth = 1.5;
            ring.dashArray   = [6, 4];
            ring.fillColor   = null;
            selGroup.addChild(ring);

            // 4 resize handles at N / E / S / W
            [Math.PI * 1.5, 0, Math.PI * 0.5, Math.PI].forEach(function (ang) {
                var hpos = pol(gd.center.x, gd.center.y, selR, ang);
                var h    = new sc.Path.Circle(hpos, HANDLE_R);
                h.strokeColor = new sc.Color(0.2, 0.5, 1);
                h.fillColor   = new sc.Color(1);
                h.strokeWidth = 1.5;
                selGroup.addChild(h);
                handleItems.push(h);
            });

        } else if (selected.type === 'hole') {
            var ring = new sc.Path.Circle(selected.item.position, HOLE_R + 5);
            ring.strokeColor = new sc.Color(0.2, 0.5, 1);
            ring.fillColor   = null;
            ring.strokeWidth = 2;
            selGroup.addChild(ring);
        }
    }

    function select(item) {
        selected = item;
        buildSelUI();
        updateSidebar();
    }

    // ── Hit testing ──────────────────────────────────────────────────────────────

    function hitHandle(p) {
        for (var i = 0; i < handleItems.length; i++) {
            if (p.getDistance(handleItems[i].position) <= HANDLE_R + 5) return i;
        }
        return -1;
    }

    function hitHole(p) {
        for (var gi = 0; gi < gears.length; gi++) {
            var g = gears[gi];
            for (var hi = 0; hi < g.holes.length; hi++) {
                if (p.getDistance(g.holes[hi].item.position) <= HOLE_R + 8) {
                    return g.holes[hi];
                }
            }
        }
        return null;
    }

    function hitGear(p) {
        // Search top-to-bottom (last added = on top)
        for (var i = gears.length - 1; i >= 0; i--) {
            var gd     = gears[i];
            var outerR = gd.radius + (gd.isInner ? 0 : RING_W);
            if (p.getDistance(gd.center) <= outerR + 6) return gd;
        }
        return null;
    }

    // Returns true if p is well inside the gear body (far from teeth edge)
    function insideGear(gd, p) {
        return p.getDistance(gd.center) < gd.radius - TOOTH_H * 3;
    }

    // ── Mouse events ─────────────────────────────────────────────────────────────

    function onDown(ev) {
        var p   = ev.point;
        var now = Date.now();

        // Manual double-click detection (time + distance threshold)
        var isDbl = (now - lastClickMs < 300) && lastClickPt && (p.getDistance(lastClickPt) < 6);
        lastClickMs = now;
        lastClickPt = p.clone();
        lastPt      = p.clone();

        if (isDbl) {
            onDoubleClick(p);
            dragMode = null;
            return;
        }

        // Handle hit (only when a gear is selected)
        if (selected && selected.type === 'gear') {
            var hi = hitHandle(p);
            if (hi >= 0) {
                dragMode    = 'handle';
                dragPayload = { gear: selected, handleIdx: hi };
                return;
            }
        }

        // Hole hit
        var hole = hitHole(p);
        if (hole) {
            select(hole);
            dragMode    = 'hole';
            dragPayload = hole;
            return;
        }

        // Gear hit
        var gear = hitGear(p);
        if (gear) {
            select(gear);
            dragMode    = 'gear';
            dragPayload = gear;
            return;
        }

        // Empty canvas
        select(null);
        dragMode = null;
    }

    function onDrag(ev) {
        if (!dragMode) return;
        var p     = ev.point;
        var delta = lastPt ? p.subtract(lastPt) : new sc.Point(0, 0);
        lastPt    = p.clone();

        if (dragMode === 'gear') {
            var gd = dragPayload;
            gd.center          = gd.center.add(delta);
            gd.item.position   = gd.item.position.add(delta);
            gd.holes.forEach(function (h) {
                h.item.position = h.item.position.add(delta);
            });
            if (selGroup) selGroup.position = selGroup.position.add(delta);

        } else if (dragMode === 'hole') {
            var hd      = dragPayload;
            var gd      = hd.gear;
            var localNew = p.subtract(gd.center);
            var maxDist  = gd.radius - TOOTH_H * 3;
            if (localNew.length > maxDist) {
                localNew = localNew.normalize().multiply(maxDist);
            }
            hd.localPt = localNew;
            syncHolePos(hd);
            if (selGroup) selGroup.position = hd.item.position;

        } else if (dragMode === 'handle') {
            var gd   = dragPayload.gear;
            var dist = p.getDistance(gd.center);
            var visR = gd.isInner ? 0 : RING_W;
            // The selection ring sits 14px beyond the visual edge; account for that
            var newR = Math.max(numTeethToRadius(MIN_TEETH), dist - 14 - visR);
            var newN = radiusToNumTeeth(newR);
            if (newN !== gd.numTeeth) {
                gd.numTeeth = newN;
                rebuildGear(gd);
                buildSelUI();
                updateSidebar();
            }
        }
    }

    function onUp() {
        dragMode    = null;
        dragPayload = null;
        lastPt      = null;
    }

    function onDoubleClick(p) {
        var gear = hitGear(p);

        // Double-click inside an inner gear → add pen hole
        if (gear && gear.isInner && insideGear(gear, p)) {
            var localPt = p.subtract(gear.center);
            select(createHole(gear, localPt));
            updateHint();
            return;
        }

        // Double-click on empty canvas (or on outer ring area) → create new gear
        select(createGear(p, DEFAULT_TEETH, true, 'flower'));
        updateHint();
    }

    // ── Sidebar ──────────────────────────────────────────────────────────────────

    function updateSidebar() {
        if (selected && selected.type === 'gear') {
            $('#gm-no-sel').hide();
            $('#gm-hole-props').hide();
            $('#gm-gear-props').show();

            $('#gm-teeth-val').text(selected.numTeeth);
            $('#gm-inner-btn').toggleClass('gm-active', !!selected.isInner);
            $('#gm-outer-btn').toggleClass('gm-active', !selected.isInner);
            $('.gm-shape-btn').removeClass('gm-active');
            $('#gm-shape-' + selected.toothShape).addClass('gm-active');

        } else if (selected && selected.type === 'hole') {
            $('#gm-no-sel').hide();
            $('#gm-gear-props').hide();
            $('#gm-hole-props').show();

            var pct = selected.gear.radius > 0
                ? Math.round((selected.localPt.length / selected.gear.radius) * 100)
                : 0;
            $('#gm-hole-pct').text(pct);

        } else {
            $('#gm-gear-props').hide();
            $('#gm-hole-props').hide();
            $('#gm-no-sel').show();
        }
    }

    function updateHint() {
        var totalHoles = gears.reduce(function (acc, g) { return acc + g.holes.length; }, 0);
        if (gears.length === 0) {
            $('#gm-hint').text('Double-click the canvas to place a gear.');
        } else if (totalHoles === 0) {
            $('#gm-hint').text('Double-click inside a gear to add a pen hole.');
        } else {
            $('#gm-hint').text('');
        }
    }

    // ── Grid background ───────────────────────────────────────────────────────────

    function drawGrid() {
        var gridLyr = new sc.Layer({ name: 'grid' });
        var w = sc.view.size.width, h = sc.view.size.height;

        for (var x = 0; x <= w; x += GRID_STEP) {
            var vl = new sc.Path.Line(new sc.Point(x, 0), new sc.Point(x, h));
            vl.strokeColor = new sc.Color(0, 0, 0, 0.07);
            vl.strokeWidth = 1;
        }
        for (var y = 0; y <= h; y += GRID_STEP) {
            var hl = new sc.Path.Line(new sc.Point(0, y), new sc.Point(w, y));
            hl.strokeColor = new sc.Color(0, 0, 0, 0.07);
            hl.strokeWidth = 1;
        }

        // Gear content lives on a fresh layer above the grid
        new sc.Layer({ name: 'content' }).activate();
    }

    // ── SVG export ────────────────────────────────────────────────────────────────

    function exportSVG() {
        var exportGrp = new sc.Group({ insert: false });

        gears.forEach(function (gd) {
            var gc = gd.item.clone({ insert: false });
            gc.fillColor   = null;
            gc.strokeColor = new sc.Color(0, 0, 0);
            gc.strokeWidth = 1;
            exportGrp.addChild(gc);

            gd.holes.forEach(function (hd) {
                var hc = hd.item.clone({ insert: false });
                hc.fillColor   = null;
                hc.strokeColor = new sc.Color(0, 0, 0);
                hc.strokeWidth = 1;
                exportGrp.addChild(hc);
            });
        });

        var w   = sc.view.bounds.width;
        var h   = sc.view.bounds.height;
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">'
                + exportGrp.exportSVG({ asString: true })
                + '</svg>';

        saveAs(new Blob([svg], { type: 'image/svg+xml' }), 'gears_' + Date.now() + '.svg');
    }

    // ── Actions (sidebar buttons) ─────────────────────────────────────────────────

    function doDelete() {
        if (!selected) return;
        if (selected.type === 'hole') {
            var parentGear = selected.gear;
            deleteHole(selected);
            select(parentGear);
        } else if (selected.type === 'gear') {
            deleteGear(selected);
            select(null);
        }
        updateHint();
    }

    function doDuplicate() {
        if (!selected) return;
        if (selected.type === 'gear') {
            select(duplicateGear(selected));
        } else if (selected.type === 'hole') {
            var nudge = selected.localPt.normalize().multiply(12);
            select(createHole(selected.gear, selected.localPt.add(nudge)));
        }
        updateHint();
    }

    function doSetGearType(isInner) {
        if (!selected || selected.type !== 'gear') return;
        if (!isInner) {
            // Outer (ring) gears cannot have holes
            selected.holes.forEach(function (h) { h.item.remove(); });
            selected.holes = [];
        }
        selected.isInner = isInner;
        rebuildGear(selected);
        buildSelUI();
        updateSidebar();
        updateHint();
    }

    function doSetShape(shape) {
        if (!selected || selected.type !== 'gear') return;
        selected.toothShape = shape;
        rebuildGear(selected);
        buildSelUI();
        updateSidebar();
    }

    function doChangeTeeth(delta) {
        if (!selected || selected.type !== 'gear') return;
        var n = Math.max(MIN_TEETH, Math.min(MAX_TEETH, selected.numTeeth + delta));
        if (n === selected.numTeeth) return;
        selected.numTeeth = n;
        rebuildGear(selected);
        buildSelUI();
        updateSidebar();
    }

    // ── Init (lazy — called on first tab click) ───────────────────────────────────

    function init() {
        if (initialized) return;
        initialized = true;

        sc = new paper.PaperScope();
        sc.setup(document.getElementById('gear-canvas'));

        drawGrid();

        sc.view.onMouseDown = onDown;
        sc.view.onMouseDrag = onDrag;
        sc.view.onMouseUp   = onUp;

        updateHint();
        updateSidebar();

        // Bind sidebar controls
        $('#gm-inner-btn').on('click', function () { doSetGearType(true); });
        $('#gm-outer-btn').on('click', function () { doSetGearType(false); });

        $('.gm-shape-btn').on('click', function () {
            doSetShape($(this).data('shape'));
        });

        $('#gm-teeth-minus5').on('click', function () { doChangeTeeth(-5); });
        $('#gm-teeth-minus1').on('click', function () { doChangeTeeth(-1); });
        $('#gm-teeth-plus1').on('click',  function () { doChangeTeeth(1); });
        $('#gm-teeth-plus5').on('click',  function () { doChangeTeeth(5); });

        // .gm-delete-btn and .gm-duplicate-btn appear in both gear and hole props panels
        $(document).on('click', '.gm-delete-btn',    doDelete);
        $(document).on('click', '.gm-duplicate-btn', doDuplicate);
        $('#gm-export-btn').on('click', exportSVG);
    }

    return { init: init };

}(jQuery));
