var map = L.map('map').setView([52.5145, 13.3800], 11);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap-Mitwirkende',
  maxZoom: 19
}).addTo(map);

var listEl = document.getElementById('list');
var searchEl = document.getElementById('search');
var markersByIndex = [];
var itemsByIndex = [];

BIERGAERTEN.forEach(function (bg, index) {
  var marker = L.marker([bg.lat, bg.lng]).addTo(map);
  marker.bindPopup(
    '<h3>' + bg.name + '</h3>' +
    '<div class="bezirk">' + bg.bezirk + '</div>' +
    '<div>' + bg.adresse + '</div>' +
    '<p>' + bg.beschreibung + '</p>' +
    (bg.web ? '<a href="' + bg.web + '" target="_blank" rel="noopener">Webseite</a>' : '')
  );
  markersByIndex.push(marker);

  var li = document.createElement('li');
  li.innerHTML =
    '<h3>' + bg.name + '</h3>' +
    '<div class="bezirk">' + bg.bezirk + '</div>' +
    '<div class="adresse">' + bg.adresse + '</div>';
  li.addEventListener('click', function () {
    map.setView([bg.lat, bg.lng], 15);
    marker.openPopup();
  });
  listEl.appendChild(li);
  itemsByIndex.push(li);

  marker.on('click', function () {
    setActive(index);
  });
});

function setActive(activeIndex) {
  itemsByIndex.forEach(function (li, index) {
    li.classList.toggle('active', index === activeIndex);
  });
}

searchEl.addEventListener('input', function () {
  var query = searchEl.value.trim().toLowerCase();
  BIERGAERTEN.forEach(function (bg, index) {
    var haystack = (bg.name + ' ' + bg.bezirk + ' ' + bg.adresse).toLowerCase();
    var matches = haystack.indexOf(query) !== -1;
    var marker = markersByIndex[index];
    itemsByIndex[index].classList.toggle('hidden', !matches);
    if (matches && !map.hasLayer(marker)) {
      marker.addTo(map);
    } else if (!matches && map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
  });
});
