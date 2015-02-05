grunt-vows [![Build Status](https://secure.travis-ci.org/CMTegner/grunt-vows.svg)](http://travis-ci.org/CMTegner/grunt-vows) [![devDependency Status](https://david-dm.org/CMTegner/grunt-vows/dev-status.svg)](https://david-dm.org/CMTegner/grunt-vows#info=devDependencies) [![NPM version](https://badge.fury.io/js/grunt-vows.svg)](https://npmjs.org/package/grunt-vows)
==========
A grunt task for running your vows test specs.

Installation
------------

```sh
npm install grunt-vows
```

Usage
-----
Either run it via grunt by first adding this line to your project's `grunt.js` gruntfile:

```js
grunt.loadNpmTasks("grunt-vows");
```

then by running the `vows` task directly (or via an alias):

```sh
grunt vows
```

or you can run it as a stand-alone command:

```sh
grunt-vows
```

(requires global installation, i.e. `npm install -g grunt-vows`)

Configuration
-------------
*Note: As of version 0.2.0 grunt-vows is a multi-task!*

Configuration is handled via the default grunt multi-task config schema:

```js
grunt.initConfig({
    vows: {
        all: {
            options: {
                // String {spec|json|dot-matrix|xunit|tap}
                // defaults to "dot-matrix"
                reporter: "spec",
                // String or RegExp which is
                // matched against title to
                // restrict which tests to run
                onlyRun: /helper/,
                // Boolean, defaults to false
                verbose: false,
                // Boolean, defaults to false
                silent: false,
                // Colorize reporter output,
                // boolean, defaults to true
                colors: true,
                // Run each test in its own
                // vows process, defaults to
                // false
                isolate: false,
                // String {plain|html|json|xml}
                // defaults to none
                coverage: "json"
            },
            // String or array of strings
            // determining which files to include.
            // This option is grunt's "full" file format.
            src: ["test/*.js", "spec/*"]
        }
    }
});
```


Release History
---------------
* 2015-01-28   v0.4.2   Fix npm package entry point (`main`); fix `grunt-vows` executable
* 2014-04-11   v0.4.1   Made task work on Windows
* 2013-02-18   v0.4.0   Grunt 0.4.0 compatible. Implemented support for `this.options()` and `this.files`.
* 2012-12-28   v0.3.1   Fixing a regression in support for older versions of Node.
* 2012-12-28   v0.3.0   Added support for coverage options.
* 2012-10-29   v0.2.1   Updated to be Grunt 0.4 compatible. Added support for "isolate" option.
* 2012-10-01   v0.2.0   Made "grunt-vows" a multi-task.
* 2012-09-29   v0.1.3   Added support for two undocumented reporters. Fixed a bug which could prevent the task from correctly reporting test failures.
* 2012-09-22   v0.1.2   Added "reporter", "onlyRun", "verbose", "silent", and "no-color" configuration options.
* 2012-09-20   v0.1.1   Added "files" configuration option for specifying which files to look for specs in.
* 2012-09-16   v0.1.0   Initial release.

License
-------
Copyright (c) 2012-2013 Christian Maughan Tegnér
Licensed under the MIT license.
