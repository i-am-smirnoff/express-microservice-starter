'use strict';

/*
 * Dependencies
 */
var EventEmitter = require('events').EventEmitter;
var util         = require('util');
var ip           = require('ip');
var zoologist    = require('zoologist');
var log          = require('./logger');

// Zoologist Setup
var Zoologist               = zoologist.Zoologist;
var ServiceDiscoveryBuilder = zoologist.ServiceDiscoveryBuilder;
var ServiceInstanceBuilder  = zoologist.ServiceInstanceBuilder;

// Inherit from EventEmitter
util.inherits(ZoologistConfig, EventEmitter);

var connectionWatchDogInterval;

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

  this.setMaxListeners(1);

  var self = this;

  this.on('connected', function(options) {
    log.info('zookeeper connected');
    clearInterval(connectionWatchDogInterval);

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

  // this.on('connected', function(options) {
  //   log.info('zookeeper connected');
  //   clearInterval(connectionWatchDogInterval);
  // });

  this.on('disconnected', function(options) {
    log.warn('zookeeper disconnected');
    clearInterval(connectionWatchDogInterval);
    connectionWatchDogInterval = setInterval(function() {
      console.log('down...');
      //self.initialise(options);
      this.client = Zoologist.newClient(options.zookeeper.connectionString, options.zookeeper.retry.count);
      this.client.start();
    }, 1000);
  });
};

/**
 * Initialise ZoologistConfig
 *
 * @public
 * @method init
 */
ZoologistConfig.prototype.initialise = function(options) {
  console.log('init');

  // Init Zoologist Framework Client
  this.client = Zoologist.newClient(options.zookeeper.connectionString, options.zookeeper.retry.count);
  this.client.start();

  this.serviceDependencies = options.serviceDependencies;
  this.initialised = true;

  this.client.removeAllListeners('connected');
  this.client.removeAllListeners('disconnected');

  var self = this;

  this.client.on('connected', function() {
    console.log('connected');
    self.emit('connected', options);
  });

  this.client.on('disconnected', function() {
    console.log('disconnected');
    self.emit('disconnected', options);
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
