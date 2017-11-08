/**
 * @class Oskari.mapframework.ui.module.common.GeometryEditor.DrawFilterPlugin
 */
Oskari.clazz.define('Oskari.mapframework.ui.module.common.geometryeditor.DrawFilterPlugin', function (config) {
    this.mapModule = null;
    this.pluginName = null;
    this._sandbox = null;
    this._map = null;
    this.drawControls = null;
    this.modifyControls = null;
    this.sourceLayer = null;
    this.targetLayer = null;
    this.markerLayer = null;
    this.markers = [];
    this.markerSize = new ol.Size(21, 25);
    this.markerOffset = new ol.Pixel(-(this.markerSize.w / 2), -this.markerSize.h);
    this.markerIcon = new ol.style.Icon({
        src: '/Oskari/bundles/framework/geometryeditor/resources/images/marker.png', 
        size: this.markerSize
    });
    this.activeMarker = null;
    this.startIndex = null;
    this.endIndex = null;
    this.editMode = false;
    this.currentDrawMode = null;
    this.prefix = 'DrawFilterPlugin.';
    this.creatorId = undefined;


    if (config && config.id) {
        // Note that the events and requests need to match the configured
        // prefix based on the id!
        this.prefix = config.id + '.';
        this.creatorId = config.id;
    }
}, {
    __name: 'DrawFilterPlugin',

    /**
     * Initializes the plugin:
     * - layer that is used for drawing
     * - drawControls
     * - registers for listening to requests
     * @param sandbox reference to Oskari sandbox
     * @method init
     */
    init: function (sandbox) {
        debugger;
        var me = this;
        me.requestHandlers = {
            startDrawFilteringHandler: Oskari.clazz.create('Oskari.mapframework.ui.module.common.GeometryEditor.DrawFilterPlugin.request.StartDrawFilteringRequestPluginHandler', sandbox, me),
            stopDrawFilteringHandler: Oskari.clazz.create('Oskari.mapframework.ui.module.common.GeometryEditor.DrawFilterPlugin.request.StopDrawFilteringRequestPluginHandler', sandbox, me)
        };

        // create new layer for the editable geometry
        me.sourceLayer = new ol.layer.Vector({
            name: me.prefix + 'sourceLayer',
            source: new ol.source.Vector()
        });
        
        // create new layer for filtering geometry
        me.targetLayer = new ol.layer.Vector({
            name: me.prefix + 'targetLayer', 
            source: new ol.source.Vector(),
            updateWhileInteracting: true
        });

        // TODO: lisää interaction kartalle
        var modifyInteraction = new ol.interaction.Modify({
            source: me.targetLayer.getSource()
        });

        me._map.addLayers([me.sourceLayer, me.targetLayer]);

        // Marker layer
        me.markerLayer = new ol.Layer.Vector({
            name: this.prefix + 'MarkerLayer',
            source: new ol.source.Vector()
        });

        me._map.addLayers([me.markerLayer]);

        me._updateLayerOrder();
    },

    /**
     * @method getName
     * Returns the name based on the plugin name
     * @returns {string} Name
     */
    getName: function () {
        return this.prefix + this.pluginName;
    },

    /**
     * @method getMapModule
     * Returns the map module
     * @returns {*} Map module
     */
    getMapModule: function () {
        return this.mapModule;
    },

    /**
     * @method setMapModule
     * Set the map module
     * @param mapModule Map module
     */
    setMapModule: function (mapModule) {
        this.mapModule = mapModule;

        if (mapModule) {
            this._map = mapModule.getMap();
            this.pluginName = mapModule.getName() + this.__name;
        } else {
            this._map = null;
            this.pluginName = null;
        }
    },

    /**
     * @method onEvent
     * @param {Oskari.mapframework.event.Event} event a Oskari event object
     * Event is handled forwarded to correct #eventHandlers if found or discarded if not.
     */
    onEvent: function (event) {
        var handler = this.eventHandlers[event.getName()];
        if (!handler) {
            return;
        }

        return handler.apply(this, [event]);
    },

    /**
     * @property {Object} eventHandlers
     * @static
     */
    eventHandlers: {
        'DrawingEvent': function (event) {
            if (event.id = "drawFilter" && event.isFinished) {
                debugger;
                var shape = event.data[shape];
                switch (shape) {
                    case 'Point':
                        return;
                        //this._pointSplit(event);
                        break;
                    case 'LineString':
                    debugger;
                        //this.finishedLineDrawing(event);
                        break;
                    case 'Polygon':
                        return;
                        //this.finishedPolygonDrawing(event);
                        break;
                }
            }
        },

        'AfterMapMoveEvent': function (event) {
            this._updateLayerOrder();
        }
    },
    /**
     * @method startDrawFiltering
     * Enables the draw filtering control for given params.drawMode.
     * Clears the layer of any previously drawn features.
     * @param params Includes mode, geometry, sourceGeometry and style
     */
    startDrawFiltering: function (params) {
        this.sourceLayer.getSource().clear({fast: true});
        //TODO: set style
        //this.sourceLayer.styleMap = this.sourceStyleMaps[params.drawMode];
        //this.sourceLayer.eventListeners = this.sourceListeners[params.drawMode];
        this.targetLayer.getSource().clear({fast: true});

        //TODO: set style
        //this.targetLayer.styleMap = this.targetStyleMaps[params.drawMode];

        this.markerLayer.getSource().clear({fast: true});
        this.markers = [];
        this.activeMarker = null;
        this._updateLayerOrder();

        //add sourceGeometry to sourceLayer for filtering
        var geometryToFilter = params.sourceGeometry;
        this.sourceLayer.getSource().addFeature(geometryToFilter);

        var drawId = "drawFilter",
            options = {allowMultipleDrawing : false};

        switch (params.drawMode) {
            case 'point':
                var type = "Point";
                break;
            case 'line':
                var type = "LineString";
                break;
            case 'edit':
                var type = "Polygon";
                break;
            case 'remove':
                // Nothing to do
                break;
            default:
        }

        var startDrawingRequest = this.__sandbox.getRequestBuilder('DrawTools.StartDrawingRequest');
        if (startDrawingRequest) {
            var request = startDrawingRequest(drawId, type, options);
            this.__sandbox.request(this, request);
    },

    /**
     * @method _pointSplit
     * Starts the functionality of line split by marker points
     * @param params Source geometry
     * @private
     */
    /*
    _pointSplit: function (event) {
        var me = this,
            i,
            x,
            y;

        this.startIndex = null;
        this.endIndex = null;
        var linePoints = line.geometry.components;

        var extent = this._map.getExtent(),
            width = extent.right - extent.left,
            height = extent.top - extent.bottom;
        var optimalExtent = new ol.Extent([
            extent.left + 0.1 * width,
            extent.bottom + 0.1 * height,
            extent.right - 0.1 * width,
            extent.top - 0.1 * height
        ]);

        // Search visible location for the first marker
        var lonlat = null,
            index = null;
        for (i = 0; i < linePoints.length; i += 1) {
            x = linePoints[i].x;
            y = linePoints[i].y;
            if (optimalExtent.contains(x, y)) {
                lonlat = new OpenLayers.LonLat(x, y);
                index = i;
                break;
            }
        }
        if (lonlat === null) {
            lonlat = new ol.Coordinate(linePoints[0].x, linePoints[0].y);
            for (i = 0; i < linePoints.length; i += 1) {
                x = linePoints[i].x;
                y = linePoints[i].y;
                if (extent.contains(x, y)) {
                    lonlat = new ol.Coordinate(x, y);
                    index = i;
                    break;
                }
            }
        }
        var marker1 = new OpenLayers.Marker(lonlat, this.markerIcon.clone());
        marker1.index = index;
        marker1.events.register('mousedown', me, me._selectActiveBaseMarker);
        marker1.markerMouseOffset = new OpenLayers.LonLat(0, 0);

        // Search visible location for the second marker
        lonlat = null;
        for (i = linePoints.length - 1; i >= 0; i -= 1) {
            x = linePoints[i].x;
            y = linePoints[i].y;
            if (optimalExtent.contains(x, y)) {
                lonlat = new OpenLayers.LonLat(x, y);
                index = i - 1;
                break;
            }
        }
        if (lonlat === null) {
            lonlat = new OpenLayers.LonLat(linePoints[0].x, linePoints[0].y);
            for (i = linePoints - 1; i >= 0; i -= 1) {
                x = linePoints[i].x;
                y = linePoints[i].y;
                if (extent.contains(x, y)) {
                    lonlat = new OpenLayers.LonLat(x, y);
                    index = i - 1;
                    break;
                }
            }
        }
        var marker2 = new OpenLayers.Marker(lonlat, this.markerIcon.clone());
        marker2.index = index;
        marker2.events.register('mousedown', me, me._selectActiveBaseMarker);
        marker2.markerMouseOffset = new OpenLayers.LonLat(0, 0);

        this.markers.push(marker1);
        this.markers.push(marker2);

        this.markerLayer.addMarker(this.markers[0]);
        this.markerLayer.addMarker(this.markers[1]);

        // Set a high enough z-index value
        this._updateLayerOrder();

        // Update output layer
        this.updateTargetLine();
    },


   
    /**
     * @method _updateLayerOrder
     * Sets correct order for the layers
     * @private
     */
    _updateLayerOrder: function () {
        var zIndex = Math.max(this._map.Z_INDEX_BASE.Feature, this.sourceLayer.getZIndex()) + 1;
        this.sourceLayer.setZIndex(zIndex);
        //this.sourceLayer.redraw();
        zIndex = zIndex + 1;
        this.targetLayer.setZIndex(zIndex);
        //this.targetLayer.redraw();
        zIndex = zIndex + 1;
        this.markerLayer.setZIndex(zIndex);
        //this.markerLayer.redraw();
        this.mapModule.orderLayersByZIndex();
    },

  
    /**
     * @method _enableGfi
     * Enables or disables GFI functionality
     * @param {Boolean} blnEnable true to enable, false to disable
     */
    _enableGfi: function (blnEnable) {
        var gfiReqBuilder = this._sandbox.getRequestBuilder('MapModulePlugin.GetFeatureInfoActivationRequest');
        if (gfiReqBuilder) {
            this._sandbox.request(this.getName(), gfiReqBuilder(blnEnable));
        }
    },

    /**
     * @method register
     * Performs bundle registering commands
     */
    register: function () {

    },

    /**
     * @method unregister
     * Performs bundle unregistering commands
     */
    unregister: function () {

    },

    /**
     * @method startPlugin
     * Performs plugin startup commands
     * @param sandbox Oskari sandbox
     */
    startPlugin: function (sandbox) {
        var me = this,
            p;
        this._sandbox = sandbox;
        sandbox.register(this);
        sandbox.addRequestHandler('DrawFilterPlugin.StartDrawFilteringRequest', this.requestHandlers.startDrawFilteringHandler);
        sandbox.addRequestHandler('DrawFilterPlugin.StopDrawFilteringRequest', this.requestHandlers.stopDrawFilteringHandler);
        for (p in me.eventHandlers) {
            if (me.eventHandlers.hasOwnProperty(p)) {
                me._sandbox.registerForEventByName(me, p);
            }
        }
        this._enableGfi(false);
    },

    /**
     * @method stopPlugin
     * Performs plugin stop commands
     * @param sandbox
     */
    stopPlugin: function (sandbox) {
        var me = this;
        this.toggleControl();

        if (this.sourceLayer) {
            this.sourceLayer.destroyFeatures();
            this._map.removeLayer(this.sourceLayer);
            this.sourceLayer = undefined;
        }

        if (this.targetLayer) {
            this.targetLayer.destroyFeatures();
            this._map.removeLayer(this.targetLayer);
            this.targetLayer = undefined;
        }

        if (this.markerLayer) {
            this.markerLayer.clearMarkers();
            this._map.removeLayer(this.markerLayer);
            this.markerLayer = undefined;
        }

        for (var p in me.eventHandlers) {
            if (me.eventHandlers.hasOwnProperty(p)) {
                me._sandbox.unregisterFromEventByName(me, p);
            }
        }

        sandbox.removeRequestHandler('DrawFilterPlugin.StartDrawFilteringRequest', this.requestHandlers.startDrawFilteringHandler);
        sandbox.removeRequestHandler('DrawFilterPlugin.StopDrawFilteringRequest', this.requestHandlers.stopDrawFilteringHandler);

        this._enableGfi(true);
        sandbox.unregister(this);

        this._sandbox = null;
    },

    /* @method start
     * Called from sandbox
     */
    start: function (sandbox) {},

    /**
     * @method stop
     * Called from sandbox
     */
    stop: function (sandbox) {},
    /**
     * @property {Object} eventHandlers
     * @static
     */
}, {
    'protocol': ['Oskari.mapframework.module.Module', 'Oskari.mapframework.ui.module.common.GeometryEditor.Plugin']
});
