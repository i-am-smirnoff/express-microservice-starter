'use strict';

/*
 * Dependencies
 */
var EventEmitter = require('events').EventEmitter;
var util         = require('util');
var ip           = require('ip');
var zoologist    = require('zoologist');
var log          = require('./logger');

// Inherit from EventEmitter
util.inherits(ZoologistConfig, EventEmitter);

/**
 * Create an instance of ZoologistConfig.
 *
 * @public
 * @constructor
 */
function ZoologistConfig() {
  this.initialised = false;
  this.client = null;
  this.serviceInstance = null;
  this.serviceDiscovery = null;
  this.serviceDependencies = null;
};

/**
 * Initialise ZoologistConfig
 *
 * @public
 * @method init
 */
ZoologistConfig.prototype.initialise = function(options) {
  // Zoologist Setup
  var Zoologist               = zoologist.Zoologist;
  var ServiceDiscoveryBuilder = zoologist.ServiceDiscoveryBuilder;
  var ServiceInstanceBuilder  = zoologist.ServiceInstanceBuilder;

  // Init Zoologist Framework Client
  this.client = Zoologist.newClient(options.zookeeper.connectionString, options.zookeeper.retry.count);
  this.client.start();

  this.serviceDependencies = options.serviceDependencies;

  this.initialised = true;

  var self = this;

  this.client.on('connected', function() {
    log.info('zookeeper connected');

    if (self.isRegisteredService()) {
      var svcId = self.serviceDiscovery.getData().id;

      self.serviceDiscovery.unRegisterService(svcId, function(err) {
        if (options.debug) {
          log.info({ id: svcId }, 'unregistered expired service');
        }
      });
    }

    // Init Service Instance
    self.serviceInstance =
      ServiceInstanceBuilder
        .builder()
        .address(ip.address())
        .port(process.env.PORT || options.server.port)
        .name(options.serviceName)
        .build();

    // Init Service Discovery
    self.serviceDiscovery =
      ServiceDiscoveryBuilder
        .builder()
        .client(self.client)
        .thisInstance(self.serviceInstance)
        .basePath(options.serviceBasePath)
        .build();

    self.emit('ready');
  });

  this.client.on('disconnected', function() {
    log.warn('zookeeper disconnected');
  });
}

/**
 * Close the Zoologist framework.
 *
 * @public
 * @method close
 */
ZoologistConfig.prototype.close = function() {
  this.client, this.serviceInstance, this.serviceDiscovery = null;
};

/**
 * Close the Zoologist framework.
 *
 * @public
 * @method getClient
 */
ZoologistConfig.prototype.getClient = function() {
  return this.client;
};

/**
 * Return the Service Instance framework.
 *
 * @public
 * @method getServiceInstance
 */
ZoologistConfig.prototype.getServiceInstance = function() {
  return this.serviceInstance;
};

/**
 * Return the Service Discovery framework.
 *
 * @public
 * @method getServiceDiscovery
 */
ZoologistConfig.prototype.getServiceDiscovery = function() {
  return this.serviceDiscovery;
};

/**
 * Determine if the framework has been initialised.
 *
 * @public
 * @method isInitialised
 */
ZoologistConfig.prototype.isInitialised = function() {
  return this.initialised;
};

/**
 * Determine if a service has been registered.
 *
 * @public
 * @method isRegisteredService
 */
ZoologistConfig.prototype.isRegisteredService = function() {
  return (this.getServiceDiscovery() && this.getServiceDiscovery().getData()) ? true : false;
};

/**
 * Return a list of service dependencies.
 *
 * @public
 * @method getServiceDependencies
 */
ZoologistConfig.prototype.getServiceDependencies = function() {
  return this.serviceDependencies;
};

var zoologistConfig = module.exports = exports = new ZoologistConfig;
