'use strict'
var utils = {}
// var utils = require('lazy-cache')(require)
// var fn = require
// require = utils // eslint-disable-line no-undef, no-native-reassign, no-global-assign

/**
 * Lazily required module dependencies
 */

utils.extend = require('extend-shallow')
utils.Promise = require('native-promise')
// require = fn // eslint-disable-line no-undef, no-native-reassign, no-global-assign

utils.defaults = function defaults (mapper, opts) {
  var options = mapper && typeof mapper === 'object'
    ? mapper
    : (opts && typeof opts === 'object' ? opts : {})
  options = utils.extend({
    Promise: utils.Promise,
    settle: true,
    flat: true,
    serial: false,
    concurrency: false,
    start: function startHook () {},
    beforeEach: function beforeEachHook () {},
    afterEach: function afterEachHook () {},
    finish: function finishHook () {},
    mapper: mapper
  }, options)
  options.mapper = options.mapper || mapper
  return options
}

utils.iterator = function iterator (arr, results) {
  return function (options, resolve, reject) {
    return function next (index) {
      if (index >= arr.length) {
        return
      }

      var item = arr[index]
      options.beforeEach({ value: item, index: index }, index, arr)

      var val = typeof item === 'function' ? item() : item
      var promise = val instanceof Error
        ? options.Promise.reject(val)
        : options.Promise.resolve(val)

      var handle = utils.handleResults({
        arr: arr,
        index: index,
        results: results
      }, options)

      promise
        .then(handle('value'), handle('reason'))
        .then(function onresolved () {
          if (arr.doneCount++ === arr.length - 1) {
            options.finish(null, results)
            resolve(results)
            return
          }
          next(index + options.concurrency)
        }, function onrejected (err) {
          if (options.settle === false) {
            options.finish(err, results)
            reject(err)
            return
          }
        })
    }
  }
}

utils.handleResults = function handleResults (config, options) {
  return function (name) {
    return function handler (val) {
      var ret = {}

      ret[name] = val
      ret.index = config.index

      options.afterEach(ret, ret.index, config.arr)
      if (typeof options.mapper === 'function') {
        config.results.push(options.mapper(ret, ret.index, config.arr))
        return
      }

      config.results.push(options.flat ? ret[name] : ret)
      if (options.settle === false && ret.reason) {
        throw val
      }
    }
  }
}

/**
 * Expose `utils` modules
 */

module.exports = exports['default'] = utils
