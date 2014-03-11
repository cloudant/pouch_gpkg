// http://www.gaia-gis.it/gaia-sins/BLOB-Geometry.html

function spatialitegeom() {};

spatialitegeom.prototype.read = function(buf){
  if (buf instanceof ArrayBuffer){
    var dv = new DataView(buf);
    if (dv.getInt16(0, false) == 0x4750) { 
      var version = dv.getInt8(2);
      var flags = dv.getInt8(3)
      if ((version == 0x00) && (flags == 0x01)) {
        var srsId = dv.getInt32(4, false);
        var littleEndian = false;
        if (dv.getInt8(8) == 0x01)
          littleEndian = true;

        var result;

        switch (dv.getUint32(9, littleEndian)) {
          case 1:  // point
            var x = dv.getFloat64(13, littleEndian);
            var y = dv.getFloat64(21, littleEndian);
            result = {"type": "Point", "coordinates": [x, y]};
            break;
          default:
            throw('only point geometries are currently supported');
            break;
        };

        return result;
      } else throw 'envelope not supported';
    } else throw 'invalid geopackage blob header';

  } else {
    throw 'spatialitegeom read requires an arraybuffer';
  }
};