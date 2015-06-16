// Create a Paper.js Path to draw a line into it:
	var path = new Path();
	// Give the stroke a color
	path.strokeColor = 'black';
	var start = view.center;


	var x = 0;
	var y = 0;
	var R = 100;
	var r = 52;
	var d = 30;
	var i = 0;

	x = (R - r) * Math.cos(0) + d * Math.cos(((R - r) / r) * 0);
    y = (R - r) * Math.sin(0) - d * Math.sin(((R - r) / r) * 0);
	path.moveTo(start + [x, y]);
	
	function onFrame(event) {
        
        path.strokeWidth = $('#pen-width-slider').val();
        R = $('#outer-gear-teeth-slider').val();
        r = $('#inner-gear-teeth-slider').val();
        d = $('#pen-distance-slider').val();
        
	// Your animation code goes in here
	   //x = (100 - 52) * Math.cos(Math.PI) + 40* Math.cos(((100 - 52) / 52) * Math.PI);
       // y = (100 - 52) * Math.sin(0) + 40* Math.sin(((100 - 52) / 52) * 0);
       // 
        var n = 10;
        for(var l = 0; l < n; ++l) {
		    x = (R - r) * Math.cos(i) + d * Math.cos(((R - r) / r) * i);
	        y = (R - r) * Math.sin(i) - d * Math.sin(((R - r) / r) * i);
    	    path.lineTo(start + [ x, y ]);  
	//         $('#x').text(r);
	//         $('#y').text(R);
	        i += 0.2 / n;            
        }
	}	

	function onResize(event) {
    	// Whenever the window is resized, recenter the path:
    	path.position = view.center;
	}


	$('#clear-button').click(clearScreen);

//  	$('#clear-button').on('click', clearScreen); //TO ASK: why doesn't this work?!!!!!

	function clearScreen() {
        	project.clear();
// //         path = new Path();
// //         x = (R - r) * Math.cos(0) + d * Math.cos(((R - r) / r) * 0);
// //     	y = (R - r) * Math.sin(0) - d * Math.sin(((R - r) / r) * 0);
// //         path.moveTo(start + [x, y]);
    }
	
	function downloadDataUri(options) {
	if (!options.url)
		options.url = "https://download-data-uri.appspot.com/";
	$('<form method="post" action="' + options.url
		+ '" style="display:none"><input type="hidden" name="filename" value="'
		+ options.filename + '"/><input type="hidden" name="data" value="'
		+ options.data + '"/></form>').appendTo('body').submit().remove();
	}

	$('#export-button').click(function() {
		var svg = project.exportSVG({ asString: true });
		downloadDataUri({
			data: 'data:image/svg+xml;base64,' + btoa(svg),
			filename: 'export.svg'
		});
    });

$(document).ready(function() {
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
            path.strokeColor = color.toHexString();       
    },
    palette: [
        ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)",
        "rgb(204, 204, 204)", "rgb(217, 217, 217)","rgb(255, 255, 255)"],
        ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)",
        "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"]
    ]
});
    
    
    	
});