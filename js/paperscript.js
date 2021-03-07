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
path.strokeColor = 'black';
path.strokeCap = 'round';
var newColor = 'black';
var newStrokeWidth = path.strokeWidth;

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

    var width = path.strokeWidth;
    path.remove();
    path = new Path();
    path.strokeCap = 'round';
    path.strokeWidth = width;
    path.strokeColor = newColor;
}

var numberOfPetals;
var numberOfTurns;
updatePetalsAndTurns();
updateTargetAngle();

//do every frame
function onFrame(event) {

    //check if stroke color changed
    //note: this runs every frame rather than being event driven due to onChange only firing on mouse release
    //there might be a way to deal with this (oninput?) but I haven't found a cross-browser way yet
    if (path.strokeColor !== newColor) {
        addToPatternGroup();
    }
    newColor = path.strokeColor;

    //check if strokeWidth changed
    newStrokeWidth = $('#pen-width-slider').val();
    if (path.strokeWidth != newStrokeWidth) {
        var color = path.strokeColor;
        addToPatternGroup();
        path.strokeCap = 'round';
        path.strokeColor = color;
        path.strokeWidth = newStrokeWidth;
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
    //var innerAngle = lastPlottedAngle * ((outerNumTeeth - innerNumTeeth) / innerNumTeeth);
    //
    ////coordinates of center of inner circle
    //var outerX = (outerRadius - innerRadius) * Math.cos(lastPlottedAngle);
    //var outerY = (outerRadius - innerRadius) * Math.sin(lastPlottedAngle);
    //
    ////coordinates of pen hole inside inner circle
    //var innerX = d * Math.cos(innerAngle);
    //var innerY = -1.0 * d * Math.sin(innerAngle);
    //x = outerX + innerX;
    //y = outerY + innerY;
    //
    //penPoint.position = view.center + new Point(x, y);
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
    if(drawLine) {
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
                $('#play-button').text("Go");
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

//export
$('#download-button').click(function() {
    var filename = $('#filename').val();
    //if no filename entered in text field
    if(filename.length < 1) {
        filename = prompt("Save image as ", "spiro_" + Date.now() + Math.floor(Math.random() * 1000));
    }
    if(filename.length >= 1) {
        hideAllExceptDrawing();
        paper.view.element.toBlob(function(blob) { saveAs(blob, filename + ".png");});
        showAll();
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
    var text = $('#play-button').text();
    if(text === "Stop") {
        running = false;
        $('#play-button').text("Go");
    }
    else {
        running = true;
        $('#play-button').text("Stop");
    }
});

$('#penup-button').click(function() {
    var text = $('#penup-button').text();
    if(text === "Pen up") { //switch to pen up
        penDown = false;
        $('#penup-button').text("Pen down");
    }
    else {
        penDown = true;
        $('#penup-button').text("Pen up");
        addToPatternGroup();
        path.strokeCap = 'round';
        path.strokeWidth = $('#pen-width-slider').val();
        path.strokeColor = newColor;
        //updateTargetAngle(); //make sure to finish the shape if pen was raised while drawing it
    }
});

//color picker
var colorArray = [["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)",
        "rgb(204, 204, 204)", "rgb(217, 217, 217)","rgb(255, 255, 255)"],
    ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
        "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"]];
var randomInt = Math.floor(Math.random() * 10);
if(randomInt === 0 || randomInt === 3) { //all but yellow and brown
    randomInt = 6; //blue!
}
var randomStartColor = colorArray[1][randomInt];
newColor = randomStartColor;
$(document).ready(function() {
    //configure color picker
	$("#colorpicker").spectrum({
        color: randomStartColor,
        showInput: true,
        className: "full-spectrum",
        showInitial: false,
        showSelectionPalette: true,
        preferredFormat: "rgb",
        showPaletteOnly: true,
        togglePaletteOnly: true,
        togglePaletteMoreText: 'more',
        togglePaletteLessText: 'less',
        localStorageKey: "spiro.colors.saved",
        clickoutFiresChange: true,
        //maxPaletteSize: 10,
        showAlpha: true,

        move: function (color) {

        },
        show: function () {

        },
        beforeShow: function () {

        },
        hide: function () {

        },
        change: function(color) {
            newColor = color.toHexString();
        },
        palette: colorArray
    });
});

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
