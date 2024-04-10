document.addEventListener('DOMContentLoaded', function () {

    // Function to ask for location permission
    function askForLocationPermission() {
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then(function (permissionStatus) {
                if (permissionStatus.state === 'granted') {
                    locateUser(); // If permission is already granted, proceed with locating the user
                } else if (permissionStatus.state === 'prompt') {
                    // If permission is not yet determined, prompt the user for permission
                    navigator.geolocation.getCurrentPosition(locateUser, function (error) {
                        console.error('Error getting user location:', error.message);
                        alert('Error getting your location. Please make sure you allow location access.');
                    });
                } else {
                    // Permission denied
                    alert('Location access is denied. Please enable it in your device settings.');
                }
            });
        } else {
            // For browsers not supporting navigator.permissions
            alert('Your browser does not support the Permissions API. Please make sure to allow location access.');
        }
    }

    // Call the function to ask for location permission when the document is loaded
    askForLocationPermission();

    var map = L.map('map', {
        zoomControl: false // Disable zoom control
    }).setView([12.8797, 121.7740], 6);

    // Tile Layer
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    osm.addTo(map);

    // Variables Initialization
    var myLocationMarker;
    var fixedMarker;
    var searchMarker;
    var routingControl;
    var toolsUse = document.getElementById("tools");
    var distanceElement = document.getElementById("distance");
    var timeElement = document.getElementById("time");
    var directionsList = document.getElementById("directions-list");
    var directions; // Store route instructions
    var currentStepIndex; // Current step index in directions
    var directionUpdateInterval; // Interval for automatic direction update

    function locateUser() {
        // Geolocation API
        if (navigator.geolocation) {

            // Continuously watch user's position
            navigator.geolocation.watchPosition(function (position) {
                var userLat = position.coords.latitude;
                var userLng = position.coords.longitude;
                var userLocation = L.latLng(userLat, userLng);
                if (myLocationMarker) {
                    myLocationMarker.setLatLng(userLocation); // Update marker position
                } else {
                    myLocationMarker = L.marker(userLocation, { draggable: false }).addTo(map);
                }
                myLocationMarker.bindPopup("<b>My Location</b>").openPopup();
                map.setView(userLocation, 14);
            }, function (error) {
                console.error('Error getting user location:', error.message);
                alert('Error getting your location. Please make sure you allow location access.');
            });
        } else {
            alert('Geolocation is not supported by your browser');
        }
    }

    // Function to update distance and time
    function updateDistanceAndTime() {
        console.log("Updating distance and time...");
        if (routingControl && myLocationMarker && searchMarker) {
            var route = routingControl.getRouter().getGraph().paths[0];
            var totalDistanceKm = (route.distance / 1000).toFixed(1) + ' km';
            var totalTimeMinutes = (route.time / 60).toFixed(1) + ' min';

            distanceElement.textContent = "Distance: " + totalDistanceKm;
            timeElement.textContent = "Time: " + totalTimeMinutes;
        }
    }

    // Function to start watching the user's position
    // Function to start watching the user's position
    function watchUserPosition() {
        console.log("Watching user's position...");
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(function (position) {
                var userLat = position.coords.latitude;
                var userLng = position.coords.longitude;
                var userLocation = L.latLng(userLat, userLng);

                if (myLocationMarker) {
                    map.removeLayer(myLocationMarker); // Remove previous marker
                    myLocationMarker = L.marker(userLocation, { draggable: false }).addTo(map); // Add new marker
                    updateDistanceAndTime(); // Update distance and time
                    console.log("User's position changed...");

                    // Check if myLocationMarker circle radius is not inside searchMarker radius
                    var circleRadius = myLocationMarker.getLatLng().distanceTo(searchMarker.getLatLng());
                    if (circleRadius > searchMarker.getRadius()) {
                        // Notify and send vibration
                        notifyUser("Your location is outside the search area.");
                        vibrateDevice();
                    }

                    if (searchMarker) {
                        if (!routingControl) {
                            routingControl = L.Routing.control({
                                waypoints: [
                                    userLocation, // Update user's location as a waypoint
                                    searchMarker.getLatLng()
                                ],
                                // Additional options for routing control
                            }).addTo(map);
                        } else {
                            routingControl.setWaypoints([
                                userLocation,
                                searchMarker.getLatLng()
                            ]);
                            map.fitBounds(routingControl.getPlan().getWaypointsBounds()); // Fit map to routing
                        }
                    }
                } else {
                    myLocationMarker = L.marker(userLocation, { draggable: false }).addTo(map);
                }

                myLocationMarker.bindPopup("<b>My Location</b>").openPopup();
                map.setView(userLocation, 14);
            }, { enableHighAccuracy: true, maximumAge: 0, timeout: 0 });
        } else {
            alert('Geolocation is not supported by your browser');
        }
    }

    // Function to notify the user
    function notifyUser(message) {
        // You can replace this with any notification method you prefer
        alert(message);
    }

    // Function to vibrate the device
    function vibrateDevice() {
        // Check if the browser supports vibration API
        if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]); // Vibrate for 200ms, pause for 100ms, then vibrate for 200ms
        }
    }

    // Function to start watching the user's position when the button is clicked
    function startWatchingPosition() {
        document.getElementById('btnStart').addEventListener('click', watchUserPosition);
    }

    // Search Control
    var searchControl = L.Control.geocoder({
        defaultMarkGeocode: false,
        collapsed: false,
        placeholder: 'Search...',
    }).on('markgeocode', function (e) {
        // Search Marker Handling
        if (searchMarker) {
            map.removeLayer(searchMarker);
        }
        var latlng = e.geocode.center;
        map.setView(latlng, 14);
        searchMarker = L.marker(latlng, { draggable: true }).addTo(map);
        searchMarker.on('dragend', function (e) {
            var newLatLng = e.target.getLatLng();
            searchMarker.setLatLng(newLatLng);
            checkbtnStart();
        });
        checkbtnStart();
    }).addTo(map);

    function zoomToMyLocation() {
        if (myLocationMarker) {
            map.setView(myLocationMarker.getLatLng(), 14);
        } else {
            alert('Your location has not been determined yet.');
        }
    }

    function clearRouting() {
        // Clear Routing Control
        if (routingControl) {
            map.removeControl(routingControl);
            distanceElement.textContent = '';
            timeElement.textContent = '';
            directionsList.innerHTML = '';
        }
    }

    // Event Listeners
    document.getElementById("btnLocate").addEventListener("click", zoomToMyLocation);

    document.getElementById("btnStart").addEventListener("click", function () {
        if (routingControl) {
            // Stop Button Functionality
            map.removeControl(routingControl);
            if (circle) {
                map.removeLayer(circle); // Remove the circle
                circle = null; // Reset circle variable
            }
            if (circleMyLocation) {
                map.removeLayer(circleMyLocation); // Remove the circle from myLocationMarker
                circleMyLocation = null; // Reset circleMyLocation variable
            }
            searchMarker.dragging.enable();
            if (fixedMarker) {
                map.removeLayer(fixedMarker);
                fixedMarker = null;
            }
            document.getElementById("btnStart").innerHTML = '<i class="fas fa-play"></i>';
            routingControl = null;
            distanceElement.textContent = ''; // Reset distance
            timeElement.textContent = ''; // Reset time
            directionsList.innerHTML = ''; // Reset directions
            // Clear tools
            toolsUse.style.display = "none";
        } else {
            // Start Button Functionality
            if (myLocationMarker && searchMarker) {
                clearRouting();

                routingControl = L.Routing.control({
                    waypoints: [
                        myLocationMarker.getLatLng(),
                        searchMarker.getLatLng()
                    ],
                    routeWhileDragging: false, // Disable dragging while routing
                    createMarker: function () { return null; }, // Disable creation of new markers
                    show: false, // Hide the route line initially
                    addWaypoints: false, // Prevent adding additional waypoints
                }).addTo(map);

                // Zoom to user location marker
                map.setView(myLocationMarker.getLatLng(), 14);

                // Draggable markers for route start and end points
                fixedMarker = L.layerGroup([L.marker(myLocationMarker.getLatLng(), { draggable: false }), L.marker(searchMarker.getLatLng(), { draggable: false })]).addTo(map);
                fixedMarker.eachLayer(function (layer) {
                    layer.on('dragend', function (e) {
                        var newLatLng = e.target.getLatLng();
                        searchMarker.setLatLng(newLatLng);
                    });
                });

                document.getElementById("btnStart").innerHTML = '<i class="fas fa-stop"></i>';

                // Add circle with radius extending from searchMarker to myLocationMarker
                var circleOptions = {
                    color: '#d4af37',
                    fillColor: '#d4af37',
                    fillOpacity: 0.3
                };
                var circleRadius = myLocationMarker.getLatLng().distanceTo(searchMarker.getLatLng());
                circle = L.circle(searchMarker.getLatLng(), { radius: circleRadius, ...circleOptions }).addTo(map);

                // Change the color of the circle representing myLocationMarker
                circleOptions.color = '#020035'; // New border color
                circleOptions.fillColor = '#020035'; // New fill color

                // Add circle with radius of 50 meters to myLocationMarker with new colors
                circleMyLocation = L.circle(myLocationMarker.getLatLng(), { radius: 20, ...circleOptions }).addTo(map);

                // Update distance, time, and directions
                routingControl.on('routesfound', function (e) {
                    console.log("Route found...");
                    var routes = e.routes;
                    var summary = routes[0].summary;
                    var totalDistanceKm = (summary.totalDistance / 1000).toFixed(1) + ' km';
                    var totalDistanceMeters = summary.totalDistance + ' m';
                    var totalDistanceFeet = (summary.totalDistance * 3.28084).toFixed(1) + ' ft';
                    var totalTimeMinutes = (summary.totalTime / 60).toFixed(1) + ' min';

                    distanceElement.textContent = totalDistanceKm + " | " + totalDistanceMeters + " | " + totalDistanceFeet;
                    timeElement.textContent = "Time: " + totalTimeMinutes;

                    // Outputting the distances in meters and feet
                    console.log("Distance in kilometers: " + totalDistanceKm);
                    console.log("Distance in meters: " + totalDistanceMeters);
                    console.log("Distance in feet: " + totalDistanceFeet);

                    // Store route instructions
                    directions = routes[0].instructions;
                    // Start automatic direction update
                    startAutomaticDirectionUpdate();
                    // Show tools
                    toolsUse.style.display = "block";
                });

                routingControl.on('routeselected', function (e) {
                    console.log("Route selected...");
                    var route = e.route;
                    var summary = route.summary;
                    var totalDistanceKm = (summary.totalDistance / 1000).toFixed(1) + ' km';
                    var totalDistanceMeters = summary.totalDistance + ' m';
                    var totalDistanceFeet = (summary.totalDistance * 3.28084).toFixed(1) + ' ft';
                    var totalTimeMinutes = (summary.totalTime / 60).toFixed(1) + ' min';

                    distanceElement.textContent = totalDistanceKm + " | " + totalDistanceMeters + " | " + totalDistanceFeet;
                    timeElement.textContent = "Time: " + totalTimeMinutes;

                    // Outputting the distances in meters and feet
                    console.log("Distance in kilometers: " + totalDistanceKm);
                    console.log("Distance in meters: " + totalDistanceMeters);
                    console.log("Distance in feet: " + totalDistanceFeet);

                    // Store route instructions
                    directions = route.instructions;
                    // Start automatic direction update
                    startAutomaticDirectionUpdate();
                    // Show tools
                    toolsUse.style.display = "block";
                });
                startWatchingPosition();
            }
        }
    });



    // Function to start automatic direction update
    function startAutomaticDirectionUpdate() {
        // Reset step index
        currentStepIndex = 0;
        // Update direction initially
        updateDirection();
        // Update direction when the user marker moves
        myLocationMarker.on('move', updateDirectionOnMove);
    }

    // Function to update direction when the user marker moves
    function updateDirectionOnMove() {
        console.log("User marker moved...");
        var userPosition = myLocationMarker.getLatLng();
        var currentWaypoint = directions[currentStepIndex].latLng;
        var distanceToWaypoint = userPosition.distanceTo(currentWaypoint);
        if (distanceToWaypoint > 0) { // Adjust the distance threshold as needed
            updateDirection();
        }
    }

    // Function to update direction
    function updateDirection() {
        console.log("Updating direction...");
        if (currentStepIndex < directions.length) {
            var li = document.createElement("li");
            li.textContent = directions[currentStepIndex].text;
            directionsList.innerHTML = "";
            directionsList.appendChild(li);
            currentStepIndex++;
        } else {
            clearInterval(directionUpdateInterval); // Stop automatic direction update
        }
    }

    locateUser(); // Initial location check
});
