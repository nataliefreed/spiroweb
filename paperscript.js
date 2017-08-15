//var outerCircle =

//create a spiro path
var path = new Path();
// Give the stroke a color
path.strokeColor = 'black';
path.strokeCap = 'round';
var newColor = 'black';
var newStrokeWidth = path.strokeWidth;

var x = 0;
var y = 0;
var R = 100;
var r = 52;
var d = 30;
var i = 0;

var start = view.center;

//every frame
function onFrame(event) {
    //check if stroke color changed
    if (path.strokeColor !== newColor) {
        var width = path.strokeWidth;
        path = new Path();
        path.strokeCap = 'round';
        path.strokeWidth = width;
        path.strokeColor = newColor;
        console.log("color changed");
    }
    newColor = path.strokeColor;

    //check if strokeWidth changed
    newStrokeWidth = $('#pen-width-slider').val();
    if (path.strokeWidth != newStrokeWidth) {
        var color = path.strokeColor;
        path = new Path();
        path.strokeCap = 'round';
        path.strokeColor = color;
        path.strokeWidth = newStrokeWidth;
        console.log("stroke weight changed");
    }
    newStrokeWidth = path.strokeWidth;

    //get latest values from teeth & pen distance sliders
    R = $('#outer-gear-teeth-slider').val();
    r = $('#inner-gear-teeth-slider').val();
    d = $('#pen-distance-slider').val();

    //calculate location of next spiro point
    var n = 10;
    for(var l = 0; l < n; l++) {
        x = (R - r) * Math.cos(i) + d * Math.cos(((R - r) / r) * i);
        y = (R - r) * Math.sin(i) - d * Math.sin(((R - r) / r) * i);
        path.lineTo(start + [ x, y ]);
         //$('#x').text(r);
//         $('#y').text(R);
        i += 0.2 / n;
    }
}

//clear pattern
function clearPattern() {
patternGroup.removeChildren();
patternGroup = new Group(activeOutfit.clone());
patternGroup.clipped = true;
paper.view.draw();
};

//whenever window is resized, recenter the path
function onResize(event) {
    path.position = view.center;
}

//clear screen
$('#clear-button').click(clearScreen);
function clearScreen() {
    project.clear();
}

//turn export into a url?
function downloadDataUri(options) {
if (!options.url)
    options.url = "https://download-data-uri.appspot.com/";
$('<form method="post" action="' + options.url
    + '" style="display:none"><input type="hidden" name="filename" value="'
    + options.filename + '"/><input type="hidden" name="data" value="'
    + options.data + '"/></form>').appendTo('body').submit().remove();
}

//export
$('#export-button').click(function() {
    var svg = project.exportSVG({ asString: true });
    downloadDataUri({
        data: 'data:image/svg+xml;base64,' + btoa(svg),
        filename: 'export.svg'
    });
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