var map = L.map('map').setView([52.518611, 13.408333], 11);

var visited = {
  Wilhelmsruh: "Schaukelpferd (Deutsch, Mediteran), 6.7.23",
  Buckow: "Split (Kroatisch), 25.05.23",
  Britz: "Britzer Mühle (Deutsch), 29.06.23",
  Friedrichshain: "Glory Duck (Vietnamesisch), 20.4.23",
  Rahnsdorf: "Fisch-Borke (Deutsch), 11.5.23",
  Baumschulenweg: "Wawel (Polnisch) und dann ins Trauma (Bier Bar), 27.4.23",
  Johannisthal: "Lenders (Deutsch), 20.7.23",
  Friedenau: "Doppelt Käse (Burger) und dann zu Fränky‘s (Bier Bar), 3.8.23",
  Mariendorf: "Hazienda (Steak), 8.6.23",
  Frohnau: "Rabennest (Deutsch), 14.06.23",
  Biesdorf: "Herkules (Griechisch), 13.7.23, ",
  Wannsee: "k.bap (Döner), 27.7.23",
}

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap, Geoportal Berlin / Ortsteile von Berlin'
}).addTo(map);

async function addGeoJson() {
  const response = await fetch("assets/lor_ortsteile.geojson");
  const data = await response.json();
  L.geoJson(data, {
    style: function(feature) {
      console.log(feature.properties.OTEIL)
      if(visited[feature.properties.OTEIL]) {
        return {color: "#50C878", opacity: 1, fillColor: "#50C878", fillOpacity: 0.4, weight: 2};
      } else {
        return {color: "grey", opacity: 1, fillColor: "grey", fillOpacity: 0.2, weight: 2};
      }
    },
    onEachFeature: function(feature, layer) {
      var content = "<strong>" + feature.properties.OTEIL + " / " + feature.properties.BEZIRK + "</strong>"
      content += "<br />" + visited[feature.properties.OTEIL]

      layer.bindPopup(content);
    }
  }).addTo(map);
}

addGeoJson();
