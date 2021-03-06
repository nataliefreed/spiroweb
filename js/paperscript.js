//hypotrochoid variables
var x = 0;
var y = 0;
var outerNumTeeth = 120;
var innerNumTeeth = 70;
var tooth_w = 10;
var tooth_h = 5;
var outerRingWidth = 20;
var d;
var rollingAngle = 0;
var lastPlottedAngle = 0;
var targetRollingAngle = 0;
var toothSteps = 0;
var speed = 0.05;

var numTurnsRun = 0;

var outerStroke = new Color(0.3);
var outerFill = new Color(0.25, 0.5);
var innerStroke = new Color(0.5);
var innerFill = new Color(0.25, 0.1);

var cleared = false;

var running = false;
var penDown = true;

var testGear = new OuterGear(view.center, outerNumTeeth, tooth_w, tooth_h, outerRingWidth, outerStroke, outerFill);
var innerTestGear = new Gear(view.center, innerNumTeeth, tooth_w, tooth_h, innerStroke, innerFill);
innerTestGear.position = new Point(view.center.x + testGear.computedRadius - innerTestGear.computedRadius, view.center.y);

var outerRadius = numTeethToRadius(outerNumTeeth, tooth_w, tooth_h);
var innerRadius = numTeethToRadius(innerNumTeeth, tooth_w, tooth_h);

//inner gear center point
var innerGearCenter = new Path.Circle(innerTestGear.bounds.center, 3);
innerGearCenter.fillColor = new Color(0, 0.5);

//hole for pen
d = 0.5 * innerTestGear.computedRadius;
var penPoint = new Path.Circle(new Point(innerTestGear.bounds.center.x + d, view.center.y), 3);
penPoint.fillColor = new Color(255, 0, 0, 0.5);

//radius line through pen hole
var penLine = new Path();
penLine.strokeColor = 'purple';
penLine.moveTo(innerTestGear.bounds.center);
penLine.lineTo(innerTestGear.bounds.center.x + numTeethToRadius(innerNumTeeth, tooth_w, tooth_h), innerTestGear.bounds.center.y);

var gearGroup = new Group();
gearGroup.addChild(testGear);
gearGroup.addChild(innerTestGear);
gearGroup.addChild(innerGearCenter);
gearGroup.addChild(penPoint);
gearGroup.addChild(penLine);

//create a spiro path
var path = new Path();
// Give the stroke a color
var selectedColorButton = $('.color-button').first();
console.log(selectedColorButton);
selectedColorButton.addClass('selected');
var currentColor = selectedColorButton.css('backgroundColor');
path.strokeColor = currentColor;
path.strokeCap = 'round';
var newStrokeWidth = 2;

//create a group to store the entire spiro drawing
var drawing = new Group();

var start = view.center;

function addToPatternGroup() {
    var rasterPath = path.rasterize();
    drawing.addChild(rasterPath);
    var rasterDrawing = drawing.rasterize();
    drawing.remove();
    drawing = new Group();
    drawing.addChild(rasterDrawing);

    path.remove();
    path = new Path();
    path.strokeCap = 'round';
    path.strokeWidth = $('#pen-width-slider').val();;
    path.strokeColor = currentColor;
}

var numberOfPetals;
var numberOfTurns;
updatePetalsAndTurns();
updateTargetAngle();

//do every frame
function onFrame(event) {

    ////check if stroke color changed
    ////note: this runs every frame rather than being event driven due to onChange only firing on mouse release
    ////there might be a way to deal with this (oninput?) but I haven't found a cross-browser way yet

    //check if strokeWidth changed
    newStrokeWidth = $('#pen-width-slider').val();
    if (path.strokeWidth != newStrokeWidth) {
        addToPatternGroup();
    }
    newStrokeWidth = path.strokeWidth;

    var outerSetting = parseInt($('#outer-gear-teeth-slider').val());
    var innerSetting = parseInt($('#inner-gear-teeth-slider').val());

    var innerOuterChanged = innerLarger != (innerSetting > outerSetting);
    var innerLarger = innerSetting > outerSetting;

    if(innerSetting != innerNumTeeth || outerSetting != outerNumTeeth) {
        //update number of teeth, pen distance, speed
        if (outerNumTeeth != outerSetting || innerOuterChanged) {
            console.log("changing outer gear");
            outerNumTeeth = outerSetting;
            testGear.remove();
            if (innerLarger) { //turn it into an inner gear
                testGear = new Gear(view.center, outerNumTeeth, tooth_w, tooth_h, outerStroke, outerFill);
            }
            else {
                testGear = new OuterGear(view.center, outerNumTeeth, tooth_w, tooth_h, outerRingWidth, outerStroke, outerFill);
            }
            gearGroup.addChild(testGear);
            outerRadius = numTeethToRadius(outerNumTeeth, tooth_w, tooth_h);
        }

        if (innerNumTeeth != innerSetting || innerOuterChanged) {
            console.log("changing inner gear");
            innerNumTeeth = innerSetting;
            innerTestGear.remove();
            if (innerLarger) { //turn it into an outer gear
                innerTestGear = new OuterGear(view.center, innerNumTeeth, tooth_w, tooth_h, outerRingWidth, innerStroke, innerFill);
            }
            else {
                innerTestGear = new Gear(view.center, innerNumTeeth, tooth_w, tooth_h, innerStroke, innerFill);
            }
            gearGroup.addChild(innerTestGear);
            innerRadius = numTeethToRadius(innerNumTeeth, tooth_w, tooth_h);
            updateInnerGear();
        }

        updateTargetAngle();
    }

    var newPenDist = $('#pen-distance-slider').val() / 100.0 * innerRadius;
    if(d != newPenDist) {
        d = newPenDist;
        updateTargetAngle();
        console.log(newPenDist);
        updatePenPoint();
    }

    speed = $('#speed-slider').val() * 0.035 - 0.025;

    if(running) {
        updateStep();
    }
}

function updateTargetAngle() {
    updatePetalsAndTurns();
    targetRollingAngle = rollingAngle - 2.0 * Math.PI * numberOfTurns;
        //console.log("turns: ", numberOfTurns);
        //console.log("updating target: ", targetRollingAngle, rollingAngle);
}

function updatePenPoint() {
    updateGears(lastPlottedAngle);
}

function updateLine(newRollingAngle) {
    return _updateLineAndGears(newRollingAngle, false, true);
}

function updateGears(newRollingAngle) {
    return _updateLineAndGears(newRollingAngle, true, false);
}

function _updateLineAndGears(newRollingAngle, doGears, drawLine) {
    //angle inner gear is rotated to
    var innerAngle = newRollingAngle * ((outerNumTeeth - innerNumTeeth) / innerNumTeeth);

    //coordinates of center of inner circle
    var outerX = (outerRadius - innerRadius) * Math.cos(newRollingAngle);
    var outerY = (outerRadius - innerRadius) * Math.sin(newRollingAngle);

    //coordinates of pen hole inside inner circle
    var innerX = d * Math.cos(innerAngle);
    var innerY = -1.0 * d * Math.sin(innerAngle);
    var x = outerX + innerX;
    var y = outerY + innerY;
    if(drawLine && penDown) {
        path.lineTo(start + [x, y]);
    }

    if(doGears) {
        //update inner gear
        penPoint.position = view.center + new Point(x, y);

        innerTestGear.position = view.center + new Point((outerRadius - innerRadius) * Math.cos(newRollingAngle),
                                                         (outerRadius - innerRadius) * Math.sin(newRollingAngle));
        innerGearCenter.position = innerTestGear.bounds.center;
        innerTestGear.rotation = toDegrees(-innerAngle);
        penLine.firstSegment.point = innerTestGear.bounds.center;
        var ix = innerTestGear.bounds.center.x + innerRadius * Math.cos(innerAngle);
        var iy = innerTestGear.bounds.center.y - innerRadius * Math.sin(innerAngle);
        penLine.lastSegment.point = new Point(ix, iy);
    }
}

function updateStep() {
        var n = 10;
        //compute location of next spiro points within outer circle
        for (var l = 0; l < n; l++) {
            updateLine(rollingAngle);
            rollingAngle -= speed / n;
            if(rollingAngle < targetRollingAngle) {
                rollingAngle = targetRollingAngle;
                updateLine(rollingAngle);
                running = false;
                showPlayButton();
                rollingAngle = rollingAngle % (2.0*Math.PI);
                break;
            }
        }
        lastPlottedAngle = rollingAngle;
        updateGears(rollingAngle);
}

function updateInnerGear() {
    var innerAngle = rollingAngle * ((outerNumTeeth - innerNumTeeth) / innerNumTeeth);

    //coordinates of center of inner circle
    var outerX = (outerRadius - innerRadius) * Math.cos(rollingAngle);
    var outerY = (outerRadius - innerRadius) * Math.sin(rollingAngle);

    //coordinates of pen hole inside inner circle
    var innerX = d * Math.cos(innerAngle)
    var innerY = -1.0 * d * Math.sin(innerAngle);
    x = outerX + innerX;
    y = outerY + innerY;

    //updateInnerGear
    penPoint.position = view.center + new Point(x, y);
    innerTestGear.position = view.center + new Point((outerRadius - innerRadius) * Math.cos(rollingAngle), (outerRadius - innerRadius) * Math.sin(rollingAngle));
    innerGearCenter.position = innerTestGear.bounds.center;
    //innerTestGear.rotation = toDegrees(-innerAngle);
    penLine.firstSegment.point = innerTestGear.bounds.center;
    var ix = innerTestGear.bounds.center.x + innerRadius * Math.cos(innerAngle);
    var iy = innerTestGear.bounds.center.y - innerRadius * Math.sin(innerAngle);
    penLine.lastSegment.point = new Point(ix, iy);
}

function toDegrees(angle) {
    return angle * 180.0 / Math.PI;
}

//whenever window is resized, recenter the path
function onResize(event) {
    path.position = view.center;
}

//clear pattern
function clearPattern() {
    path.remove();
    path = new Path();
    drawing.removeChildren();
    drawing = new Group();
    cleared = true;
    updateTargetAngle();
};

//clear screen
$('#clear-button').click(clearPattern);

function hideAllExceptDrawing() {
    gearGroup.visible = false;
    path.visible = true;
    drawing.visible = true;

    paper.view.draw();
}

function showAll() {
    gearGroup.visible = true;
    path.visible = true;
    drawing.visible = true;

    paper.view.draw();
}

//turn download into a url?
function downloadDataUri(options) {
if (!options.url)
    options.url = "https://download-data-uri.appspot.com/";
$('<form method="post" action="' + options.url
    + '" style="display:none"><input type="hidden" name="filename" value="'
    + options.filename + '"/><input type="hidden" name="data" value="'
    + options.data + '"/></form>').appendTo('body').submit().remove();
}

function makeGearsExport() {
    var exportedGears = new Group();
    exportedGears.remove(); // Remove this from the rendered document

    // Helper function to do common prep steps that we want to do on everything
    function cloneForExport(item) {
        clone = item.clone({insert: false});
        clone.setFillColor(null);
        clone.setStrokeColor(Color(0,0,0));
        clone.setStrokeWidth(1);
        exportedGears.addChild(clone);
        return clone;
    };

    // Clone these object and add them to exported view
    var exInnerGear = cloneForExport(innerTestGear);
    var exOuterGear = cloneForExport(testGear);
    var exPenPoint = cloneForExport(penPoint);

    // Update some specific bits and pieces
    exInnerGear.position = view.center;
    exInnerGear.rotation = 0.;
    exOuterGear.position = view.center;
    exOuterGear.rotation = 0.;
    exPenPoint.position = view.center + new Point(d, 0.);

    // I couldn't figure out how to get paper.js to export a group and include an svg root + view box
    // For now, we just manually write some minimal boilerplate to make this work
    // This assumes view start at 0,0. If not, might need some extra properties
    var exportWidth = paper.view.bounds.width;
    var exportHeight = paper.view.bounds.height;
    svgString = "<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"" + exportWidth + "\" height=\"" + exportHeight + "\">";
    svgString += exportedGears.exportSVG({asString: true});
    svgString += "</svg>";

    return svgString;
}

//export drawing
$('#download-drawing-button').click(function() {
    filename = prompt("Save drawing as ", "spiro_" + Date.now() + Math.floor(Math.random() * 1000));
    if(filename.length >= 1) {
        hideAllExceptDrawing();
        paper.view.element.toBlob(function (blob) {
            saveAs(blob, filename + ".png");
        });
        showAll();
    }
});

//export gears
$('#download-gears-button').click(function() {
    filename = prompt("Save gear file as ", "spiro_" + Date.now() + Math.floor(Math.random() * 1000));
    if(filename.length >= 1) {
        svgString = makeGearsExport();
        var svgBlob = new Blob([svgString], {type: 'image/svg+xml'});
        saveAs(svgBlob, filename + ".svg");
    }
});



$('#inner-gear-teeth-slider').change(function() {
    updatePetalsAndTurns();
});

$('#outer-gear-teeth-slider').change(function() {
    updatePetalsAndTurns();
});

$('#pen-distance-slider').change(function() {
    updatePetalsAndTurns();
});

function updatePetalsAndTurns() {
    numberOfPetals = lcm(outerNumTeeth, innerNumTeeth)/Math.min(outerNumTeeth, innerNumTeeth);
    numberOfTurns =  lcm(outerNumTeeth, innerNumTeeth)/Math.max(outerNumTeeth, innerNumTeeth);

    $('#num-petals').text(numberOfPetals);
    $('#num-turns').text(numberOfTurns);
}

$('#play-button').click(function() {
    running = true;
    showPauseButton();
});

$('#pause-button').click(function() {
    running = false;
    showPlayButton();
});

function showPlayButton() {
    $('#play-button').show();
    $('#pause-button').hide();
}

function showPauseButton() {
    $('#play-button').hide();
    $('#pause-button').show();
}

//click the hidden color picker when color wheel image is clicked
$("#color-wheel").on('click', function () {
    $("#pick-color").click();
});

$("#pick-color").on('input', function () {
    if(penDown) {
        currentColor = this.value;
        $(selectedColorButton).css('backgroundColor', this.value);
        penDownAndStartNewLine();
    }
});

//one of the color buttons was clicked
$('.color-button').click(function() {
    $(selectedColorButton).removeClass('selected');
    $('.no-color-button').removeClass('selected');
    selectedColorButton = this;
    $(selectedColorButton).addClass('selected');
    currentColor = this.style.backgroundColor;

    penDownAndStartNewLine();
});

$('.no-color-button').click(function() {
    penUp();
    $(selectedColorButton).removeClass('selected');
    $(this).addClass('selected');
    selectedColorButton = null;
});

function penUp() {
    penDown = false;
    console.log("pen up");
}

function penDownAndStartNewLine() {
    penDown = true;
    addToPatternGroup();
}

function radiusToNumTeeth(radius, tooth_w, tooth_h) {
    //angle (that is fraction of full circle corresponding to location of tooth on edge) = 2 * arcsin (chord length / 2 * radius of big circle)
    var tooth_angle = 2.0 * Math.asin(tooth_w/(2.0*radius));
    //make sure tooth width divides evenly, change size of circle to fit number of teeth requested
    var num_teeth = round(2.0*PI / tooth_angle);
    return num_teeth;
}

function numTeethToRadius(num_teeth, tooth_w, tooth_h) {
    var tooth_angle = 2.0 * Math.PI / num_teeth;
    var radius = 0.5 * (tooth_w / Math.sin(tooth_angle / 2.0)); //2r = chord length / sin(angle / 2)
    return radius;
}

function fromPolar(x, y, radius, theta) {
    return new Point(x, y) + new Point(radius * Math.cos(theta), radius * Math.sin(theta));
}

function fromPolarAtOrigin(radius, theta) {
    return new Point(radius * Math.cos(theta), radius * Math.sin(theta));
}

function lcm(a, b) {
    return a * b / gcd(a, b);
}

function gcd(a, b) {
    if(a < b) {
        return gcd(a, b-a);
    }
    else if(b < a) {
        return gcd(a-b,b);
    }
    else{
        return a;
    }
}

function OuterGear(center, num_teeth, tooth_w, tooth_h, ring_width, strokeColor, fillColor) {
    var gear = new Gear(center, num_teeth, tooth_w, tooth_h);
    var circle = new Path.Circle(center, gear.computedRadius + ring_width);
    var outerGear = new CompoundPath();
    outerGear.addChild(circle);
    outerGear.addChild(gear);
    outerGear.strokeColor = strokeColor;
    outerGear.fillColor = fillColor;
    outerGear.num_teeth = gear.num_teeth;
    outerGear.computedRadius = gear.computedRadius;
    outerGear.applyMatrix = false;
    outerGear.fillRule = 'evenodd';
    return outerGear;
}

function Gear(center, num_teeth, tooth_w, tooth_h, strokeColor, fillColor) {

    this.center = center.clone();
    this.num_teeth = num_teeth;
    this.tooth_w = tooth_w;
    this.tooth_h = tooth_h;

    var gearPath = new Path();

    //if(num_teeth < SMALLEST_NUM_TEETH) num_teeth = SMALLEST_NUM_TEETH;

    var tooth_angle = 2.0 * Math.PI / num_teeth;
    var radius = 0.5*(tooth_w / Math.sin(tooth_angle / 2.0)); //2r = chord length / sin(angle / 2)

    var sagitta = radius*(1-Math.cos(tooth_angle/2)); //distance between center of chord and highest point of arc

    //place first vertex
    gearPath.moveTo(fromPolar(center.x, center.y, radius, 0));

    var delta = tooth_angle;

    for (var i=tooth_angle;i < 2.0*Math.PI + 0.0001; i+=tooth_angle) {
        if(delta > 2.0*Math.PI) { delta = delta - 2*Math.PI; }

        var angle_a = delta-tooth_angle;
        var angle_b = delta-0.5*tooth_angle;
        var angle_c = delta;

        var a = fromPolar(center.x, center.y, radius, angle_a);
        var b = fromPolar(center.x, center.y, radius, angle_b);
        var c = fromPolar(center.x, center.y, radius, angle_c);

        // build the normal vector for the chord between the tooth endpoints
        var n = c - b;
        n = n.normalize();
        n = n.rotate(90);

        //find circle tangent to the sagitta to guide outer tooth as though it were converging on radius
        var guideCircle = center - (n * 2.0 * (radius-sagitta));

        var a_inside = fromPolar(center.x, center.y, radius - tooth_h, angle_a);
        var b_inside = fromPolar(center.x, center.y, radius - tooth_h, angle_b);

        var a_outside = guideCircle + fromPolarAtOrigin(radius - tooth_h, Math.PI+angle_c); // note that angle_a/angle_b are swapped coming from the toCircle
        var b_outside = guideCircle + fromPolarAtOrigin(radius - tooth_h, Math.PI+angle_b);

        gearPath.cubicCurveTo(a_inside.x, a_inside.y, b_inside.x, b_inside.y, b.x, b.y);
        gearPath.cubicCurveTo(a_outside.x, a_outside.y, b_outside.x, b_outside.y, c.x, c.y);

        delta += tooth_angle;
    }
    //gearPath.lineTo(center); //debugging
    gearPath.strokeColor = strokeColor;
    gearPath.fillColor = fillColor;
    gearPath.num_teeth = this.num_teeth;
    gearPath.computedRadius = radius;
    gearPath.applyMatrix = false;

    return gearPath;
}
