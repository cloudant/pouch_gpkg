// geopackage_simulator.js
importScripts('../lib/pouchdb-nightly.js');
importScripts('../lib/sql.js');
importScripts('spatialitegeom.js');

var db;
var remoteDb;
var continuous = true;
var direction = 'from';

onmessage = function (event) {
  var data = event.data;
  switch (data.cmd) {
    case 'init':
      remoteDb = data.value.remoteDb;
      break;
    case 'gpkg':
      loadGpkg(data.value);
      break;
    default:
      self.postMessage({"cmd" : "error", "value" : "Unknown command: " + data.msg});
  }
};

loadGpkg = function(file){
  // read file to an array of integers
  var reader = new FileReader();
  reader.onloadend = function () {
    var gpkg = SQL.open(reader.result);
    var tables = gpkg.exec('SELECT * from gpkg_contents');
    // for now only allow one (feature) table per gpkg
    if (tables.length > 1)
      self.postMessage({"cmd" : "error", "value" : "Only one feature table supported"});
    else {
      var tbl = tables[0];
      var minx = 0.0, miny = 0.0, maxx = 0.0, maxy = 0.0; 
      dbName = PouchDB.utils.uuid();
      // pouchdb per table
      for (var i = 0; i < tbl.length; i++) {
        var obj = tbl[i];
        switch (obj.column) {
          case 'identifier':
            dbName = obj.value;
            break;
          case 'min_x':
            minx = obj.value;
            break;
          case 'min_y':
            miny = obj.value;
            break;
          case 'max_x':
            maxx = obj.value;
            break;
          case 'max_y':
            maxy = obj.value;
            break;
        }
      }

      // destroy any existing db of this name, it is a new import
      PouchDB.destroy(dbName);
      db = new PouchDB(dbName);

      self.postMessage({"cmd" : "centre",
        "value" : [minx + (maxx - minx)/2, 
                   miny + (maxy - miny)/2]
      });

      // store every feature in pouchdb
      // assume geometry is in column 'geom'
      var vals = gpkg.exec('SELECT * from ' + dbName);
      var geoms = gpkg.exec('SELECT hex("geom") from ' + dbName);
      geoms.forEach(function (geom) {
        var val =  geom[0].value;
        var wkt = spatialitegeom(parseHexString(val));
        var id = PouchDB.utils.uuid();
        var rev;
        var props = {};
        var v = vals[i];
        
        for (var j = 0; j < v.length; j++) {
          var p = v[j];
          if (p.column === 'geom')
            continue;
          else if (p.column === 'id')
            id = p.value;
          else if (p.column === 'rev')
            rev = p.value;
          else
            props[p.column] = p.value;
        }

        var geoDoc = {
            "_id" : id,
            "type" : "Feature",
            "geometry" : wkt,
            "properties" : props
          };

        if (rev)
          doc._rev = rev;
          
        db.put(geoDoc).then(
          function(resp) {
            load(resp.id);
          });
      });

      gpkg.close();
    }
  };
  reader.readAsBinaryString(file);
};

load = function(id) {
  db.get(id).then(function(doc) {
    self.postMessage({
      "cmd" : "data",
      "value" : doc
    });
  });
};

parseHexString = function(str) { 
  var i = 0;
  var buf = new ArrayBuffer(str.length);
  var bytes = new Uint8Array(buf);
  while (str.length >= 2) { 
    bytes[i++] = parseInt(str.substring(0, 2), 16);
    str = str.substring(2, str.length);
  }
  return buf;
}

