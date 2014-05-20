//Global variables
var map, initialLocation, numberOfStops, userPreference, startPoint, endPoint, midPoint, timeVar, myLat, myLong, radius, destination, destinationLoc, myDestination, myDestLong, myDestLat, midpointLat, midpointLong, midpointLoc, match, searchQuery, radius;
var markersArray = [];
var tips = [];
var venues = [];
var latitudes = [];
var longitudes = [];
var waypts = [];
var infowindow = null;
var autocompleteHidden = false;
var gotLocation = false;
var counter = -1;
var directionsDisplay, directionsService;

//Geolocation variables
var siberia = new google.maps.LatLng(60, 105);
var newyork = new google.maps.LatLng(40.729481987333855, -73.99361746883392);
var browserSupportFlag = new Boolean();

//Javascript code to get today's date - necessary to access Foursquare API
var d = new Date();
var month = d.getMonth()+1;
var day = d.getDate();
var todayDate = d.getFullYear() + ((''+month).length<2 ? '0' : '') + month + ((''+day).length<2 ? '0' : '') + day;

//Foursquare API Keys
var clientID = "J1LZV0KEVDQYOG2UGNZUAOMBE3GZBSTMB5JXX0AYCSRUUCBY";
var clientSecret = "1EY1CMKOWSAUD2DKK1QLP2UF4SV1GHY2W1S0JGUFI5CBFUO4";

//Foursquare Tip object
function foursquareTip(lat, lon, tipText, venueName, venueAddress) {
    this.lat = lat;
    this.lon = lon;
    this.tipText = tipText;
    this.venueName = venueName;
    this.venueAddress = venueAddress;
}

//Foursquare Venue object
function foursquareVenue(lat, lon, venueName, venueCat, venueDist) {
    this.lat = lat;
    this.lon = lon;
    this.venueName = venueName;
    this.venueCat = venueCat;
    this.venueDist = venueDist;
}

//Function to get Foursquare tips near the midpoint between origin and destination - AJAX call to Foursquare API
function getFoursquareTips(time) {
    deleteMarkers();

    var FoursquareURL = "https://api.foursquare.com/v2/venues/explore";
    var FoursquareKey = "&client_id=" + clientID + "&client_secret=" + clientSecret;
    var APIversion = "&v=" + todayDate;
    var latLong = "?ll=" + midpointLoc;
    var parameters = "&radius=" + radius;
    var limit = "&limit=50";
    var section = "&section=" + userPreference;
    var openNow = "&openNow=1";

    $.ajax({
        url: FoursquareURL + latLong + FoursquareKey + parameters + limit + section + openNow + APIversion,
        type: 'GET',
        dataType: 'json',
        error: function(msg){
            console.log("we got problems!");
        },
        success: function(data){

            var foursquareTips = data.response.groups[0].items;
            
            tips = [];
            waypts = [];

            for (var i = 0; i < foursquareTips.length; i++) {
                counter++;

                if (foursquareTips[i].tips == undefined) {
                    continue;
                }

                var tipLat = foursquareTips[i].venue.location.lat;
                var tipLon = foursquareTips[i].venue.location.lng;
                var tipDescription = foursquareTips[i].tips[0].text;
                var tipVenue = foursquareTips[i].venue.name;

                if (foursquareTips[i].venue.location.address == undefined) {
                    var tipAddress = "Neighborhood/Area";
                } else {
                    var tipAddress = foursquareTips[i].venue.location.address;
                }

                var tempObject = new foursquareTip(tipLat, tipLon, tipDescription, tipVenue, tipAddress);

                tips.push(tempObject);
            }

            //Change number of stops depending on time variable
            if (time == 15) {
                numberOfStops = 1;
            } else if (time == 30) {
                numberOfStops = 2;
            } else if (time == 45) {
                numberOfStops = 3;
            } else if (time == 60) {
                numberOfStops = 4;
            } else if (time == 75) {
                numberOfStops = 5;
            } else if (time == 90) {
                numberOfStops = 6;
            } else if (time == 105) {
                numberOfStops = 7;
            } else if (time == 120) {
                numberOfStops = 8;
            } 

            //Get a random sample of tips from entire array of tips returned by AJAX call
            var randomSample = _.sample(tips, numberOfStops);

            //Create waypoints for Google Maps direction request based on latitude + longitude of random sample of tips
            for (var i = 0; i < randomSample.length; i++) {
                waypts.push({
                    location: new google.maps.LatLng(randomSample[i].lat, randomSample[i].lon)
                });
            }

            directionsService = new google.maps.DirectionsService();
            var directionsRequest = {
                origin: originLoc,
                destination: destinationLoc,
                waypoints: waypts,
                optimizeWaypoints: true,
                travelMode: google.maps.DirectionsTravelMode.WALKING,
                unitSystem: google.maps.UnitSystem.METRIC
            };

            directionsService.route(directionsRequest, function(response, status){
                if (status == google.maps.DirectionsStatus.OK) {
                    directionsDisplay = new google.maps.DirectionsRenderer({
                        map: map,
                        directions: response,
                        suppressMarkers: true
                    });

                } else {
                    console.log("unable to retrieve route!");
                }
            });

            //Function to add tip markers to map
            addMarkers(map, randomSample);
        }
    });
}

//Function to plot route on Google Maps
function createRoute(time) {

        //Destination latitude + longitude
        myDestination = match;
        myDestLat = myDestination.lat;
        myDestLong = myDestination.lon;
        destinationLoc = myDestLat + "," + myDestLong;
        
        //Origin latitude + longitude
        originLoc = myLat + "," + myLong;

        //Midpoint latitude + longitude
        midpointLat = (myLat + myDestLat) / 2;
        midpointLong = (myLong + myDestLong) / 2;
        midpointLoc = midpointLat + "," + midpointLong;

        //Creating Google Maps latitude + longitude objects for directions request
        startPoint = new google.maps.LatLng(myLat, myLong);
        endPoint = new google.maps.LatLng(myDestLat, myDestLong);
        midPoint = new google.maps.LatLng(midpointLat, midpointLong);

        //Radius around midpoint
        radius = google.maps.geometry.spherical.computeDistanceBetween(startPoint, midPoint);

        getFoursquareTips(time);
}

//Function to add markers to the map
function addMarkers(map, markers) {

    //Adding markers for tips
    for (var i = 0; i < markers.length; i++) {

        var markerInfo = markers[i];

        var content = "<p><strong>" + markerInfo.venueName + "</strong><br><em>" + markerInfo.venueAddress + "</em><br>" + markerInfo.tipText + "</p>";

        var tipMarker = new google.maps.Marker({
            position: new google.maps.LatLng(markerInfo.lat, markerInfo.lon),
            map: map,
            icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
            html: content,
            animation: google.maps.Animation.DROP
        });

        google.maps.event.addListener(tipMarker, 'click', function() {
            //infowindow.setContent(this.html);
            //infowindow.open(map, this);

            //Add marker info to div below map
            $("#tip-info").html(this.html);
        });

        markersArray.push(tipMarker);
    }

    var startContent = "<p><strong>Start here!</strong></p>";

    //Marker for starting position - user's latitude + longitude
    var startMarker = new google.maps.Marker({
        position: startPoint,
        map: map,
        html: startContent,
        icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        animation: google.maps.Animation.DROP
    });

    google.maps.event.addListener(startMarker, 'click', function() {
        $("#tip-info").html(this.html);
    });

    var endContent = "<p><strong>Your destination: </strong>" + match.venueName + "</p>";

    //Marker for ending position - destination latitude + longitude
    var endMarker = new google.maps.Marker({
        position: endPoint,
        map: map,
        html: endContent,
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
        animation: google.maps.Animation.DROP
    });

    google.maps.event.addListener(endMarker, 'click', function() {
        $("#tip-info").html(this.html);
    });
}

function setAllMap(map) {
    for (var i = 0; i < markersArray.length; i++) {
        markersArray[i].setMap(map);
    }
}

function deleteMarkers() {
    setAllMap(null);
    markersArray = [];
}

//Function to initialize Google Map
function initializeMap() {

    var mapOptions = {
        center: initialLocation,
        zoom: 12,
        disableDefaultUI: true,
    };

    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

    infowindow = new google.maps.InfoWindow({
        content: "content goes here"
    });
}

//Get geolocation
if(navigator.geolocation) {

    browserSupportFlag = true;

    navigator.geolocation.getCurrentPosition(function(position) {

        initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        console.log(initialLocation);

        myLat = initialLocation.k;
        myLong = initialLocation.A;

        console.log("got location!");
        gotLocation = true
        console.log(gotLocation);
    },

    function() {
        handleNoGeolocation(browserSupportFlag);
    });
}

//If browser doesn't support geolocation
else {
    browserSupportFlag = false;
    handleNoGeolocation(browserSupportFlag);
}

function handleNoGeolocation(errorFlag) {
    if (errorFlag === true) {
        alert("Geolocation service failed.");
        initialLocation = newyork;
    } else {
        alert("Your browser doesn't support geolocation. We've placed you in Siberia.");
        initialLocation = siberia;
    }

    map.setCenter(initialLocation);
}

//Load home page
$(document).on("pageinit", "#home", function() {

    // if (!gotLocation) {

    //     setTimeout(function() {
    //         $.mobile.changePage("#loadingGeo");
    //     }, 100);
    // } 

    // if (gotLocation) {
    //     // $.mobile.changePage("#home");
    //     $("#loadingGeo").dialog('close');
    // }

    //Autocomplete search bar
    $("#autocomplete").on("filterablebeforefilter", function (e, data) {
        var $ul = $(this),
            $input = $(data.input),
            value = $input.val(),
            html = "";
        $ul.html("");

        //Activate when user has typed at least 3 letters
        if (value && value.length > 2) {
            if(autocompleteHidden) {
                $("#autocomplete").show();
                autocompleteHidden = false;
            }

            $ul.html("<li><div class='ui-loader'><span class='ui-icon ui-icon-loading'></span></div></li>");
            $ul.listview("refresh");

            //Variables for AJAX call to Foursquare's API
            var FoursquareURL2 = "https://api.foursquare.com/v2/venues/suggestCompletion";
            var FoursquareKey = "&client_id=" + clientID + "&client_secret=" + clientSecret;
            var APIversion = "&v=" + todayDate;
            var latLong = "?ll=" + myLat + "," + myLong;

            //AJAX call to get Foursquare venues nearby
            $.ajax({
                url: FoursquareURL2 + latLong + FoursquareKey + APIversion + "&limit=10" + "&query=" + $input.val(),
                type: 'GET',
                dataType: 'json'
            })
            .then(function (data) {

                //console.log(data);
                var allVenues = data.response.minivenues;

                venues = [];

                    for (var i = 0; i < allVenues.length; i++) {
                        var venueName = allVenues[i].name;
                        var venueLat = allVenues[i].location.lat;
                        var venueLong = allVenues[i].location.lng;
                        var venueCat = allVenues[i].categories[0].name;
                        var venueDist = allVenues[i].location.distance;

                        var tempObject = new foursquareVenue(venueLat, venueLong, venueName, venueCat, venueDist);

                        venues.push(tempObject);
                    }

                //Add venue results to autocomplete list
                $.each(venues, function (i, val) {
                    html += "<li>" + venues[i].venueName +
                            "<p>" + venues[i].venueCat + " - " + venues[i].venueDist + " meters away</p>" + "</li>";
                });

                $ul.html(html);
                $ul.listview("refresh");
                $ul.trigger("updatelayout");
            });
        }
    });

    //When clicking on list itme in autocomplete venues, make it the selected destination for the route
    $("#autocomplete").click(function(event) {
        if (event.target.className === "ui-li-static ui-body-inherit" || "ui-li-static ui-body-inherit ui-first-child" || "ui-li-static ui-body-inherit ui-last-child"){
                destination = event.target.firstChild.data;
                match = _.findWhere(venues, {venueName: destination});
            }

        $("#destination_display_content").html(match.venueName);
        $("#autocomplete").hide();
        autocompleteHidden = true;
    });

    $("#get_route_button").click(function() {
        timeVar = $("#time_slider").val();
    });

    $(".categoryChoice").on("vclick", function() {
        userPreference = event.target.htmlFor;
        return false;
    });
});

//Load map page
$(document).on("pageshow", "#map-page", function() {
    $("#content").height(getRealContentHeight());
    initializeMap();
    createRoute(timeVar);

    $("#new_route_button").click(function() {
        directionsDisplay.setDirections({routes: []});
        createRoute(timeVar);
    });
});

//Get available height of page - necessary to properly load Google Map
function getRealContentHeight() {
    var header = $.mobile.activePage.find("div[data-role='header']:visible");
    var footer = $.mobile.activePage.find("div[data-role='footer']:visible");
    var content = $.mobile.activePage.find("div[data-role='content']:visible:visible");
    var viewport_height = $(window).height();

    var content_height = viewport_height - header.outerHeight() - footer.outerHeight();
    if((content.outerHeight() - header.outerHeight() - footer.outerHeight()) <= viewport_height) {
        content_height -= (content.outerHeight() - content.height());
    } 
    return content_height;
}
