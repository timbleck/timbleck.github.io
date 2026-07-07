// Auswahl bekannter Berliner Biergärten mit Adresse, ungefährer Lage und Kurzbeschreibung.
// Koordinaten sind Näherungswerte auf Basis der Adresse (keine exakte Vermessung).
var BIERGAERTEN = [
  {
    name: "Prater Garten",
    bezirk: "Pankow (Prenzlauer Berg)",
    adresse: "Kastanienallee 7-9, 10435 Berlin",
    lat: 52.5391, lng: 13.4079,
    beschreibung: "Ältester Biergarten Berlins (seit 1837), schattige Kastanien, Live-Musik im Sommer.",
    web: "https://www.pratergarten.de/"
  },
  {
    name: "Zenner",
    bezirk: "Treptow-Köpenick (Treptow)",
    adresse: "Alt-Treptow 14-17, 12435 Berlin",
    lat: 52.4919, lng: 13.4601,
    beschreibung: "Traditionsgaststätte direkt an der Spree im Treptower Park, Bier- und Weingarten.",
    web: "https://zenner.berlin/"
  },
  {
    name: "Café am Neuen See",
    bezirk: "Mitte (Tiergarten)",
    adresse: "Lichtensteinallee 2, 10787 Berlin",
    lat: 52.5074, lng: 13.3494,
    beschreibung: "Idyllisch am Wasser im Tiergarten gelegen, mit Ruderbootverleih.",
    web: "https://cafeamneuensee.de/"
  },
  {
    name: "Zollpackhof",
    bezirk: "Mitte (Moabit / Regierungsviertel)",
    adresse: "Elisabeth-Abegg-Straße 1, 10557 Berlin",
    lat: 52.5247, lng: 13.3653,
    beschreibung: "An der Spree im Regierungsviertel, Blick aufs Kanzleramt, über 150 Jahre alter Kastanienbaum.",
    web: "https://zollpackhof.de/"
  },
  {
    name: "CapRivi",
    bezirk: "Charlottenburg-Wilmersdorf (Charlottenburg)",
    adresse: "Am Spreebord / Ecke Sömmeringstraße, 10589 Berlin",
    lat: 52.5215, lng: 13.3086,
    beschreibung: "Charlottenburgs einziger Biergarten direkt an der Spree.",
    web: "https://caprivi.berlin/"
  },
  {
    name: "Golgatha",
    bezirk: "Friedrichshain-Kreuzberg (Kreuzberg)",
    adresse: "Dudenstraße 48-64 (Viktoriapark), 10965 Berlin",
    lat: 52.4874, lng: 13.3835,
    beschreibung: "Im Viktoriapark am Kreuzberg gelegen, tagsüber Biergarten, abends auch Open-Air-Party.",
    web: "https://golgatha-berlin.de/"
  },
  {
    name: "Schleusenkrug",
    bezirk: "Mitte (Tiergarten, am Zoo)",
    adresse: "Müller-Breslau-Straße 14b, 10623 Berlin",
    lat: 52.5091, lng: 13.3315,
    beschreibung: "Historische Institution an der Tiergarten-Schleuse, Blick auf vorbeifahrende Boote.",
    web: "https://www.schleusenkrug.de/"
  },
  {
    name: "Loretta am Wannsee",
    bezirk: "Steglitz-Zehlendorf (Wannsee)",
    adresse: "Kronprinzessinnenweg 260, 14109 Berlin",
    lat: 52.4295, lng: 13.1745,
    beschreibung: "Was der Zenner für den Osten ist, ist die Loretta für den Westen: Blick auf den Wannsee.",
    web: "https://loretta-wannsee.berlin/"
  },
  {
    name: "Luisengarten (Luise)",
    bezirk: "Steglitz-Zehlendorf (Dahlem)",
    adresse: "Königin-Luise-Straße 40-42, 14195 Berlin",
    lat: 52.4565, lng: 13.2933,
    beschreibung: "Zwischen Freier Universität und Domäne Dahlem, beliebt bei Studierenden und Familien.",
    web: "https://www.luise-dahlem.de/"
  },
  {
    name: "Alter Krug Dahlem",
    bezirk: "Steglitz-Zehlendorf (Dahlem)",
    adresse: "Königin-Luise-Straße 52, 14195 Berlin",
    lat: 52.4557, lng: 13.2921,
    beschreibung: "Historisches Gasthaus seit dem frühen 19. Jahrhundert, großer sonniger Biergarten.",
    web: "https://www.alter-krug-berlin.de/"
  },
  {
    name: "Châlet Suisse",
    bezirk: "Steglitz-Zehlendorf (Grunewald)",
    adresse: "Clayallee 99 (Im Jagen 5), 14193 Berlin",
    lat: 52.4645, lng: 13.2438,
    beschreibung: "Mitten im Grunewald gelegen, Schweizer Küche mit Grill-Biergarten.",
    web: "https://chalet-suisse.de/"
  },
  {
    name: "Wirtshaus Moorlake",
    bezirk: "Steglitz-Zehlendorf (Wannsee)",
    adresse: "Moorlakeweg 6, 14109 Berlin",
    lat: 52.4234, lng: 13.1334,
    beschreibung: "Historisches Forsthaus von 1840 an einer kleinen Havelbucht, nur zu Fuß oder per Boot erreichbar.",
    web: "https://moorlake.de/"
  },
  {
    name: "Rübezahl am Müggelsee",
    bezirk: "Treptow-Köpenick (Köpenick)",
    adresse: "Müggelheimer Damm 143, 12559 Berlin",
    lat: 52.4372, lng: 13.6299,
    beschreibung: "Am Ufer von Berlins größtem See gelegen, mitten im Naturschutzgebiet.",
    web: "https://ruebezahl-berlin.de/"
  },
  {
    name: "Fischerhütte am Schlachtensee",
    bezirk: "Steglitz-Zehlendorf (Zehlendorf)",
    adresse: "Fischerhüttenstraße 136, 14163 Berlin",
    lat: 52.4381, lng: 13.2049,
    beschreibung: "Seit über 300 Jahren am Schlachtensee, schattiger Biergarten mit Spielplatz.",
    web: "https://fischerhuette-berlin.de/"
  },
  {
    name: "Alter Fritz",
    bezirk: "Reinickendorf (Tegel)",
    adresse: "Karolinenstraße 12, 13507 Berlin",
    lat: 52.5871, lng: 13.2839,
    beschreibung: "Ältestes noch bestehendes Restaurant Berlins, Biergarten im Innenhof nahe dem Tegeler See.",
    web: "https://www.restaurant-alter-fritz.de/"
  },
  {
    name: "Villa Rixdorf",
    bezirk: "Neukölln (Alt-Rixdorf)",
    adresse: "Richardplatz 6, 12055 Berlin",
    lat: 52.4762, lng: 13.4406,
    beschreibung: "Historischer Dorfkern von Alt-Rixdorf, gemütlicher Biergarten in der Villa.",
    web: "https://www.villa-rixdorf.de/"
  },
  {
    name: "Urban Beer Garden (1 Stralau)",
    bezirk: "Friedrichshain-Kreuzberg (Friedrichshain)",
    adresse: "Alt-Stralau 1-2, 10245 Berlin",
    lat: 52.497036, lng: 13.4650959,
    beschreibung: "Direkt an der Spree auf der Stralauer Halbinsel, Beachvolleyball und Open-Air-Events.",
    web: "https://www.facebook.com/1Stralau/"
  }
];
