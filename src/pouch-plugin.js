// inspired by https://github.com/calvinmetcalf/leaflet.pouch/blob/master/src/leaflet.pouch.coffee
L.GeoJSON.Pouch = L.GeoJSON.extend({
  initialize: function (options) {
    var lyr = this;
    L.Util.setOptions(this, options);
    this._layers = {};
    this.worker = new Worker('src/pouch_worker.js'); 
    this.worker.onmessage = function(event) {
      lyr.update(event.data);
    }; 

    this.cb = options.cb;

    this.worker.postMessage({
       "cmd" : "init",
       "value" : {
          "remoteDb" : options.remoteDb,
        }
    });
  },
  update: function(msg) {
    switch (msg.cmd){
      case 'data' : 
        L.GeoJSON.prototype.addData.call(this, msg.value);
        break;
      case 'centre':
        if (this.cb)
          this.cb(msg);
        break;
      case 'error':
        console.log(msg);
        alert(msg.value);
        break;
      default:
        break;
    }
  },
  load: function(file, type){
    switch (type){
      case 'gpkg':
        this.worker.postMessage({
          "cmd" : "gpkg",
          "value" : file
        });
        break;
      default:
        break;
    }
  },
  destroy: function() {
    if (this.worker)
      this.worker.terminate();
  }
});

L.geoJson.Pouch = function (options) {
  return new L.GeoJSON.Pouch(options);
};
