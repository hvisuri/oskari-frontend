import olLayerTile from 'ol/layer/Tile';
import olSourceWMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import olFormatWMTSCapabilities from 'ol/format/WMTSCapabilities';

/**
 *
 * A service to act as a WMTS Layer Source
 *
 * Requires services from MapLayerService (addLayer,removeLayer) (Will create
 * own domain objects, though)
 *
 */

Oskari.clazz.define('Oskari.mapframework.wmts.service.WMTSLayerService', function (mapLayerService, sandbox) {
    this.mapLayerService = mapLayerService;
    this.sandbox = sandbox;
    this.capabilities = {};
    this.requestsMap = {};
}, {
    /**
     * TEmp
     */
    setCapabilities: function (name, caps) {
        this.capabilities[name] = caps;
    },

    /**
     * Temp
     */
    getCapabilities: function (name) {
        return this.capabilities[name];
    },

    /**
     * @public @method getCapabilitiesForLayer
     * Sends layerId to backend for getting WMTS capabilies for layer.
     *
     * @param {Object} parameters for the get
     * @param {Function} success the success callback
     * @param {Function} failure the failure callback
     *
     */
    getCapabilitiesForLayer: function (layer, success, failure) {
        var me = this;
        var url = layer.getLayerUrl();
        var format = new olFormatWMTSCapabilities();
        var getCapsUrl = Oskari.urls.getRoute('GetLayerCapabilities');

        var caps = this.getCapabilities(url);
        if (caps) {
            // return with cached capabilities
            success(this.__createWMTSLayer(caps, layer));
            return;
        }
        // gather capabilities requests
        // make ajax call just once and invoke all callbacks once finished
        var triggerAjaxBln = false;
        if (!this.requestsMap[url]) {
            this.requestsMap[url] = [];
            triggerAjaxBln = true;
        }
        this.requestsMap[url].push(arguments);

        if (triggerAjaxBln) {
            jQuery.ajax({
                data: {
                    id: layer.getId()
                },
                dataType: 'text',
                type: 'GET',
                url: getCapsUrl,
                success: function (response) {
                    var caps = format.read(response);
                    // Check if need reverse matrixset top left coordinates.
                    // Readed by layer attributes reverseMatrixIdsCoordinates property to matrixId specific transforms.
                    // For example layer can be following attribute: { reverseMatrixIdsCoordinates: {'ETRS-TM35FIN':true}}
                    var isTileMatrixSets = !!((caps && caps.Contents && caps.Contents.TileMatrixSet));
                    if (isTileMatrixSets) {
                        var matrixSets = caps.Contents.TileMatrixSet;
                        for (var index = 0; index < matrixSets.length; index++) {
                            var key = matrixSets[index].Identifier;
                            var isReverseAttribute = !!((typeof layer.getAttributes === 'function' && layer.getAttributes()['reverseMatrixIdsCoordinates'] && layer.getAttributes()['reverseMatrixIdsCoordinates'][key]));

                            if (isReverseAttribute) {
                                var matrixSet = matrixSets[index];
                                for (var i = 0; i < matrixSet.TileMatrix.length; i++) {
                                    var matrix = matrixSet.TileMatrix[i];
                                    matrix.TopLeftCorner.reverse();
                                }
                            }
                        }
                    }

                    me.setCapabilities(url, caps);
                    me.__handleCallbacksForLayerUrl(url);
                },
                error: function () {
                    me.__handleCallbacksForLayerUrl(url, true);
                }
            });
        }
    },
    /**
     * Invokes capabilities request callbacks once we have the data fetched.
     * @private
     * @param  {String}  url           layerUrl
     * @param  {Boolean} invokeFailure true to call the error callback (optional)
     */
    __handleCallbacksForLayerUrl: function (url, invokeFailure) {
        var me = this;
        var caps = this.getCapabilities(url);
        _.each(this.requestsMap[url], function (args) {
            if (!invokeFailure) {
                var layer = args[0];
                args[1](me.__createWMTSLayer(caps, layer));
            } else if (args.length > 2 && typeof args[2] === 'function') {
                args[2]();
            }
        });
    },
    __createWMTSLayer: function (caps, layer) {
        var config = this.__getLayerConfig(caps, layer);
        var options = optionsFromCapabilities(caps, config);
        // this doesn't get merged automatically by ol
        options.crossOrigin = config.crossOrigin;
        if (config.url) {
            // override capabilities url with the configured one
            options.urls = [config.url];
        }
        var wmtsLayer = new olLayerTile({
            source: new olSourceWMTS(options),
            opacity: layer.getOpacity() / 100.0,
            transparent: true,
            visible: layer.isInScale(this.sandbox.getMap().getScale()) && layer.isVisible()
        });
        return wmtsLayer;
    },

    __getLayerConfig: function (caps, layer) {
        // default params and options
        // URL is tuned serverside so we use the correct one
        var config = {
            url: layer.getTileUrl(),
            name: 'layer_' + layer.getId(),
            style: layer.getCurrentStyle().getName(),
            layer: layer.getLayerName(),
            matrixSet: layer.getWmtsMatrixSetId(),
            params: {},
            buffer: 0,
            displayInLayerSwitcher: false,
            isBaseLayer: false,
            crossOrigin: layer.getAttributes('crossOrigin')
        };

        // override default params and options from layer
        _.each(layer.getOptions(), function (value, key) {
            config[key] = value;
        });

        _.each(layer.getParams(), function (value, key) {
            config.params[key] = value;
        });

        return config;
    }
});
