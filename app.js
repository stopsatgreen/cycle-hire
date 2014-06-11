document.addEventListener('DOMContentLoaded', function () {
'use strict';

// Variables required to have global scope
  var map = L.map('map').setView([51.522768, -0.078424], 16),
      markerGroup = new L.layerGroup(),
      marker, stations,
      url = 'livecyclehireupdates.xml';
  // http://www.corsproxy.com/www.tfl.gov.uk/tfl/syndication/feeds/cycle-hire/

// Tile & map options
  L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 18,
    minZoom: 14
  }).addTo(map);

// Create elements for popup
  function makePopup (name,docks,bikes) {
    var bayMeter = document.createElement('meter'),
        bayName = document.createElement('h2'),
        bayDiv = document.createElement('div');
  // Low/high values for meter element
    var meterLow = Math.round(docks / 5),
        meterHigh = (docks - meterLow);
    var meterAttrs = [{
      'low' : meterLow,
      'high' : meterHigh,
      'max' : docks,
      'value' : bikes
    }];
    meterAttrs.forEach( function (thisMeterAttrs) {
      for (var attr in thisMeterAttrs) {
        bayMeter.setAttribute(attr,thisMeterAttrs[attr]);
      }
    });
    bayName.textContent = name;
    bayDiv.appendChild(bayName);
    bayDiv.appendChild(bayMeter);
    return bayDiv;
  }

  function processData () {
    var stationData = sessionStorage.getItem('stations');
    if (stationData) {
      var timeStamp = parseInt(sessionStorage.getItem('timestamp')),
        timeDiff = (Date.now() - timeStamp) / 1000;
    // Only get new data every ten minutes
      if (timeDiff <= 600) {
        var parser = new DOMParser(),
            XMLdoc = parser.parseFromString(stationData,'application/xml');
        stations = XMLdoc.documentElement.querySelectorAll('station');
        drawMarkers(stations);
      } else {
        getBack();
      }
    }
  }

  function drawMarkers (stations) {
    var	stationCount = stations.length,
      thisLat, thisLon, isInBounds,
      i, thisStation, bayDiv;

    for ( i = 0; i < stationCount; i++ ) {
      thisStation = stations[i];
      thisLat = parseFloat(thisStation.querySelector('lat').textContent);
      thisLon = parseFloat(thisStation.querySelector('long').textContent);
    // Check which stations are within the current map view
      isInBounds = map.getBounds().contains([thisLat,thisLon]);
      if ( isInBounds ) {
      // Create marker popup content
        bayDiv = makePopup(thisStation.querySelector('name').textContent, thisStation.querySelector('nbDocks').textContent, thisStation.querySelector('nbBikes').textContent);
      // Add marker to map
        marker = L.marker([thisLat,thisLon]);
        marker.bindPopup(bayDiv);
        markerGroup.addLayer(marker);
      }
    }
    map.addLayer(markerGroup);
  }

  function redrawMarkers () {
    map.removeLayer(markerGroup);
    markerGroup.clearLayers();
    processData();
  }

  function get () {
  // XHR using Promises
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET',url,false);
      xhr.addEventListener('load', function () {
        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(xhr.statusText));
        }
      });
      xhr.send();
    });
  }

  (function getBack () {
    get().then(function(response) {
  // Initial request to get data, put in localstorage
      var timeStamp = Date.now();
      sessionStorage.setItem('stations',response);
      sessionStorage.setItem('timestamp',timeStamp);
      processData();
    }, function(error) {
      console.error('Failed!', error);
    });
  })();

  map.addEventListener('dragend', redrawMarkers);
  map.addEventListener('zoomend', redrawMarkers);

});
