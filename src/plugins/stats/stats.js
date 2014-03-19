// Copyright 2014 Globo.com Player authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var BaseObject = require('../../base/base_object');
var StatsEvents = require('./stats_events');
var $ = require("jquery");

var StatsPlugin = BaseObject.extend({
  type: 'stats',
  initialize: function(options) {
    this.container = options.container; //FIXME
    this.container.with(StatsEvents);
    this.listenTo(this.container, 'container:play', this.onPlay);
    this.listenTo(this.container, 'container:stop', this.onStop);
    this.listenTo(this.container, 'container:state:buffering', this.onBuffering);
    this.listenTo(this.container, 'container:state:bufferfull', this.onBufferFull);
    this.listenTo(this.container, 'container:stats:add', this.onStatsAdd);
    this.setInitialAttrs();
    this.reportInterval = options.reportInterval || 60000;
  },
  setInitialAttrs: function() {
    this.firstPlay = true;
    this.startupTime = 0;
    this.rebufferingTime = 0;
    this.watchingTime = 0;
    this.rebuffers = 0;
    this.externalMetrics = {};
  },
  onPlay: function() {
    this.watchingTimeInit = Date.now();
    this.intervalId = setInterval(this.report.bind(this), this.reportInterval);
  },
  onStop: function() {
    clearInterval(this.intervalId);
  },
  onBuffering: function() {
    if (this.firstPlay) {
      this.startupTimeInit = Date.now();
    } else {
      this.rebufferingTimeInit = Date.now();
    }
    this.rebuffers++;
  },
  onBufferFull: function() {
    if (this.firstPlay) {
      this.firstPlay = false;
      this.startupTime = Date.now() - this.startupTimeInit;
    } else {
      this.rebufferingTime += this.getRebufferingTime();
    }
    this.rebufferingTimeInit = undefined;
  },
  getRebufferingTime: function() {
    return Date.now() - this.rebufferingTimeInit;
  },
  getWatchingTime: function() {
    var totalTime = (Date.now() - this.watchingTimeInit);
    return totalTime - this.rebufferingTime - this.startupTime;
  },
  isRebuffering: function() {
    return !!this.rebufferingTimeInit;
  },
  onStatsAdd: function(metric) {
    $.extend(this.externalMetrics, metric);
  },
  getStats: function() {
    var metrics = {
      startupTime:     this.startupTime,
      rebuffers:       this.rebuffers,
      rebufferingTime: this.isRebuffering()? this.rebufferingTime + this.getRebufferingTime(): this.rebufferingTime,
      watchingTime:    this.isRebuffering()? this.getWatchingTime() - this.getRebufferingTime(): this.getWatchingTime()
    };
    $.extend(metrics, this.externalMetrics);
    return metrics;
  },
  report: function() {
    this.container.statsReport(this.getStats());
  }
});

module.exports = StatsPlugin;