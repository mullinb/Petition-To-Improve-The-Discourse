
    var canvas = document.getElementById('canvas');
    try {var context = canvas.getContext('2d');}
    catch(error) {};

    var canvasDisplay = document.getElementById('canvasDisplay');
    try {var contextDisplay = canvasDisplay.getContext('2d');}
    catch(error) {};


    $('#canvas').on("mousedown", function(e) {
        if (e.target === document.querySelector("#canvas")) {
            (function (context) {
                context.beginPath();
            }(context));
            $(document).on("mousemove.draw", function(e){
                e.preventDefault();
                (function(context) {
                    context.strokeStyle = '#19131';
                    context.lineTo(e.pageX - canvas.offsetLeft, e.pageY-canvas.offsetTop);
                    context.stroke();
                }(context));
            })
            $(document).on("mouseup.draw", function(e){
                $(document).off("mousemove.draw");
                $(document).off("mouseup.draw");
                $("#siginput").val(canvas.toDataURL());
            })
        }
    })

    $('#reset').on('click', function(e) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        $("#siginput").val('');
    })

    $('#reset2').on('click', function(e) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        $("#siginput").val('');
    })
    console.log(document.getElementById('cityinput'))

    if (document.getElementById('cityinput')) {
            var autocomplete = new google.maps.places.Autocomplete((document.getElementById('cityinput')), {
                    types: ['(cities)']
                });
                console.log('anything')
    }
