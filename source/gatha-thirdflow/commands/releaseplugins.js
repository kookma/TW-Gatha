/*\
created: 20180212171824929
type: application/javascript
title: $:/plugins/kookma/gatha-thirdflow/commands/releaseplugins.js
tags:
modified: 20180212172043868
module-type: command
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";


/* Exports our --releaseplugins command, which packages all plugins marked for
 * release in this wiki, and then writes them to the local filesystem.
 */
exports.info = {
  name: "releaseplugins",
  synchronous: true
};


/* Filter all plugin drafts and set default template */
var RELEASE_CONFIG_FILTER = "[has[plugin-draft]]";
var DEFAULT_TID_TEMPLATE = "$:/plugins/kookma/gatha-thirdflow/templates/tid-tiddler";


/* Creates a new command instance. */
var Command = function(params, commander) {
  this.params = params;
  this.commander = commander;
  this.logger = new $tw.utils.Logger("--" + exports.info.name);
  this.warn = new $tw.utils.Logger("--" + exports.info.name, {colour: "brown/orange"});
  this.ok = new $tw.utils.Logger("--" + exports.info.name, {colour: "green"});
};


/* Executes our command. */
Command.prototype.execute = function() {
  var self = this;
  /* check your command parameters, which you will find in this.params */
  if (self.params.length) {
    self.warn.log("ignoring command parameter(s)");
  }

  var thirdflow = require("$:/plugins/kookma/gatha-thirdflow/libs/thirdflow.js");
  var path = require("path");

  /* Retrieve the plugin draft tiddlers, then iterate over them and package and render those plugins for which release is enabled.
   * Plugin-draft config tiddler fields:
   *   release: must be "yes" to trigger release, otherwise the release config data gets ignored.
   *   template: optional title of a tempplate tiddler to be used for rendering the plugin output file.
   */
  var releaseConfigs = $tw.wiki.filterTiddlers(RELEASE_CONFIG_FILTER);
  self.logger.log("release config tiddlers found:", releaseConfigs.length);
  $tw.utils.each(releaseConfigs, function(pluginTitle) {
    var config = $tw.wiki.getTiddler(pluginTitle);
    if (config) {    
      /* Create a temporary config tiddler to store plugin release data. It will be remove after demo is created. Mohammad 2024.08.20 */
      var pluginTempConfig = new $tw.Tiddler({
          "title": "$:/config/gatha/release/" + pluginTitle,
          "plugin-draft": config.fields["plugin-draft"] ,
          "release": config.fields["release"] || "" ,
          "template": config.fields["template"] || "",
          "extra-tiddlers": config.fields["extra-tiddlers"] || ""
        });
      $tw.wiki.addTiddler(pluginTempConfig);
      /* End of changes - Mohammad */
      
      var release = config.fields["release"] || "";
      /* Etract the releseName from plugin tite: $:/plugins/publishername/pluginame */
      var titleParts = pluginTitle.split("/");
      var releaseName = titleParts[titleParts.length - 1] + ".tid"; // Get the last element of the array
      var template = config.fields["template"] || DEFAULT_TID_TEMPLATE;
      /* BY MOHAMMAD: extra-tiddlers were added. 2024.08.17 ------------------------ */
      var pluginContentsFilter = [
        "[prefix[" + pluginTitle + "/]]",
        "[subfilter{" + pluginTitle + "!!extra-tiddlers}]" || ""
      ].join(" ");

      if (!releaseName || release !== "yes") {
        self.warn.log("skipping (disabled):", pluginTitle);
      } else {
        /* (1) pack the plugin tiddler */
        self.ok.log("packaging", pluginTitle, " (template: " + $tw.wiki.getTiddler(template).fields["caption"] + ")" );
        self.logger.log("  with:", pluginContentsFilter);
        var err = thirdflow.packagePlugin($tw.wiki, pluginTitle, pluginContentsFilter);
        if (!err) {
          /* (1.1) nice log... */
          self.logger.log("  total:",
            Object.keys(JSON.parse($tw.wiki.getTiddler(pluginTitle).fields.text).tiddlers).length,
            "tiddlers");
          /* (2) write the plugin tiddler */
          var filename = path.resolve(self.commander.outputPath, releaseName);
          self.logger.log("writing to:", filename);
          err = thirdflow.renderTiddlerWithTemplate(
            self.commander.wiki, pluginTitle, template, filename
          );
          if (err) {
            self.logger.alert("writing failed:", err);
            return err;
          }
        } else {
          self.logger.alert("packaging failed:", err);
          return err;
        }
      }
    }
  });

  return null; /* no error. */
};


exports.Command = Command;

})();

