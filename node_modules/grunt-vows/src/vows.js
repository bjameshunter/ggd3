/*
 * grunt-vows
 * https://github.com/CMTegner/grunt-vows
 *
 * Copyright (c) 2012 Christian Maughan Tegnér
 * Licensed under the MIT license.
 */
"use strict";

var fs = require("fs"),
    reporters = ["spec", "json", "dot-matrix", "tap", "xunit"],
    coverageFormats = ["plain", "html", "json", "xml"];

module.exports = function () {
    var options,
        files;

    function setOptions(opts) {
        options = opts;
    }

    function setFiles(f) {
        files = f;
    }

    function buildCommand() {
        return [
            "node",
            getExecutable(),
            getFiles(),
            getReporter(),
            getTestsToRun(),
            getFlag("verbose"),
            getFlag("silent"),
            getFlag("isolate"),
            getColorFlag(),
            getCoverageFormat()
        ].filter(function (entry) {
            return entry !== null;
        }).join(" ");
    }

    function getExecutable() {
        var executable = options.executable;
        if (executable) {
            return executable;
        }
        executable = "node_modules/vows/bin/vows";
        if (fs.existsSync(executable)) {
            return executable;
        }
        return "vows";
    }

    function getFiles() {
        var f = [];
        if (files) {
            files.forEach(function (file) {
                f = f.concat(file.src);
            });
        }
        return f.length === 0 ? null : f.join(" ");
    }

    function getReporter() {
        var reporter = options.reporter,
            index = reporters.indexOf(reporter);

        if (index === -1) {
            return null;
        }
        return "--" + reporter;
    }

    function getTestsToRun() {
        var onlyRun = options.onlyRun;

        if (typeof onlyRun === "string") {
            return "-m \"" + onlyRun.replace(/"/g, "\\\"") + "\"";
        } else if (onlyRun instanceof RegExp) {
            return "-r \"" + onlyRun.source + "\"";
        }
        return null;
    }

    function getFlag(flag) {
        if (options[flag] === true) {
            return "--" + flag;
        }
        return null;
    }

    function getColorFlag() {
        var value = options.colors;
        if (value === false) {
            return "--no-color";
        }
        return "--color";
    }

    function getCoverageFormat() {
        var coverageFormat = options.coverage,
            index = coverageFormats.indexOf(coverageFormat);
        if (index > -1) {
            return "--cover-" + coverageFormat;
        }
        return null;
    }

    return {
        setOptions: setOptions,
        setFiles: setFiles,
        buildCommand: buildCommand,

        // Exported for testing purposes
        getFiles: getFiles,
        getReporter: getReporter,
        getTestsToRun: getTestsToRun,
        getFlag: getFlag,
        getColorFlag: getColorFlag,
        getCoverageFormat: getCoverageFormat
    };

};
