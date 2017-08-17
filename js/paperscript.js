//hypotrochoid variables
var x = 0;
var y = 0;
var outerRadius = 120;
var innerRadius = 52;
var d = 30;
var i = 0;
var speed = 0.05;

var running = true;
var penDown = true;

var testGear = new Gear(view.center, 20, 120, 10, 20);
testGear.strokeColor = 'green';

//outer gear
var outerGear = new Path.Circle(view.center, outerRadius);
outerGear.strokeColor = 'black';

//inner gear
var innerGear = new Path.Circle(view.center, innerRadius);
innerGear.strokeColor = 'blue';

//inner gear center point
var innerGearCenter = new Path.Circle(innerGear.bounds.center, 3);
innerGearCenter.fillColor = 'blue';

//hole for pen
var penPoint = new Path.Circle(view.center, 3);
penPoint.fillColor = 'red';

//radius line through pen hole
var penLine = new Path();
penLine.strokeColor = 'red';
penLine.moveTo(innerGear.bounds.center);
penLine.lineTo(innerGear.bounds.center.x + innerRadius, innerGear.bounds.center.y);

var gearGroup = new Group();
gearGroup.addChild(testGear);
gearGroup.addChild(innerGear);
gearGroup.addChild(outerGear);
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
    var raster = path.rasterize();
    drawing.addChild(raster);
    path.remove();
    path = new Path();
}

//do every frame
function onFrame(event) {

    //check if stroke color changed
    if (path.strokeColor !== newColor) {
        var width = path.strokeWidth;
        addToPatternGroup();
        path.strokeCap = 'round';
        path.strokeWidth = width;
        path.strokeColor = newColor;
        //console.log("color changed");
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
        //console.log("stroke weight changed");
    }
    newStrokeWidth = path.strokeWidth;

    //update number of teeth, pen distance, speed
    outerRadius = $('#outer-gear-teeth-slider').val();
    outerGear.scale(outerRadius * 2.0 / outerGear.bounds.width);
    innerRadius = $('#inner-gear-teeth-slider').val();
    innerGear.scale(innerRadius * 2.0 / innerGear.bounds.width);
    d = $('#pen-distance-slider').val() / 100 * innerRadius;
    speed = $('#speed-slider').val() * 0.035 - 0.025;

    if(running) {

        var n = 10;
        for (var l = 0; l < n; l++) {
            //calculate location of next spiro point
            x = (outerRadius - innerRadius) * Math.cos(i) + d * Math.cos(((outerRadius - innerRadius) / innerRadius) * i);
            y = (outerRadius - innerRadius) * Math.sin(i) - d * Math.sin(((outerRadius - innerRadius) / innerRadius) * i);
            if(penDown) {
                path.lineTo(start + [x, y]);
            }

            //update the inner gear
            penPoint.position = view.center + new Point(x, y);
            innerGear.position = view.center + new Point((outerRadius - innerRadius) * Math.cos(i), (outerRadius - innerRadius) * Math.sin(i));
            innerGearCenter.position = innerGear.bounds.center;
            penLine.firstSegment.point = innerGear.bounds.center;
            var ix = innerGear.bounds.center.x + innerRadius * Math.cos(((outerRadius - innerRadius) / innerRadius) * i);
            var iy = innerGear.bounds.center.y - innerRadius * Math.sin(((outerRadius - innerRadius) / innerRadius) * i);
            penLine.lastSegment.point = new Point(ix, iy);

            i -= speed / n;
        }
    }
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
    //paper.view.draw();
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

$('#play-button').click(function() {
    running = !running;
});

$('#penup-button').click(function() {
    penDown = !penDown;
});

//color picker
$(document).ready(function() {
    //configure color picker
	$("#colorpicker").spectrum({
        color: "#00",
        showInput: true,
        className: "full-spectrum",
        showInitial: false,
        showSelectionPalette: false,
        preferredFormat: "rgb",
        showPaletteOnly: true,
        togglePaletteOnly: true,
        togglePaletteMoreText: 'more',
        togglePaletteLessText: 'less',
        clickoutFiresChange: true,
        maxPaletteSize: 10,
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
        palette: [ //colors to include in color picker
            ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)",
                "rgb(204, 204, 204)", "rgb(217, 217, 217)","rgb(255, 255, 255)"],
            ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
                "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"]
        ]
    });
});

function fromPolar(x, y, radius, theta) {
    return new Point(x, y) + new Point(radius * Math.cos(theta), radius * Math.sin(theta));
}

function fromPolarAtOrigin(radius, theta) {
    return new Point(radius * Math.cos(theta), radius * Math.sin(theta));
}

function Gear(center, num_teeth, radius, tooth_w, tooth_h) {

    this.center = center.clone();
    this.num_teeth = num_teeth;
    this.radius = radius;
    this.tooth_w = tooth_w;
    this.tooth_h = tooth_h;

    var gearPath = new Path();

    /*
     if set by radius
     //angle (that is fraction of full circle corresponding to location of tooth on edge) = 2 * arcsin (chord length / 2 * radius of big circle)
     //tooth_angle = 2 * Math.asin(tooth_w/(2.0*radius));
     //make sure tooth width divides evenly, change size of circle to fit number of teeth requested
     //num_teeth = round(2*PI / tooth_angle);
     */

    //if(num_teeth < SMALLEST_NUM_TEETH) num_teeth = SMALLEST_NUM_TEETH;

    var tooth_angle = 2.0 * Math.PI / num_teeth;
    this.radius = 0.5*(tooth_w / Math.sin(tooth_angle / 2.0)); //2r = chord length / sin(angle / 2)

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

    return gearPath;



    //gearPath.moveTo(fromPolar(this.center.x, this.center.y, 0, this.radius-tooth_h));

    //var bigCircle = new Path.Circle(new Point(this.center.x+this.radius-this.tooth_w, this.center.y), 3);
    //bigCircle.fillColor = 'red';
    //var points = [];
    //points.push(new Path.Circle(fromPolar(this.center.x, this.center.y, 0, this.radius), 3));
    //points[points.length-1].fillColor = 'black';


    //console.log(fromPolar(0, 0, Math.PI/3.0, 100.0).x);
    //var delta = Math.PI/32;
    //for(var i=delta;i<2.0*Math.PI;i+=4*delta) {
    //    //points.push(new Path.Circle(fromPolar(0, 0, i, 100), 3));
    //    //points[points.length-1].fillColor = 'black';
    //    //console.log(i + " " + points[points.length-1].bounds.center.x);
    //   // console.log(fromPolar(this.center.x, this.center.y, this.radius + this.tooth_w, i).x);
    //   // points.push(new Path.Circle(fromPolar(this.center.x, this.center.y, i, this.radius + this.tooth_w), 3));
    //   // points[points.length-1].fillColor = 'black';
    //   // points.push(new Path.Circle(fromPolar(this.center.x, this.center.y, i + delta, this.radius - this.tooth_w), 3));
    //   // points[points.length-1].fillColor = 'black';
    //   // gearPath.curveTo(fromPolar(this.center.x, this.center.y, i, this.radius + this.tooth_h), fromPolar(this.center.x, this.center.y, i+delta, this.radius));
    //   // gearPath.curveTo(fromPolar(this.center.x, this.center.y, i+2*delta, this.radius - this.tooth_h), fromPolar(this.center.x, this.center.y, i+3*delta, this.radius));
    //    gearPath.cubicCurveTo(fromPolar(this.center.x, this.center.y, i+delta/2.0, this.radius - this.tooth_h/2.0), fromPolar(this.center.x, this.center.y, i+delta*1.5, this.radius + this.tooth_h/2.0), fromPolar(this.center.x, this.center.y, i+2*delta, this.radius + this.tooth_h));
    //    gearPath.cubicCurveTo(fromPolar(this.center.x, this.center.y, i+delta*2.5, this.radius + this.tooth_h/2.0), fromPolar(this.center.x, this.center.y, i+delta*3.5, this.radius - this.tooth_h/2.0), fromPolar(this.center.x, this.center.y, i+4*delta, this.radius - this.tooth_h));
    //}
    //return gearPath;

    //surface.beginShape();

    /*
    if set by radius
    //angle (that is fraction of full circle corresponding to location of tooth on edge) = 2 * arcsin (chord length / 2 * radius of big circle)
    //tooth_angle = 2 * Math.asin(tooth_w/(2.0*radius));
    //make sure tooth width divides evenly, change size of circle to fit number of teeth requested
    //num_teeth = round(2*PI / tooth_angle);
    */

    //if(num_teeth < SMALLEST_NUM_TEETH) num_teeth = SMALLEST_NUM_TEETH;

//    var tooth_angle = 2.0 * PI / num_teeth;
//    this.radius = 0.5*(tooth_w / Math.sin(tooth_angle / 2.0)); //2r = chord length / sin(angle / 2)
//
//  var sagitta = radius*(1-Math.cos(tooth_angle/2)); //distance between center of chord and highest point of arc
////    surface.vertex(toArray2d(fromPolar(x, y, r, theta)));
//    var delta = theta + tooth_angle;
//    for (var i=tooth_angle;i < 2.0*PI + 0.0001; i+=tooth_angle) {
//        if(delta > 2.0*PI) { delta = delta - 2*PI; }
//        var angle_a = delta-tooth_angle;
//        var angle_b = delta-0.5*tooth_angle;
//        var angle_c = delta;
//
//        PVector a = center + fromPolar(radius, angle_a);
//        PVector b = center + fromPolar(radius, angle_b);
//        PVector c = center + fromPolar(radius, angle_c);
//
//        // build the normal vector for the chord between the tooth endpoints
//        var n = c - b;
//        n = n.normalize();
//        n= n.rotate(PI/2);
//
//        //find circle tangent to the sagitta to guide outer tooth as though it were converging on radius
//        var guideCircle = center + (n * 2.0 * (radius-sagitta));
//
//        var a_inside = center + polarPVector(r - tooth_h, angle_a);
//        var b_inside = center + polarPVector(r - tooth_h, angle_b);
//
//        var a_outside = guideCircle + fromPolar(radius - tooth_h, PI+angle_c); // note that angle_a/angle_b are swapped coming from the toCircle
//        var b_outside = guideCircle + fromPolar(radius - tooth_h, PI+angle_b);
//
//        surface.bezierVertex(a_inside.x, a_inside.y, b_inside.x, b_inside.y, b.x, b.y);
//        surface.bezierVertex(a_outside.x, a_outside.y, b_outside.x, b_outside.y, c.x, c.y);
//
//        delta += tooth_angle;
//    }
////      surface.vertex(toArray2d(fromPolar(x, y, r, theta)));
//    surface.endShape();
}
