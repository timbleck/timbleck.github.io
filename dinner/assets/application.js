var map = L.map('map').setView([52.518611, 13.408333], 11);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap, Geoportal Berlin / Ortsteile von Berlin'
}).addTo(map);

async function addDataToMap() {
  var response = await fetch("https://docs.google.com/spreadsheets/d/1mKN0eJRH8sQ580AUXJsBmTo9hhm0p_lMQ6s29Hz7Djo/gviz/tq?tqx=out:csv&sheet=Sheet1");
  var csv = await response.text();
  var visited = new Map(csv.split('\n').map(row => {
    values = row.split(',').map(value => value.replace('"', '').replace('\"', '')) 
    return [values[1], values]
  }));

  var response = await fetch("assets/lor_ortsteile.geojson");
  var data = await response.json();

  L.geoJson(data, {
    style: function(feature) {
      if(visited.get(feature.properties.OTEIL)) {
        return {color: "#50C878", opacity: 1, fillColor: "#50C878", fillOpacity: 0.4, weight: 2};
      } else {
        return {color: "grey", opacity: 1, fillColor: "grey", fillOpacity: 0.2, weight: 2};
      }
    },
    onEachFeature: function(feature, layer) {
      var content = "<strong>" + feature.properties.OTEIL + " / " + feature.properties.BEZIRK + "</strong>"
      var location = visited.get(feature.properties.OTEIL)
      if(location) {
        content += "<br />" + location[4] + ", " + location[4] + " - " + location[6]
        content += "<br />" + location[5]
      }

      layer.bindPopup(content);
    }
  }).addTo(map);
}

addDataToMap();
